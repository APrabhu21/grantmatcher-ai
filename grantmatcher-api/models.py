from sqlalchemy import Column, String, Integer, Text, DateTime, Boolean, JSON, ForeignKey, Float, func
from sqlalchemy.ext.declarative import declarative_base
import uuid

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255))
    display_name = Column(String(200), nullable=False)
    organization_name = Column(String(300))
    organization_ein = Column(String(12))
    organization_type = Column(String(50), nullable=False)
    mission_statement = Column(Text, nullable=False)
    focus_areas = Column(JSON, nullable=False, default=list)
    annual_budget = Column(String(20))
    employee_count = Column(String(20))
    year_founded = Column(Integer)
    geographic_focus = Column(JSON, default=dict)
    eligibility_attributes = Column(JSON, default=dict)
    funding_preferences = Column(JSON, default=dict)
    email_preferences = Column(JSON, default=lambda: {"digest_enabled": True, "digest_day": "monday", "timezone": "America/New_York"})
    subscription_plan = Column(String(20), default="free")
    stripe_customer_id = Column(String(100))
    # embedding = Column(JSON)  # Store as JSON for SQLite
    embedding_updated_at = Column(DateTime)
    created_at = Column(DateTime, default=func.now())
    last_login = Column(DateTime)

class Grant(Base):
    __tablename__ = "grants"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    source = Column(String(20), nullable=False)
    source_id = Column(String(100), nullable=False)
    source_url = Column(Text)
    title = Column(Text, nullable=False)
    description = Column(Text)
    summary = Column(String(1000))
    agency = Column(String(200))
    agency_code = Column(String(20))
    program_name = Column(String(300))
    amount_floor = Column(Integer)
    amount_ceiling = Column(Integer)
    open_date = Column(DateTime)
    close_date = Column(DateTime)
    is_rolling = Column(Boolean, default=False)
    eligible_applicant_types = Column(JSON, default=list)
    eligible_categories = Column(JSON, default=list)
    cfda_numbers = Column(JSON, default=list)
    focus_areas = Column(JSON, default=list)
    geographic_scope = Column(String(50), default="national")
    status = Column(String(20), default="active")
    raw_data = Column(JSON)
    embedding_data = Column(JSON)  # Store embeddings as JSON for SQLite
    embedding_model = Column(String(100))
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now())

class MatchResult(Base):
    __tablename__ = "match_results"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"))
    grant_id = Column(String(36), ForeignKey("grants.id", ondelete="CASCADE"))
    score = Column(Float, nullable=False)
    semantic_similarity = Column(Float, nullable=False)
    eligibility_bonus = Column(Float, default=0)
    explanation = Column(Text)
    is_new = Column(Boolean, default=True)
    computed_at = Column(DateTime, default=func.now())

class MatchFeedback(Base):
    __tablename__ = "match_feedback"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"))
    grant_id = Column(String(36), ForeignKey("grants.id", ondelete="CASCADE"))
    feedback_type = Column(String(20), nullable=False)  # 'dismissed' | 'saved' | 'applied'
    created_at = Column(DateTime, default=func.now())

class TrackedGrant(Base):
    __tablename__ = "tracked_grants"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"))
    grant_id = Column(String(36), ForeignKey("grants.id", ondelete="CASCADE"))
    notes = Column(Text)
    remind_days_before = Column(Integer, default=14)
    reminder_sent = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())

class GrantApplication(Base):
    __tablename__ = "grant_applications"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"))
    grant_id = Column(String(36), ForeignKey("grants.id", ondelete="CASCADE"))
    status = Column(String(20), nullable=False, default="interested")  # interested, applied, submitted, under_review, awarded, rejected, withdrawn
    applied_date = Column(DateTime)
    submitted_date = Column(DateTime)
    decision_date = Column(DateTime)
    amount_requested = Column(Integer)
    amount_awarded = Column(Integer)
    notes = Column(Text)
    internal_reference = Column(String(100))  # User's internal tracking number
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

class IngestionRun(Base):
    __tablename__ = "ingestion_runs"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    source = Column(String(20), nullable=False)
    started_at = Column(DateTime, default=func.now())
    completed_at = Column(DateTime)
    grants_fetched = Column(Integer, default=0)
    grants_new = Column(Integer, default=0)
    grants_updated = Column(Integer, default=0)
    grants_closed = Column(Integer, default=0)
    status = Column(String(20), default="running")
    error_message = Column(Text)