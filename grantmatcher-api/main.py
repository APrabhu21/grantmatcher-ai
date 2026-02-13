from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models import User, Grant, IngestionRun, TrackedGrant, GrantApplication, MatchFeedback
from auth import authenticate_user, create_access_token, get_current_user, get_password_hash
from sqlalchemy import func
from ingestion.vector_search import VectorSearch
from datetime import datetime, timezone
import os

app = FastAPI()

# CORS middleware for production
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Development
        "http://localhost:3001",  # Development alternative
        "https://grantmatcher-ai.vercel.app",  # Vercel production
        "https://grantmatcher-ai-git-main-aprabhu21.vercel.app",  # Vercel preview
        "*",  # Allow all origins for now (remove in production)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class UserCreate(BaseModel):
    email: str
    password: str
    display_name: str

class UserResponse(BaseModel):
    id: str
    email: str
    display_name: str

class ProfileUpdate(BaseModel):
    display_name: str = None
    organization_name: str = None
    organization_type: str = None
    mission_statement: str = None
    focus_areas: list = None
    annual_budget: str = None
    employee_count: str = None
    geographic_focus: dict = None
    eligibility_attributes: dict = None
    funding_preferences: dict = None

class GrantApplicationCreate(BaseModel):
    status: str = "interested"
    applied_date: str = None
    submitted_date: str = None
    decision_date: str = None
    amount_requested: int = None
    amount_awarded: int = None
    notes: str = None
    internal_reference: str = None

class GrantApplicationUpdate(BaseModel):
    status: str = None
    applied_date: str = None
    submitted_date: str = None
    decision_date: str = None
    amount_requested: int = None
    amount_awarded: int = None
    notes: str = None
    internal_reference: str = None

