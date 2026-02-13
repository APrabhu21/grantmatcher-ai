import requests
import json
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from database import get_db
from models import Grant, IngestionRun
import uuid

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class GrantsGovIngester:
    """Ingester for Grants.gov API"""

    BASE_URL = "https://www.grants.gov/grantsws/rest/opportunities"

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'GrantMatcherAI/1.0',
            'Accept': 'application/json'
        })

    def search_opportunities(self, start_record: int = 0, rows: int = 100) -> Dict[str, Any]:
        """Search for posted opportunities"""
        url = f"{self.BASE_URL}/search/"
        payload = {
            "keyword": "",
            "oppStatus": "posted",
            "sortBy": "openDate|desc",
            "rows": rows,
            "startRecordNum": start_record
        }

        logger.info(f"Searching opportunities: start={start_record}, rows={rows}")
        response = self.session.post(url, json=payload)

        if response.status_code != 200:
            raise Exception(f"Grants.gov API error: {response.status_code} - {response.text}")

        return response.json()

    def get_opportunity_details(self, opportunity_id: str) -> Dict[str, Any]:
        """Get detailed information for a specific opportunity"""
        url = f"{self.BASE_URL}/details"
        params = {"oppId": opportunity_id}

        logger.info(f"Fetching details for opportunity: {opportunity_id}")
        response = self.session.get(url, params=params)

        if response.status_code != 200:
            raise Exception(f"Grants.gov API error: {response.status_code} - {response.text}")

        return response.json()

    def normalize_grant_data(self, opp_data: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize Grants.gov data to our unified grant schema"""
        try:
            # Extract basic information
            grant_id = opp_data.get('opportunityId', '')
            title = opp_data.get('opportunityTitle', '').strip()
            description = opp_data.get('description', '').strip()

            # Extract dates
            open_date_str = opp_data.get('openDate')
            close_date_str = opp_data.get('closeDate')

            open_date = None
            close_date = None
            is_rolling = False

            if open_date_str:
                try:
                    open_date = datetime.fromisoformat(open_date_str.replace('Z', '+00:00'))
                except:
                    logger.warning(f"Could not parse open_date: {open_date_str}")

            if close_date_str:
                if close_date_str.lower() in ['none', 'rolling', 'multiple']:
                    is_rolling = True
                else:
                    try:
                        close_date = datetime.fromisoformat(close_date_str.replace('Z', '+00:00'))
                    except:
                        logger.warning(f"Could not parse close_date: {close_date_str}")

            # Extract amounts
            award_ceiling = opp_data.get('awardCeiling')
            award_floor = opp_data.get('awardFloor')

            amount_floor = None
            amount_ceiling = None

            if award_floor and award_floor != '0':
                try:
                    amount_floor = int(float(award_floor))
                except:
                    pass

            if award_ceiling and award_ceiling != '0':
                try:
                    amount_ceiling = int(float(award_ceiling))
                except:
                    pass

            # Extract agency information
            agency = opp_data.get('agencyName', '')
            agency_code = opp_data.get('agencyCode', '')

            # Extract eligibility information
            eligible_applicant_types = []
            if opp_data.get('applicantTypes'):
                eligible_applicant_types = opp_data['applicantTypes']

            # Extract CFDA numbers
            cfda_numbers = []
            if opp_data.get('cfdaList'):
                cfda_numbers = [cfda.get('cfdaNumber', '') for cfda in opp_data['cfdaList'] if cfda.get('cfdaNumber')]

            # Extract categories
            eligible_categories = []
            if opp_data.get('categoryOfFundingActivity'):
                eligible_categories = opp_data['categoryOfFundingActivity']

            # Create source URL
            source_url = f"https://www.grants.gov/search-results-detail/{grant_id}"

            return {
                'source': 'grants.gov',
                'source_id': grant_id,
                'source_url': source_url,
                'title': title,
                'description': description,
                'summary': title[:500] + '...' if len(title) > 500 else title,
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
                'focus_areas': [],  # Will be populated by NLP later
                'geographic_scope': 'national',  # Default for federal grants
                'status': 'active',
                'raw_data': opp_data
            }

        except Exception as e:
            logger.error(f"Error normalizing grant data: {e}")
            raise

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

                opportunities = search_result.get('opportunities', [])
                if not opportunities:
                    has_more = False
                    break

                logger.info(f"Processing {len(opportunities)} opportunities (starting at {start_record})")

                for opp in opportunities:
                    try:
                        stats['fetched'] += 1
                        opp_id = opp.get('opportunityId')

                        if not opp_id:
                            continue

                        # Check if grant already exists
                        existing_grant = db.query(Grant).filter(
                            Grant.source == 'grants.gov',
                            Grant.source_id == opp_id
                        ).first()

                        # Get detailed information
                        details = self.get_opportunity_details(opp_id)
                        normalized_data = self.normalize_grant_data(details)

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

                # Safety limit for development
                if start_record >= 500:  # Limit to first 500 for testing
                    logger.info("Reached development limit of 500 records")
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