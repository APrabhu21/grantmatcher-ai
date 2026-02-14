import requests
import json
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from database import get_db
from models import Grant, IngestionRun
import uuid

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class GrantsGovIngester:
    """Ingester for Grants.gov API"""

    # Updated to use the new API endpoint (launched April 2025)
    BASE_URL = "https://api.grants.gov/v1/api"

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'GrantMatcherAI/1.0',
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        })

    def search_opportunities(self, start_record: int = 0, rows: int = 100) -> Dict[str, Any]:
        """Search for posted opportunities using the new v1 API"""
        url = f"{self.BASE_URL}/search2"
        payload = {
            "keyword": "",
            "rows": rows,
            "offset": start_record
        }

        logger.info(f"Searching opportunities: start={start_record}, rows={rows}")
        response = self.session.post(url, json=payload)

        if response.status_code != 200:
            raise Exception(f"Grants.gov API error: {response.status_code} - {response.text}")

        return response.json()

    def get_opportunity_details(self, opportunity_id: str) -> Dict[str, Any]:
        """Get detailed information for a specific opportunity using the new v1 API"""
        url = f"{self.BASE_URL}/fetchOpportunity"
        params = {"oppNum": opportunity_id}

        logger.info(f"Fetching details for opportunity: {opportunity_id}")
        response = self.session.get(url, params=params)

        if response.status_code != 200:
            raise Exception(f"Grants.gov API error: {response.status_code} - {response.text}")

        return response.json()

    def _parse_date(self, date_str: str) -> Optional[datetime]:
        """Helper to parse dates in various formats returned by Grants.gov"""
        if not date_str or not isinstance(date_str, str):
            return None
        
        # Try ISO format first (standard for new API)
        try:
            return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        except:
            pass
            
        # Try MM/DD/YYYY (common in some Grants.gov responses)
        try:
            return datetime.strptime(date_str, '%m/%d/%Y')
        except:
            pass
            
        # Try YYYY-MM-DD
        try:
            return datetime.strptime(date_str, '%Y-%m-%d')
        except:
            pass
            
        return None

    def _parse_amount(self, amount_str: Any) -> Optional[int]:
        """Helper to parse currency/amount strings into integers"""
        if not amount_str or amount_str == '0':
            return None
        
        try:
            if isinstance(amount_str, (int, float)):
                return int(amount_str)
            
            # Clean string: remove $, commas, spaces
            clean_str = amount_str.replace('$', '').replace(',', '').strip()
            if not clean_str:
                return None
                
            return int(float(clean_str))
        except (ValueError, TypeError):
            return None

    def normalize_grant_data(self, opp_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Normalize Grants.gov data to our unified grant schema (works with both old and new API)"""
        try:
            # Extract basic information - handle both old and new API formats
            grant_id = opp_data.get('number') or opp_data.get('opportunityId', '')
            title = opp_data.get('title') or opp_data.get('opportunityTitle', '')
            title = title.strip() if title else ''
            description = opp_data.get('description', '').strip()

            # Fix Summary: Use description if available, otherwise title
            summary_content = description if description else title
            summary = summary_content[:500] + '...' if len(summary_content) > 500 else summary_content

            # Extract dates
            open_date_str = opp_data.get('openDate')
            close_date_str = opp_data.get('closeDate')

            open_date = None
            close_date = None
            is_rolling = False

            if open_date_str:
                open_date = self._parse_date(open_date_str)
                if not open_date:
                    logger.warning(f"Could not parse open_date: {open_date_str}")

            if close_date_str:
                if close_date_str.lower() in ['none', 'rolling', 'multiple']:
                    is_rolling = True
                else:
                    close_date = self._parse_date(close_date_str)
                    if not close_date:
                        logger.warning(f"Could not parse close_date: {close_date_str}")

            # Extract amounts using new parser
            amount_floor = self._parse_amount(opp_data.get('awardFloor'))
            amount_ceiling = self._parse_amount(opp_data.get('awardCeiling'))

            # Extract agency information - handle both formats
            agency = opp_data.get('agency') or opp_data.get('agencyName', '')
            agency_code = opp_data.get('agencyCode', '')

            # Extract CFDA numbers - handle both string and list formats
            cfda_numbers = []
            cfda_list = opp_data.get('cfdaList')
            if cfda_list:
                if isinstance(cfda_list, list):
                    cfda_numbers = [cfda.get('cfdaNumber', '') for cfda in cfda_list if isinstance(cfda, dict) and cfda.get('cfdaNumber')]
                elif isinstance(cfda_list, str):
                    cfda_numbers = [cfda_list.strip()] if cfda_list.strip() else []

            # Fallback for missing description: Synthesize from title and metadata
            if not description or len(description) < 10:
                description = f"Funding opportunity from {agency} ({agency_code}). Title: {title}. "
                if cfda_list:
                    description += f"Associated with CFDA: {', '.join(cfda_numbers)}. "
                description += "Please visit the source URL for full eligibility and application requirements."

            summary = description[:500] + "..." if len(description) > 500 else description

            # Extract Focus Areas from title (Keyword based)
            focus_keywords = {
                'health': ['medical', 'disease', 'hospital', 'clinical', 'health'],
                'education': ['school', 'teacher', 'learning', 'curriculum', 'stem'],
                'environment': ['water', 'climate', 'energy', 'conservation', 'pollution'],
                'social': ['justice', 'community', 'homeless', 'veterans', 'youth'],
                'research': ['laboratory', 'science', 'theoretical', 'university', 'study'],
                'technology': ['software', 'digital', 'broadband', 'innovation', 'engineering']
            }
            
            extracted_focus = []
            title_lower = title.lower()
            for focus, keywords in focus_keywords.items():
                if any(kw in title_lower for kw in keywords):
                    extracted_focus.append(focus)

            # Extract applicant types - handle thin data formats
            eligible_applicant_types = []
            applicant_types = opp_data.get('applicantTypes')
            if not applicant_types:
                # Fallback: Guess based on title/agency if possible, but keep empty if unsure
                pass
            elif isinstance(applicant_types, list):
                eligible_applicant_types = applicant_types
            elif isinstance(applicant_types, str):
                eligible_applicant_types = [t.strip() for t in applicant_types.split(',') if t.strip()]

            # Extract categories - handle both string and list formats
            eligible_categories = []
            categories = opp_data.get('categoryOfFundingActivity')
            if categories:
                if isinstance(categories, list):
                    eligible_categories = categories
                elif isinstance(categories, str):
                    eligible_categories = [c.strip() for c in categories.split(',') if c.strip()]

            # Create source URL
            source_url = f"https://www.grants.gov/search-results-detail/{grant_id}"

            return {
                'source': 'grants.gov',
                'source_id': grant_id,
                'source_url': source_url,
                'title': title,
                'description': description,
                'summary': summary,
                'agency': agency,
                'agency_code': agency_code,
                'amount_floor': amount_floor,
                'amount_ceiling': amount_ceiling,
                'open_date': open_date,
                'close_date': close_date,
                'is_rolling': is_rolling,
                'eligible_applicant_types': eligible_applicant_types,
                'eligible_categories': eligible_categories,
                'cfda_numbers': cfda_numbers,
                'focus_areas': extracted_focus,
                'geographic_scope': 'national',  # Default for federal grants
                'status': 'active',
                'raw_data': opp_data
            }

        except Exception as e:
            logger.error(f"Error normalizing grant data for {opp_data.get('number') or opp_data.get('opportunityId', 'unknown')}: {e}")
            # Return None instead of raising to allow processing to continue
            return None

    def ingest_grants(self, db: Session) -> Dict[str, int]:
        """Main ingestion method"""
        logger.info("Starting Grants.gov ingestion")

        # Create ingestion run record
        run_id = str(uuid.uuid4())
        ingestion_run = IngestionRun(
            id=run_id,
            source='grants.gov',
            status='running'
        )
        db.add(ingestion_run)
        db.commit()

        stats = {
            'fetched': 0,
            'new': 0,
            'updated': 0,
            'closed': 0,
            'errors': 0
        }

        try:
            start_record = 0
            rows_per_page = 100
            has_more = True

            while has_more:
                # Search for opportunities
                search_result = self.search_opportunities(start_record, rows_per_page)

                # New API returns data in 'data' -> 'oppHits' format
                opportunities = search_result.get('data', {}).get('oppHits', [])
                if not opportunities:
                    has_more = False
                    break

                logger.info(f"Processing {len(opportunities)} opportunities (starting at {start_record})")

                for opp in opportunities:
                    try:
                        stats['fetched'] += 1
                        # DEBUG: Print raw data for the first item
                        if stats['fetched'] == 1:
                            logger.info(f"Raw opportunity data: {json.dumps(opp, indent=2)}")
                        
                        # New API uses 'number' instead of 'opportunityId'
                        opp_id = opp.get('number') or opp.get('opportunityId')

                        if not opp_id:
                            continue

                        # Check if grant already exists
                        existing_grant = db.query(Grant).filter(
                            Grant.source == 'grants.gov',
                            Grant.source_id == opp_id
                        ).first()

                        # Use search result data directly (no detail fetch needed)
                        normalized_data = self.normalize_grant_data(opp)
                        
                        # Skip if normalization failed
                        if not normalized_data:
                            stats['errors'] += 1
                            continue

                        if existing_grant:
                            # Update existing grant
                            for key, value in normalized_data.items():
                                if key != 'id' and hasattr(existing_grant, key):
                                    setattr(existing_grant, key, value)
                            existing_grant.updated_at = datetime.now(timezone.utc)
                            stats['updated'] += 1
                        else:
                            # Create new grant
                            new_grant = Grant(**normalized_data)
                            db.add(new_grant)
                            stats['new'] += 1

                        # Commit every 50 grants to avoid memory issues
                        if stats['fetched'] % 50 == 0:
                            db.commit()
                            logger.info(f"Committed {stats['fetched']} grants so far")

                    except Exception as e:
                        logger.error(f"Error processing opportunity {opp.get('opportunityId')}: {e}")
                        stats['errors'] += 1
                        continue

                start_record += rows_per_page

                # Increased limit to get more grants
                if start_record >= 1000:  # Fetch up to 1000 grants
                    logger.info("Reached limit of 1000 records")
                    break

            # Final commit
            db.commit()

            # Update ingestion run
            ingestion_run.completed_at = datetime.now(timezone.utc)
            ingestion_run.grants_fetched = stats['fetched']
            ingestion_run.grants_new = stats['new']
            ingestion_run.grants_updated = stats['updated']
            ingestion_run.grants_closed = stats['closed']
            ingestion_run.status = 'completed'
            db.commit()

            logger.info(f"Ingestion completed: {stats}")

        except Exception as e:
            logger.error(f"Ingestion failed: {e}")
            ingestion_run.status = 'failed'
            ingestion_run.error_message = str(e)
            db.commit()
            raise

        return stats

def run_ingestion():
    """Standalone function to run the ingestion"""
    db = next(get_db())
    try:
        ingester = GrantsGovIngester()
        stats = ingester.ingest_grants(db)
        print(f"Ingestion completed successfully: {stats}")
    finally:
        db.close()

if __name__ == "__main__":
    run_ingestion()