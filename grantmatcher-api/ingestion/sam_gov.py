import requests
import json
import logging
import os
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from database import get_db
from models import Grant, IngestionRun
import uuid

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SAMGovIngester:
    """Ingester for SAM.gov Data APIs (Opportunities and Assistance Listings)"""

    # SAM.gov Public API URLs
    OPPORTUNITIES_URL = "https://api.sam.gov/opportunities/v2/search"
    ASSISTANCE_LISTINGS_URL = "https://api.sam.gov/federalassistance/v1/listings"

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv('SAM_GOV_API_KEY', 'DEMO_KEY')
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'GrantMatcherAI/1.0',
            'Accept': 'application/json'
        })

    def fetch_opportunities(self, limit: int = 100, offset: int = 0) -> Dict[str, Any]:
        """Fetch latest shared opportunities from SAM.gov"""
        params = {
            "api_key": self.api_key,
            "limit": limit,
            "offset": offset,
            "postedFrom": (datetime.now() - timedelta(days=180)).strftime("%m/%d/%Y"),
            "postedTo": datetime.now().strftime("%m/%d/%Y"),
            "active": "true"
        }
        
        logger.info(f"Fetching SAM.gov opportunities: offset={offset}, limit={limit}")
        response = self.session.get(self.OPPORTUNITIES_URL, params=params)
        
        if response.status_code != 200:
            logger.error(f"SAM.gov API error: {response.status_code} - {response.text}")
            return {"opportunitiesData": []}
            
        return response.json()

    def _parse_date(self, date_str: str) -> Optional[datetime]:
        """Helper to parse dates from SAM.gov"""
        if not date_str or not isinstance(date_str, str):
            return None
        try:
            # SAM usually uses YYYY-MM-DD
            return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        except:
            return None

    def normalize_sam_opportunity(self, notice: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Map SAM.gov Opportunity notice to Grant schema"""
        try:
            # notice fields: noticeId, title, solNum (Opportunity Number), agency, description, uiLink
            notice_id = notice.get('noticeId', '')
            title = notice.get('title', '').strip()
            opp_num = notice.get('solNum') or notice.get('noticeNum', '')
            agency = notice.get('fullParentPathName') or notice.get('agency', '')
            description = notice.get('description', '')
            
            # Use description for summary
            summary = description[:500] + "..." if len(description) > 500 else description
            
            publish_date = self._parse_date(notice.get('publishDate'))
            archive_date = self._parse_date(notice.get('archiveDate')) # Using archiveDate as proxy for closeDate if needed
            
            source_url = notice.get('uiLink')
            
            # Extract basic focus areas
            focus_keywords = {
                'health': ['medical', 'health', 'disease'],
                'technology': ['research', 'tech', 'software', 'digital'],
                'defense': ['security', 'military', 'national defense'],
                'social': ['community', 'family', 'assistance']
            }
            
            focus_areas = []
            title_lower = title.lower()
            for focus, keywords in focus_keywords.items():
                if any(kw in title_lower for kw in keywords):
                    focus_areas.append(focus)

            return {
                'source': 'sam.gov',
                'source_id': notice_id,
                'opportunity_number': opp_num,
                'source_url': source_url,
                'title': title,
                'description': description,
                'summary': summary,
                'agency': agency,
                'open_date': publish_date,
                'close_date': archive_date,
                'focus_areas': focus_areas,
                'status': 'active',
                'raw_data': notice
            }
        except Exception as e:
            logger.error(f"Error normalizing SAM notice {notice.get('noticeId')}: {e}")
            return None

    def ingest_sam_opportunities(self, db: Session, max_records: int = 500) -> Dict[str, int]:
        """Fetch and deduplicate SAM.gov opportunities"""
        logger.info("Starting SAM.gov ingestion")
        
        run_id = str(uuid.uuid4())
        run = IngestionRun(id=run_id, source='sam.gov', status='running')
        db.add(run)
        db.commit()
        
        stats = {'fetched': 0, 'new': 0, 'updated': 0, 'merged': 0, 'errors': 0}
        
        try:
            offset = 0
            limit = 100
            
            while max_records == 0 or stats['fetched'] < max_records:
                data = self.fetch_opportunities(limit=limit, offset=offset)
                # Check for various potential keys from SAM.gov V2 API
                notices = data.get('opportunitiesData') or data.get('opportunityList') or data.get('opportunities') or data.get('notices') or []
                
                if not notices:
                    logger.warning(f"No opportunities found. Keys present: {list(data.keys())}")
                    break
                    
                for notice in notices:
                    stats['fetched'] += 1
                    norm = self.normalize_sam_opportunity(notice)
                    if not norm:
                        stats['errors'] += 1
                        continue
                        
                    opp_num = norm.get('opportunity_number')
                    
                    # DEDUPLICATION LOGIC: Match & Merge
                    existing_grant = None
                    if opp_num:
                        # Check by opportunity_number across ALL sources
                        existing_grant = db.query(Grant).filter(Grant.opportunity_number == opp_num).first()
                    
                    if not existing_grant:
                        # Fallback: check by source_id
                        existing_grant = db.query(Grant).filter(
                            Grant.source == 'sam.gov', 
                            Grant.source_id == norm['source_id']
                        ).first()

                    try:
                        if existing_grant:
                            # MERGE STRATEGY
                            if existing_grant.source != 'sam.gov':
                                # Enriched from secondary source (SAM.gov)
                                logger.info(f"Merging SAM.gov data into existing grant {opp_num} from {existing_grant.source}")
                                # Keep original source's description/title if they are longer
                                if len(norm['description']) > len(existing_grant.description or ""):
                                    existing_grant.description = norm['description']
                                    existing_grant.summary = norm['summary']
                                
                                # Merge tags/json fields
                                existing_grant.focus_areas = list(set((existing_grant.focus_areas or []) + (norm['focus_areas'] or [])))
                                existing_grant.updated_at = datetime.now(timezone.utc)
                                stats['merged'] += 1
                            else:
                                # Update existing SAM record
                                for k, v in norm.items():
                                    if hasattr(existing_grant, k) and k != 'id':
                                        setattr(existing_grant, k, v)
                                existing_grant.updated_at = datetime.now(timezone.utc)
                                stats['updated'] += 1
                        else:
                            # NEW entry
                            new_grant = Grant(**norm)
                            db.add(new_grant)
                            stats['new'] += 1
                    except Exception as e:
                        db.rollback()
                        logger.error(f"Error processing SAM notice {norm['source_id']}: {e}")
                        stats['errors'] += 1
                        continue
                        
                    if stats['fetched'] % 50 == 0:
                        db.commit()
                        
                offset += limit
                
            db.commit()
            run.status = 'completed'
            run.grants_fetched = stats['fetched']
            run.completed_at = datetime.now(timezone.utc)
            db.commit()
            
        except Exception as e:
            logger.error(f"SAM.gov Ingestion failed: {e}")
            run.status = 'failed'
            run.error_message = str(e)
            db.commit()
            raise
            
        return stats

if __name__ == "__main__":
    db = next(get_db())
    try:
        ingester = SAMGovIngester()
        print(ingester.ingest_sam_opportunities(db, max_records=100))
    finally:
        db.close()
