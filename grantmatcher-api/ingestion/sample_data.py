import json
from datetime import datetime, timezone
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from database import get_db
from models import Grant, IngestionRun
import uuid

# Sample grant data for testing
SAMPLE_GRANTS = [
    {
        "source": "sample",
        "source_id": "SAMPLE-001",
        "source_url": "https://example.com/grant/001",
        "title": "Community Health Outreach Program",
        "description": "Funding for nonprofit organizations to develop community-based health education and outreach programs focused on preventive care, nutrition education, and chronic disease management in underserved communities.",
        "summary": "Community health education and outreach funding",
        "agency": "Department of Health and Human Services",
        "agency_code": "HHS",
        "amount_floor": 50000,
        "amount_ceiling": 250000,
        "open_date": datetime(2024, 1, 15, tzinfo=timezone.utc),
        "close_date": datetime(2024, 3, 15, tzinfo=timezone.utc),
        "is_rolling": False,
        "eligible_applicant_types": ["Nonprofits", "Community-based organizations", "Faith-based organizations"],
        "eligible_categories": ["Health", "Education", "Community Development"],
        "cfda_numbers": ["93.010"],
        "focus_areas": ["health education", "preventive care", "nutrition", "chronic disease"],
        "geographic_scope": "national",
        "status": "active"
    },
    {
        "source": "sample",
        "source_id": "SAMPLE-002",
        "source_url": "https://example.com/grant/002",
        "title": "Environmental Justice Small Grants Program",
        "description": "Small grants to support community-based organizations working on environmental justice issues, including air and water quality monitoring, toxic site cleanup planning, and community education about environmental health risks.",
        "summary": "Environmental justice community grants",
        "agency": "Environmental Protection Agency",
        "agency_code": "EPA",
        "amount_floor": 10000,
        "amount_ceiling": 50000,
        "open_date": datetime(2024, 2, 1, tzinfo=timezone.utc),
        "close_date": datetime(2024, 4, 1, tzinfo=timezone.utc),
        "is_rolling": False,
        "eligible_applicant_types": ["Nonprofits", "Community-based organizations", "Tribal organizations"],
        "eligible_categories": ["Environment", "Justice", "Community Development"],
        "cfda_numbers": ["66.030"],
        "focus_areas": ["environmental justice", "air quality", "water quality", "toxic cleanup", "community education"],
        "geographic_scope": "national",
        "status": "active"
    },
    {
        "source": "sample",
        "source_id": "SAMPLE-003",
        "source_url": "https://example.com/grant/003",
        "title": "Youth STEM Education Initiative",
        "description": "Grants to support STEM education programs for K-12 students, including after-school programs, summer camps, teacher training, and curriculum development focused on science, technology, engineering, and mathematics.",
        "summary": "STEM education programs for youth",
        "agency": "National Science Foundation",
        "agency_code": "NSF",
        "amount_floor": 75000,
        "amount_ceiling": 300000,
        "open_date": datetime(2024, 1, 30, tzinfo=timezone.utc),
        "close_date": datetime(2024, 5, 30, tzinfo=timezone.utc),
        "is_rolling": False,
        "eligible_applicant_types": ["Schools", "Nonprofits", "Universities", "Museums"],
        "eligible_categories": ["Education", "Science", "Technology"],
        "cfda_numbers": ["47.076"],
        "focus_areas": ["STEM education", "science", "technology", "engineering", "mathematics", "K-12 education"],
        "geographic_scope": "national",
        "status": "active"
    },
    {
        "source": "sample",
        "source_id": "SAMPLE-004",
        "source_url": "https://example.com/grant/004",
        "title": "Rural Economic Development Grants",
        "description": "Funding for rural communities to develop economic strategies, create jobs, and improve infrastructure. Supports business incubators, workforce development, broadband expansion, and community facilities.",
        "summary": "Rural economic development funding",
        "agency": "Department of Agriculture",
        "agency_code": "USDA",
        "amount_floor": 100000,
        "amount_ceiling": 500000,
        "open_date": datetime(2024, 3, 1, tzinfo=timezone.utc),
        "close_date": datetime(2024, 6, 1, tzinfo=timezone.utc),
        "is_rolling": False,
        "eligible_applicant_types": ["Local governments", "Nonprofits", "Cooperatives"],
        "eligible_categories": ["Economic Development", "Infrastructure", "Agriculture"],
        "cfda_numbers": ["10.771"],
        "focus_areas": ["rural development", "economic growth", "job creation", "infrastructure", "broadband"],
        "geographic_scope": "rural",
        "status": "active"
    },
    {
        "source": "sample",
        "source_id": "SAMPLE-005",
        "source_url": "https://example.com/grant/005",
        "title": "Arts and Culture Community Grants",
        "description": "Support for community arts organizations to provide arts education, cultural programming, and artistic development opportunities. Includes funding for festivals, exhibitions, artist residencies, and arts education programs.",
        "summary": "Community arts and culture funding",
        "agency": "National Endowment for the Arts",
        "agency_code": "NEA",
        "amount_floor": 25000,
        "amount_ceiling": 150000,
        "open_date": datetime(2024, 2, 15, tzinfo=timezone.utc),
        "close_date": datetime(2024, 4, 15, tzinfo=timezone.utc),
        "is_rolling": False,
        "eligible_applicant_types": ["Arts organizations", "Nonprofits", "Local governments"],
        "eligible_categories": ["Arts", "Culture", "Education"],
        "cfda_numbers": ["45.024"],
        "focus_areas": ["arts education", "cultural programming", "artist development", "community arts"],
        "geographic_scope": "national",
        "status": "active"
    }
]

def load_sample_grants(db: Session) -> Dict[str, int]:
    """Load sample grant data for testing"""
    print("Loading sample grant data...")

    # Create ingestion run record
    run_id = str(uuid.uuid4())
    ingestion_run = IngestionRun(
        id=run_id,
        source='sample',
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
        for grant_data in SAMPLE_GRANTS:
            try:
                stats['fetched'] += 1

                # Check if grant already exists
                existing_grant = db.query(Grant).filter(
                    Grant.source == grant_data['source'],
                    Grant.source_id == grant_data['source_id']
                ).first()

                if existing_grant:
                    # Update existing grant
                    for key, value in grant_data.items():
                        if key != 'id' and hasattr(existing_grant, key):
                            setattr(existing_grant, key, value)
                    existing_grant.updated_at = datetime.now(timezone.utc)
                    stats['updated'] += 1
                    print(f"Updated grant: {grant_data['title'][:50]}...")
                else:
                    # Create new grant
                    new_grant = Grant(**grant_data)
                    db.add(new_grant)
                    stats['new'] += 1
                    print(f"Created grant: {grant_data['title'][:50]}...")

            except Exception as e:
                print(f"Error processing grant {grant_data.get('source_id')}: {e}")
                stats['errors'] += 1
                continue

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

        print(f"Sample data loading completed: {stats}")

    except Exception as e:
        print(f"Sample data loading failed: {e}")
        ingestion_run.status = 'failed'
        ingestion_run.error_message = str(e)
        db.commit()
        raise

    return stats

def run_sample_ingestion():
    """Standalone function to load sample data"""
    db = next(get_db())
    try:
        stats = load_sample_grants(db)
        print(f"Sample ingestion completed successfully: {stats}")
    finally:
        db.close()

if __name__ == "__main__":
    run_sample_ingestion()