@app.post("/api/auth/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed_password = get_password_hash(user.password)
    db_user = User(email=user.email, password_hash=hashed_password, display_name=user.display_name, organization_type="nonprofit_501c3", mission_statement="", focus_areas=[])
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return UserResponse(id=db_user.id, email=db_user.email, display_name=db_user.display_name)

@app.post("/api/auth/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/profile")
def get_profile(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "display_name": current_user.display_name,
        "organization_name": current_user.organization_name,
        "organization_type": current_user.organization_type,
        "mission_statement": current_user.mission_statement,
        "focus_areas": current_user.focus_areas,
        "annual_budget": current_user.annual_budget,
        "employee_count": current_user.employee_count,
        "geographic_focus": current_user.geographic_focus,
        "eligibility_attributes": current_user.eligibility_attributes,
        "funding_preferences": current_user.funding_preferences,
    }

@app.put("/api/profile")
def update_profile(profile_data: ProfileUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Update user profile and regenerate embeddings if mission/focus areas changed"""
    # Update user fields
    for field, value in profile_data.dict(exclude_unset=True).items():
        if hasattr(current_user, field):
            setattr(current_user, field, value)

    # If mission statement or focus areas changed, we should regenerate user embedding
    # For now, we'll just mark that embeddings need updating
    current_user.embedding_updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(current_user)

    return {
        "message": "Profile updated successfully",
        "profile": {
            "id": current_user.id,
            "email": current_user.email,
            "display_name": current_user.display_name,
            "organization_name": current_user.organization_name,
            "organization_type": current_user.organization_type,
            "mission_statement": current_user.mission_statement,
            "focus_areas": current_user.focus_areas,
            "annual_budget": current_user.annual_budget,
            "employee_count": current_user.employee_count,
            "geographic_focus": current_user.geographic_focus,
            "eligibility_attributes": current_user.eligibility_attributes,
            "funding_preferences": current_user.funding_preferences,
        }
    }

@app.get("/api/admin/stats")
def get_admin_stats(db: Session = Depends(get_db)):
    """Get system statistics for admin dashboard"""
    # User stats
    total_users = db.query(func.count(User.id)).scalar()
    active_users = db.query(func.count(User.id)).filter(User.last_login.isnot(None)).scalar()

    # Grant stats
    total_grants = db.query(func.count(Grant.id)).scalar()
    active_grants = db.query(func.count(Grant.id)).filter(Grant.status == 'active').scalar()
    grants_with_embeddings = db.query(func.count(Grant.id)).filter(
        Grant.embedding_data.isnot(None)
    ).scalar()

    # Ingestion stats
    latest_ingestion = db.query(IngestionRun).order_by(IngestionRun.started_at.desc()).first()
    total_ingestions = db.query(func.count(IngestionRun.id)).scalar()
    successful_ingestions = db.query(func.count(IngestionRun.id)).filter(
        IngestionRun.status == 'completed'
    ).scalar()

    return {
        "users": {
            "total": total_users,
            "active": active_users
        },
        "grants": {
            "total": total_grants,
            "active": active_grants,
            "with_embeddings": grants_with_embeddings
        },
        "ingestion": {
            "total_runs": total_ingestions,
            "successful_runs": successful_ingestions,
            "latest_run": {
                "source": latest_ingestion.source if latest_ingestion else None,
                "status": latest_ingestion.status if latest_ingestion else None,
                "completed_at": latest_ingestion.completed_at.isoformat() if latest_ingestion and latest_ingestion.completed_at else None,
                "grants_fetched": latest_ingestion.grants_fetched if latest_ingestion else 0
            } if latest_ingestion else None
        }
    }

@app.get("/api/matches")
def get_matches(
    q: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get grant matches for the current user, optionally with ad-hoc search"""
    if q:
        # Ad-hoc search with provided query
        query = q
    else:
        # Create search query from user profile
        query_parts = []

        if current_user.mission_statement:
            query_parts.append(current_user.mission_statement)

        if current_user.focus_areas:
            query_parts.extend(current_user.focus_areas)

        if current_user.organization_name:
            query_parts.append(current_user.organization_name)

        if not query_parts:
            return {"matches": [], "message": "Please complete your profile to get matches"}

        query = " ".join(query_parts)

    # Perform vector search
    search = VectorSearch()
    results = search.search_by_text(db, query, top_k=10)

    # Format results
    matches = []
    for grant, score in results:
        matches.append({
            "id": grant.id,
            "title": grant.title,
            "description": grant.description[:200] + "..." if len(grant.description or "") > 200 else grant.description,
            "agency": grant.agency,
            "amount_floor": grant.amount_floor,
            "amount_ceiling": grant.amount_ceiling,
            "close_date": grant.close_date.isoformat() if grant.close_date else None,
            "score": round(score, 3),
            "explanation": f"Matches your {'search' if q else 'mission'} with {round(score * 100, 1)}% relevance"
        })

    return {"matches": matches}

@app.get("/api/grants/{grant_id}")
def get_grant_detail(grant_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get detailed information for a specific grant"""
    grant = db.query(Grant).filter(Grant.id == grant_id).first()
    if not grant:
        raise HTTPException(status_code=404, detail="Grant not found")

    return {
        "id": grant.id,
        "source": grant.source,
        "source_id": grant.source_id,
        "source_url": grant.source_url,
        "title": grant.title,
        "description": grant.description,
        "summary": grant.summary,
        "agency": grant.agency,
        "agency_code": grant.agency_code,
        "program_name": grant.program_name,
        "amount_floor": grant.amount_floor,
        "amount_ceiling": grant.amount_ceiling,
        "open_date": grant.open_date.isoformat() if grant.open_date else None,
        "close_date": grant.close_date.isoformat() if grant.close_date else None,
        "is_rolling": grant.is_rolling,
        "eligible_applicant_types": grant.eligible_applicant_types,
        "eligible_categories": grant.eligible_categories,
        "cfda_numbers": grant.cfda_numbers,
        "focus_areas": grant.focus_areas,
        "geographic_scope": grant.geographic_scope,
        "status": grant.status,
        "created_at": grant.created_at.isoformat() if grant.created_at else None,
        "updated_at": grant.updated_at.isoformat() if grant.updated_at else None,
    }

@app.post("/api/grants/{grant_id}/save")
def save_grant(grant_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Save a grant to the user's tracked grants"""
    # Check if grant exists
    grant = db.query(Grant).filter(Grant.id == grant_id).first()
    if not grant:
        raise HTTPException(status_code=404, detail="Grant not found")

    # Check if already saved
    existing = db.query(TrackedGrant).filter(
        TrackedGrant.user_id == current_user.id,
        TrackedGrant.grant_id == grant_id
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Grant already saved")

    # Save the grant
    tracked_grant = TrackedGrant(
        user_id=current_user.id,
        grant_id=grant_id
    )
    db.add(tracked_grant)
    db.commit()
    db.refresh(tracked_grant)

    return {"message": "Grant saved successfully", "tracked_grant_id": tracked_grant.id}

@app.delete("/api/grants/{grant_id}/save")
def unsave_grant(grant_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Remove a grant from the user's tracked grants"""
    tracked_grant = db.query(TrackedGrant).filter(
        TrackedGrant.user_id == current_user.id,
        TrackedGrant.grant_id == grant_id
    ).first()

    if not tracked_grant:
        raise HTTPException(status_code=404, detail="Grant not saved")

    db.delete(tracked_grant)
    db.commit()

    return {"message": "Grant removed from saved grants"}

@app.get("/api/saved-grants")
def get_saved_grants(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get all grants saved by the current user"""
    saved_grants = db.query(TrackedGrant, Grant).join(
        Grant, TrackedGrant.grant_id == Grant.id
    ).filter(
        TrackedGrant.user_id == current_user.id
    ).order_by(TrackedGrant.created_at.desc()).all()

    result = []
    for tracked, grant in saved_grants:
        result.append({
            "tracked_id": tracked.id,
            "grant": {
                "id": grant.id,
                "title": grant.title,
                "description": grant.description[:200] + "..." if len(grant.description or "") > 200 else grant.description,
                "agency": grant.agency,
                "amount_floor": grant.amount_floor,
                "amount_ceiling": grant.amount_ceiling,
                "close_date": grant.close_date.isoformat() if grant.close_date else None,
                "status": grant.status,
            },
            "saved_at": tracked.created_at.isoformat() if tracked.created_at else None,
            "notes": tracked.notes,
            "remind_days_before": tracked.remind_days_before,
        })

    return {"saved_grants": result}

@app.post("/api/grants/{grant_id}/application")
def create_application(grant_id: str, application_data: GrantApplicationCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Create or update a grant application for the current user"""
    # Check if grant exists
    grant = db.query(Grant).filter(Grant.id == grant_id).first()
    if not grant:
        raise HTTPException(status_code=404, detail="Grant not found")

    # Check if application already exists
    existing_app = db.query(GrantApplication).filter(
        GrantApplication.user_id == current_user.id,
        GrantApplication.grant_id == grant_id
    ).first()

    if existing_app:
        raise HTTPException(status_code=400, detail="Application already exists for this grant")

    # Create new application
    application = GrantApplication(
        user_id=current_user.id,
        grant_id=grant_id,
        status=application_data.status,
        applied_date=datetime.fromisoformat(application_data.applied_date) if application_data.applied_date else None,
        submitted_date=datetime.fromisoformat(application_data.submitted_date) if application_data.submitted_date else None,
        decision_date=datetime.fromisoformat(application_data.decision_date) if application_data.decision_date else None,
        amount_requested=application_data.amount_requested,
        amount_awarded=application_data.amount_awarded,
        notes=application_data.notes,
        internal_reference=application_data.internal_reference,
    )
    db.add(application)
    db.commit()
    db.refresh(application)

    return {
        "message": "Application created successfully",
        "application": {
            "id": application.id,
            "status": application.status,
            "applied_date": application.applied_date.isoformat() if application.applied_date else None,
            "submitted_date": application.submitted_date.isoformat() if application.submitted_date else None,
            "decision_date": application.decision_date.isoformat() if application.decision_date else None,
            "amount_requested": application.amount_requested,
            "amount_awarded": application.amount_awarded,
            "notes": application.notes,
            "internal_reference": application.internal_reference,
            "created_at": application.created_at.isoformat() if application.created_at else None,
        }
    }

@app.put("/api/grants/{grant_id}/application")
def update_application(grant_id: str, application_data: GrantApplicationUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Update an existing grant application"""
    application = db.query(GrantApplication).filter(
        GrantApplication.user_id == current_user.id,
        GrantApplication.grant_id == grant_id
    ).first()

    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    # Update fields
    for field, value in application_data.dict(exclude_unset=True).items():
        if hasattr(application, field):
            if field in ['applied_date', 'submitted_date', 'decision_date'] and value:
                setattr(application, field, datetime.fromisoformat(value))
            else:
                setattr(application, field, value)

    db.commit()
    db.refresh(application)

    return {
        "message": "Application updated successfully",
        "application": {
            "id": application.id,
            "status": application.status,
            "applied_date": application.applied_date.isoformat() if application.applied_date else None,
            "submitted_date": application.submitted_date.isoformat() if application.submitted_date else None,
            "decision_date": application.decision_date.isoformat() if application.decision_date else None,
            "amount_requested": application.amount_requested,
            "amount_awarded": application.amount_awarded,
            "notes": application.notes,
            "internal_reference": application.internal_reference,
            "created_at": application.created_at.isoformat() if application.created_at else None,
            "updated_at": application.updated_at.isoformat() if application.updated_at else None,
        }
    }

@app.get("/api/grants/{grant_id}/application")
def get_application(grant_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get application status for a specific grant"""
    application = db.query(GrantApplication).filter(
        GrantApplication.user_id == current_user.id,
        GrantApplication.grant_id == grant_id
    ).first()

    if not application:
        return {"application": None}

    return {
        "application": {
            "id": application.id,
            "status": application.status,
            "applied_date": application.applied_date.isoformat() if application.applied_date else None,
            "submitted_date": application.submitted_date.isoformat() if application.submitted_date else None,
            "decision_date": application.decision_date.isoformat() if application.decision_date else None,
            "amount_requested": application.amount_requested,
            "amount_awarded": application.amount_awarded,
            "notes": application.notes,
            "internal_reference": application.internal_reference,
            "created_at": application.created_at.isoformat() if application.created_at else None,
            "updated_at": application.updated_at.isoformat() if application.updated_at else None,
        }
    }

@app.get("/api/applications")
def get_applications(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get all grant applications for the current user"""
    applications = db.query(GrantApplication, Grant).join(
        Grant, GrantApplication.grant_id == Grant.id
    ).filter(
        GrantApplication.user_id == current_user.id
    ).order_by(GrantApplication.updated_at.desc()).all()

    result = []
    for application, grant in applications:
        result.append({
            "application": {
                "id": application.id,
                "status": application.status,
                "applied_date": application.applied_date.isoformat() if application.applied_date else None,
                "submitted_date": application.submitted_date.isoformat() if application.submitted_date else None,
                "decision_date": application.decision_date.isoformat() if application.decision_date else None,
                "amount_requested": application.amount_requested,
                "amount_awarded": application.amount_awarded,
                "notes": application.notes,
                "internal_reference": application.internal_reference,
                "created_at": application.created_at.isoformat() if application.created_at else None,
                "updated_at": application.updated_at.isoformat() if application.updated_at else None,
            },
            "grant": {
                "id": grant.id,
                "title": grant.title,
                "agency": grant.agency,
                "amount_floor": grant.amount_floor,
                "amount_ceiling": grant.amount_ceiling,
                "close_date": grant.close_date.isoformat() if grant.close_date else None,
                "status": grant.status,
            }
        })

    return {"applications": result}

class FeedbackCreate(BaseModel):
    grant_id: str
    feedback_type: str  # 'dismissed' | 'saved' | 'applied'

@app.post("/api/matches/feedback")
def submit_feedback(
    feedback: FeedbackCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit feedback on a grant match"""
    if feedback.feedback_type not in ['dismissed', 'saved', 'applied']:
        raise HTTPException(status_code=400, detail="Invalid feedback type")

    # Check if grant exists
    grant = db.query(Grant).filter(Grant.id == feedback.grant_id).first()
    if not grant:
        raise HTTPException(status_code=404, detail="Grant not found")

    # Check if feedback already exists
    existing_feedback = db.query(MatchFeedback).filter(
        MatchFeedback.user_id == current_user.id,
        MatchFeedback.grant_id == feedback.grant_id,
        MatchFeedback.feedback_type == feedback.feedback_type
    ).first()

    if existing_feedback:
        raise HTTPException(status_code=400, detail="Feedback already submitted")

    # Create feedback record
    feedback_record = MatchFeedback(
        user_id=current_user.id,
        grant_id=feedback.grant_id,
        feedback_type=feedback.feedback_type
    )

    db.add(feedback_record)
    db.commit()

    return {"message": "Feedback submitted successfully"}