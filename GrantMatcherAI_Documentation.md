# GrantMatcherAI — Complete MVP Documentation Package

> **Generated for:** Solo developer / LLM-driven code generation  
> **Last updated:** February 2026  
> **Stack:** Python (FastAPI) + JavaScript (Next.js) + PostgreSQL + Qdrant

---

# Document 1: PRD_GrantMatcher.md

## Product Vision

GrantMatcherAI is a lightweight SaaS tool that uses semantic search and eligibility filtering to match nonprofits, researchers, and startups with grant opportunities they are actually qualified for — across federal, state, and private foundation sources.

The core insight: existing tools (Grants.gov, Instrumentl, GrantStation) are either keyword-based (miss semantic matches), expensive ($2,000+/year), or require expert knowledge to navigate. GrantMatcherAI combines public grant data with sentence-transformer embeddings and hard-filter eligibility logic to surface high-quality matches automatically.

**One-line pitch:** "Describe your organization in plain English. Get a ranked list of grants you're eligible for, updated weekly."

## Target Users

| User Type | Description | Pain Level | Willingness to Pay |
|-----------|-------------|------------|-------------------|
| **Small nonprofits** (<$5M budget) | 1-2 person dev teams, no grant writer | Very High | $29–49/mo |
| **Early-career researchers** | Postdocs, asst. professors seeking R01/R21/NSF | High | $19–29/mo (or institutional) |
| **University grant offices** | Manage 50-500 PIs, need to route opportunities | High | $199–499/mo |
| **Social-impact startups** | SBIR/STTR seekers, climate/health tech | Medium-High | $29–49/mo |

## User Stories

### Onboarding
- **US-1:** As a nonprofit director, I can create an account and describe my organization's mission, programs, geography, and budget in a guided form so the system understands what I do.
- **US-2:** As a researcher, I can paste my research abstract or NIH biosketch summary so the system understands my work without me filling out 20 fields.
- **US-3:** As a user, I can import my organization info from an EIN lookup (pulling from IRS data) so I don't manually enter basic details.

### Matching
- **US-4:** As a user, I see a dashboard of my top 10 grant matches, ranked by relevance score, with a one-sentence explanation of why each matched.
- **US-5:** As a user, I can filter my matches by deadline, amount range, funding agency, and eligibility type.
- **US-6:** As a user, I can click "Not Relevant" on a match to train my future results.
- **US-7:** As a user, I receive a weekly email digest with my top 5 new matches since last week.

### Grant Detail
- **US-8:** As a user, I can view a grant detail page showing: full description, eligibility requirements, deadline, award range, link to original source, and similar past awards.
- **US-9:** As a user, I can save grants to a "Tracking" list and set deadline reminders.

### Admin
- **US-10:** As an admin, I can view system health: total grants indexed, last ingestion timestamp, and user counts.

## Core Workflows

### Workflow 1: Onboarding (3 minutes)
```
Sign up (email + password)
  → Guided profile builder (5 screens):
      1. Organization type (nonprofit / academic / startup / individual)
      2. Mission statement (free text, 50-500 words)
      3. Focus areas (multi-select from NTEE/NSF taxonomy + free text)
      4. Eligibility attributes (org size, geography, 501c3 status, minority-serving, etc.)
      5. Funding preferences (amount range, deadline window, federal vs. private)
  → System generates embedding from mission + focus areas
  → Initial match results appear in <30 seconds
```

### Workflow 2: Weekly Matching Cycle
```
Nightly: Ingest new grants from all sources
  → Embed new grant descriptions
  → Store in vector DB
Weekly (Sunday 6am UTC):
  → For each active user:
      → Run semantic search (user embedding → top 100 candidates)
      → Apply eligibility hard filters (remove ineligible)
      → Score remaining (semantic_score × eligibility_bonus)
      → Generate explanation for top 10
      → Store results in `match_results` table
      → Queue email digest
Monday 8am local time:
  → Send email digests
```

### Workflow 3: Interactive Search
```
User opens dashboard
  → Sees top matches (pre-computed)
  → Can also run ad-hoc search: "climate adaptation grants for small nonprofits in the southeast"
  → System embeds query → vector search → filter → rank → display
```

## MVP Scope (8-week build)

### In Scope
- User auth (email + password, magic link)
- Guided profile builder
- Grant ingestion from: Grants.gov API, NSF Awards API, NIH RePORTER API, SAM.gov
- Semantic matching using sentence-transformers
- Eligibility hard-filtering
- Dashboard with ranked matches + explanations
- Grant detail pages with link to original source
- Weekly email digest
- Save/track grants with deadline reminders
- "Not relevant" feedback button
- Basic admin dashboard

### Out of Scope (v2+)
- Foundation/private grant data (IRS 990 parsing — complex, save for v2)
- AI-generated LOI/application drafts
- Team collaboration features
- Institutional SSO
- CRM integrations
- Mobile app (responsive web only for MVP)
- State-level grant databases
- International grants (federal US only for MVP)
- Grant writing assistance

## Success Metrics

| Metric | Target (Month 3) | How Measured |
|--------|------------------|-------------|
| Registered users | 500 | DB count |
| Weekly active users | 150 | Login events |
| Match precision (user-rated) | >60% of top-10 rated "relevant" | Feedback clicks |
| Email open rate | >40% | Email provider analytics |
| Time to first match | <60 seconds from profile completion | Event logging |
| Grants indexed | >5,000 active opportunities | DB count |
| Paid conversions | 50 users | Stripe |

---

# Document 2: DATA_SOURCES.md

## Data Source Overview

| Source | Type | Access Method | Auth Required | Update Frequency | Est. Volume |
|--------|------|--------------|---------------|-----------------|-------------|
| Grants.gov | Federal opportunities | REST API | No | Daily | ~3,000 active |
| Simpler.Grants.gov | Federal opportunities (newer API) | REST API | API key (free) | Daily | Same as above |
| NSF Awards API | Past NSF awards + active programs | REST API | No | Weekly | ~60K awards/year |
| NIH RePORTER | NIH/HHS funded grants | REST API (POST) | No | Weekly | ~80K projects/year |
| SAM.gov | Federal contract + grant opportunities | REST API | API key (free) | Daily | ~30K active |
| IRS 990-PF (v2) | Foundation grant history | Bulk CSV/XML download | No | Annually | ~100K foundations |
| ProPublica Nonprofit API | Foundation lookup | REST API | No (rate limited) | Monthly | ~1.8M orgs |

## Source 1: Grants.gov REST API

**Base URL:** `https://www.grants.gov/grantsws/rest/opportunities/search/`  
**Documentation:** https://www.grants.gov/api/api-guide  
**Auth:** None required  
**Rate limit:** Reasonable use (no published limit, but throttle to 1 req/sec)

**Search endpoint:**
```
POST https://www.grants.gov/grantsws/rest/opportunities/search/
Content-Type: application/json

{
  "keyword": "",
  "oppStatus": "posted",
  "sortBy": "openDate|desc",
  "rows": 100,
  "startRecordNum": 0
}
```

**Detail endpoint:**
```
GET https://www.grants.gov/grantsws/rest/opportunity/details?oppId={opportunityId}
```

**Key response fields:**
- `opportunityId`, `opportunityTitle`, `description`, `agency`, `oppStatus`
- `openDate`, `closeDate`, `awardCeiling`, `awardFloor`
- `eligibilities` (array of eligible applicant types)
- `cfdaList` (CFDA/Assistance Listing numbers)
- `categoryOfFundingActivity` (e.g., "Science and Technology", "Health")

**Ingestion strategy:** Paginate through all `oppStatus=posted` opportunities nightly. Fetch full details for new/updated records. ~3,000 active opportunities at any time.

## Source 2: Simpler.Grants.gov API (newer, recommended)

**Base URL:** `https://api.simpler.grants.gov/v1/`  
**Documentation:** https://wiki.simpler.grants.gov/product/api  
**Auth:** API key required (free registration)  
**Rate limit:** Standard API limits

**Search endpoint:**
```
POST https://api.simpler.grants.gov/v1/opportunities/search
Headers:
  X-Api-Key: {your_key}
  Content-Type: application/json

{
  "filters": {
    "opportunity_status": {"one_of": ["posted"]},
    "agency": {"one_of": ["HHS", "DOE"]}
  },
  "pagination": {"page_offset": 1, "page_size": 25},
  "query": "climate resilience"
}
```

**Ingestion strategy:** Use as primary federal source. Falls back to legacy Grants.gov API if needed.

## Source 3: NSF Awards API

**Base URL:** `https://api.nsf.gov/services/v1/awards.json`  
**Documentation:** https://resources.research.gov/common/webapi/awardapisearch-v1.htm  
**Auth:** None required  
**Rate limit:** Reasonable use

**Example request:**
```
GET https://api.nsf.gov/services/v1/awards.json?keyword=machine+learning&dateStart=01/01/2024&printFields=id,title,abstractText,awardeeName,piName,startDate,expDate,estimatedTotalAmt,fundProgramName&rpp=25&offset=1
```

**Key response fields:**
- `id`, `title`, `abstractText`, `awardeeName`, `piName`
- `startDate`, `expDate`, `estimatedTotalAmt`, `fundsObligatedAmt`
- `fundProgramName`, `agency`, `cfdaNumber`

**Ingestion strategy:** Use for historical pattern analysis ("who gets funded for what"). Query active program solicitations from NSF website separately. Ingest all awards from last 3 years for training signal.

## Source 4: NIH RePORTER API (v2)

**Base URL:** `https://api.reporter.nih.gov/v2/projects/search`  
**Documentation:** https://api.reporter.nih.gov  
**Auth:** None required  
**Rate limit:** 1 request/second recommended; large jobs off-peak only

**Example request:**
```
POST https://api.reporter.nih.gov/v2/projects/search
Content-Type: application/json

{
  "criteria": {
    "fiscal_years": [2024, 2025],
    "include_active_projects": true,
    "newly_added_projects_only": false
  },
  "offset": 0,
  "limit": 500,
  "sort_field": "project_start_date",
  "sort_order": "desc"
}
```

**Key response fields:**
- `appl_id`, `project_title`, `abstract_text`, `phr_text` (public health relevance)
- `agency_ic_admin` (e.g., "NCI", "NIMH"), `activity_code` (e.g., "R01", "R21")
- `award_amount`, `project_start_date`, `project_end_date`
- `organization.org_name`, `organization.org_state`
- `principal_investigators[].full_name`
- `spending_categories_desc`

**Ingestion strategy:** Use for understanding what NIH funds. Query active FOAs (Funding Opportunity Announcements) from NIH Guide separately. Bulk download ExPORTER files annually for historical analysis.

## Source 5: SAM.gov Opportunities API

**Base URL:** `https://api.sam.gov/opportunities/v2/search`  
**Documentation:** https://open.gsa.gov/api/get-opportunities-public-api/  
**Auth:** API key required (free from api.data.gov)

**Example request:**
```
GET https://api.sam.gov/opportunities/v2/search?api_key={key}&postedFrom=01/01/2025&postedTo=02/13/2026&ptype=g&limit=100&offset=0
```

Note: `ptype=g` filters to grants only (excludes contracts).

**Key response fields:**
- `noticeId`, `title`, `description`, `solicitationNumber`
- `department`, `subtier`, `office`
- `postedDate`, `responseDeadLine`, `type`
- `naicsCode`, `classificationCode`

## Source 6: IRS 990-PF Data (Foundation Grants — v2 feature)

**Access:** Bulk download from IRS (https://www.irs.gov/charities-non-profits/form-990-series-downloads) or ProPublica Nonprofit API  
**ProPublica API:** `https://projects.propublica.org/nonprofits/api/v2/organizations/{ein}.json`  
**Auth:** None (rate limited)

**MVP strategy:** For MVP, use ProPublica API for basic foundation lookup only (by EIN). Full 990-PF grant parsing is v2 scope.

## Unified Grant Data Schema

All grants from all sources are normalized into this schema before storage:

```json
{
  "id": "string (UUID, internal)",
  "source": "string (enum: grants_gov | nsf | nih | sam_gov | foundation)",
  "source_id": "string (original ID from source)",
  "source_url": "string (link to original listing)",
  
  "title": "string",
  "description": "string (full text, may be long)",
  "summary": "string (first 500 chars or AI-generated summary)",
  
  "agency": "string (e.g., 'National Science Foundation')",
  "agency_code": "string (e.g., 'NSF', 'HHS-NIH')",
  "program_name": "string (e.g., 'CAREER', 'R01')",
  
  "amount_floor": "integer (dollars, nullable)",
  "amount_ceiling": "integer (dollars, nullable)",
  
  "open_date": "date (ISO 8601)",
  "close_date": "date (ISO 8601, nullable for rolling)",
  "is_rolling": "boolean",
  
  "eligible_applicant_types": ["string (enum list, see below)"],
  "eligible_categories": ["string (CFDA categories)"],
  "cfda_numbers": ["string"],
  
  "focus_areas": ["string (normalized topic tags)"],
  "geographic_scope": "string (national | state:{code} | region:{name})",
  
  "embedding": "float[] (384-dim, from all-MiniLM-L6-v2)",
  
  "status": "string (enum: active | closed | forecasted | archived)",
  "created_at": "datetime",
  "updated_at": "datetime",
  "raw_data": "jsonb (original source response, for debugging)"
}
```

### Eligible Applicant Type Enum (normalized across sources)
```
nonprofit_501c3
nonprofit_other
state_government
local_government
tribal_government
higher_education
for_profit_small_business
for_profit_other
individual
special_district
independent_school_district
other
```

### Example Grant Record (JSON)
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "source": "grants_gov",
  "source_id": "350742",
  "source_url": "https://www.grants.gov/search-results-detail/350742",
  "title": "Community Health Worker Training Program for Rural Underserved Areas",
  "description": "The Health Resources and Services Administration (HRSA) is accepting applications for the Community Health Worker Training Program (CHWTP). The purpose of this program is to increase the number of community health workers in rural and underserved communities...",
  "summary": "HRSA funding to train community health workers in rural and underserved areas. Supports curriculum development, clinical training, and job placement.",
  "agency": "Health Resources and Services Administration",
  "agency_code": "HHS-HRSA",
  "program_name": "Community Health Worker Training Program",
  "amount_floor": 500000,
  "amount_ceiling": 1000000,
  "open_date": "2025-11-01",
  "close_date": "2026-03-15",
  "is_rolling": false,
  "eligible_applicant_types": [
    "nonprofit_501c3",
    "higher_education",
    "state_government",
    "local_government",
    "tribal_government"
  ],
  "eligible_categories": ["Health"],
  "cfda_numbers": ["93.117"],
  "focus_areas": ["community health", "workforce development", "rural health", "health equity"],
  "geographic_scope": "national",
  "embedding": [0.0234, -0.0891, ...],
  "status": "active",
  "created_at": "2025-11-01T00:00:00Z",
  "updated_at": "2026-02-10T06:00:00Z",
  "raw_data": { "...original grants.gov response..." }
}
```

---

# Document 3: USER_SCHEMA.md

## User Profile Schema

```json
{
  "id": "UUID",
  "email": "string (required, unique)",
  "password_hash": "string",
  "created_at": "datetime",
  "last_login": "datetime",
  
  "profile": {
    "display_name": "string (required, 1-200 chars)",
    "organization_name": "string (optional, 1-300 chars)",
    "organization_ein": "string (optional, format: XX-XXXXXXX)",
    
    "organization_type": "string (required, enum: nonprofit_501c3 | nonprofit_other | higher_education | for_profit_small_business | for_profit_other | state_government | local_government | tribal_government | individual)",
    
    "mission_statement": "string (required, 50-5000 chars) — The core text used for semantic matching",
    
    "focus_areas": ["string (required, 1-10 items) — User-selected from taxonomy + free text"],
    
    "annual_budget": "string (optional, enum: under_250k | 250k_1m | 1m_5m | 5m_25m | 25m_plus)",
    "employee_count": "string (optional, enum: 1_5 | 6_25 | 26_100 | 101_500 | 500_plus)",
    "year_founded": "integer (optional, 4 digits)",
    
    "geographic_focus": {
      "state": "string (optional, 2-letter state code or 'national')",
      "region": "string (optional, enum: northeast | southeast | midwest | southwest | west | pacific | national)",
      "serves_rural": "boolean (default: false)",
      "serves_tribal": "boolean (default: false)"
    },
    
    "eligibility_attributes": {
      "has_501c3": "boolean (default: false)",
      "is_minority_serving": "boolean (default: false)",
      "is_hbcu": "boolean (default: false)",
      "is_hispanic_serving": "boolean (default: false)",
      "has_sam_registration": "boolean (default: false)",
      "has_indirect_cost_rate": "boolean (default: false)",
      "is_small_business": "boolean (default: false)"
    },
    
    "funding_preferences": {
      "min_amount": "integer (optional, dollars)",
      "max_amount": "integer (optional, dollars)",
      "deadline_window_days": "integer (optional, default: 90, how far ahead to look)",
      "preferred_sources": ["string (optional, enum: federal | state | foundation | all)"],
      "excluded_agencies": ["string (optional, agency codes to exclude)"]
    },
    
    "embedding": "float[] (384-dim, computed from mission_statement + focus_areas)",
    "embedding_updated_at": "datetime"
  },
  
  "preferences": {
    "email_digest_enabled": "boolean (default: true)",
    "email_digest_day": "string (default: 'monday', enum: monday-sunday)",
    "timezone": "string (default: 'America/New_York', IANA timezone)"
  },
  
  "subscription": {
    "plan": "string (enum: free | pro | team)",
    "stripe_customer_id": "string (optional)",
    "current_period_end": "datetime (optional)"
  }
}
```

### Required vs Optional Fields

| Field | Required | Used For |
|-------|----------|----------|
| email | ✅ | Auth |
| display_name | ✅ | UI |
| organization_type | ✅ | Eligibility filtering |
| mission_statement | ✅ | Semantic embedding |
| focus_areas | ✅ (≥1) | Semantic embedding + category filter |
| organization_name | ❌ | Display only |
| annual_budget | ❌ | Eligibility soft signal |
| geographic_focus | ❌ | Geographic filtering |
| eligibility_attributes | ❌ (defaults to false) | Hard eligibility filters |
| funding_preferences | ❌ (sensible defaults) | Result filtering |

### Example User Profile: Small Nonprofit

```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "email": "maria@cleanwateralliance.org",
  "profile": {
    "display_name": "Maria Gonzalez",
    "organization_name": "Clean Water Alliance",
    "organization_ein": "47-1234567",
    "organization_type": "nonprofit_501c3",
    "mission_statement": "Clean Water Alliance protects and restores freshwater ecosystems in the southeastern United States through community-based monitoring, advocacy, and education. We work with rural communities to address contamination from agricultural runoff and aging infrastructure, with a focus on environmental justice in underserved communities.",
    "focus_areas": ["water quality", "environmental justice", "community education", "rural communities"],
    "annual_budget": "250k_1m",
    "employee_count": "6_25",
    "year_founded": 2015,
    "geographic_focus": {
      "state": "national",
      "region": "southeast",
      "serves_rural": true,
      "serves_tribal": false
    },
    "eligibility_attributes": {
      "has_501c3": true,
      "is_minority_serving": false,
      "has_sam_registration": true,
      "has_indirect_cost_rate": false
    },
    "funding_preferences": {
      "min_amount": 25000,
      "max_amount": 500000,
      "deadline_window_days": 120,
      "preferred_sources": ["federal", "foundation"]
    }
  }
}
```

### Example User Profile: Academic Researcher

```json
{
  "id": "b23dc40a-11ab-4932-bc89-1a2b3c4d5e6f",
  "email": "jchen@university.edu",
  "profile": {
    "display_name": "Dr. Jessica Chen",
    "organization_name": "University of Michigan",
    "organization_type": "higher_education",
    "mission_statement": "My lab studies the molecular mechanisms of antimicrobial resistance in Gram-negative bacteria, with a focus on computational approaches to predict resistance phenotypes from genomic data. We combine machine learning with experimental microbiology to develop rapid diagnostic tools for hospital infection control. Current projects include protein language model-based AMR prediction and real-time outbreak genomic surveillance.",
    "focus_areas": ["antimicrobial resistance", "computational biology", "genomics", "infection control", "machine learning"],
    "annual_budget": "1m_5m",
    "geographic_focus": {
      "state": "MI",
      "region": "midwest"
    },
    "eligibility_attributes": {
      "has_501c3": true,
      "has_sam_registration": true,
      "has_indirect_cost_rate": true
    },
    "funding_preferences": {
      "min_amount": 100000,
      "max_amount": 2000000,
      "deadline_window_days": 180,
      "preferred_sources": ["federal"]
    }
  }
}
```

### Example User Profile: Small Business (SBIR seeker)

```json
{
  "id": "c34ed51b-22bc-5043-cd9a-2b3c4d5e6f70",
  "email": "alex@agritechai.com",
  "profile": {
    "display_name": "Alex Rivera",
    "organization_name": "AgriTech AI Inc.",
    "organization_type": "for_profit_small_business",
    "mission_statement": "AgriTech AI develops computer vision and satellite imagery analysis tools for early crop disease detection in smallholder farming communities. Our mobile-first platform combines Sentinel-2 satellite data with weather forecasting to provide 7-day disease risk predictions via SMS alerts.",
    "focus_areas": ["precision agriculture", "computer vision", "satellite imagery", "crop disease", "food security"],
    "annual_budget": "under_250k",
    "employee_count": "1_5",
    "year_founded": 2024,
    "geographic_focus": {
      "state": "national",
      "region": "national",
      "serves_rural": true
    },
    "eligibility_attributes": {
      "has_501c3": false,
      "is_small_business": true,
      "has_sam_registration": true
    },
    "funding_preferences": {
      "min_amount": 50000,
      "max_amount": 1500000,
      "preferred_sources": ["federal"]
    }
  }
}
```

---

# Document 4: MATCHING_LOGIC.md

## Overview

Matching is a two-phase pipeline:
1. **Recall phase:** Semantic vector search retrieves top-N candidate grants
2. **Precision phase:** Eligibility hard filters + scoring formula produce final ranked results

This design ensures we never miss semantically relevant grants (high recall) while guaranteeing users only see grants they can actually apply for (precision).

## Phase 1: Semantic Recall (Vector Search)

### Embedding Generation

**Model:** `sentence-transformers/all-MiniLM-L6-v2`  
- 384 dimensions, ~80MB model, runs on CPU in <50ms per embedding  
- Trained on 1B+ sentence pairs, strong general-domain semantic similarity  
- MIT license, no API costs

**User embedding input text:**
```python
user_text = f"{profile.mission_statement}\n\nFocus areas: {', '.join(profile.focus_areas)}"
user_embedding = model.encode(user_text, normalize_embeddings=True)
# Result: float[384], L2-normalized
```

**Grant embedding input text:**
```python
grant_text = f"{grant.title}\n\n{grant.description[:2000]}\n\nProgram: {grant.program_name}\nCategories: {', '.join(grant.focus_areas)}"
grant_embedding = model.encode(grant_text, normalize_embeddings=True)
```

Embeddings are pre-computed and stored. User embeddings are recomputed only when profile changes. Grant embeddings are computed at ingestion time.

### Vector Search

**Database:** Qdrant (open-source, runs locally or via Qdrant Cloud free tier)

**Query:**
```python
results = qdrant_client.search(
    collection_name="grants",
    query_vector=user_embedding,
    query_filter=Filter(
        must=[
            FieldCondition(key="status", match=MatchValue(value="active"))
        ]
    ),
    limit=200  # Retrieve 200 candidates for filtering
)
```

**Why 200 candidates:** We expect ~40-60% to be filtered out by eligibility, leaving ~80-120 candidates for scoring. Top 10-20 are shown to the user.

## Phase 2: Eligibility Hard Filters

Hard filters are binary: a grant either passes or is eliminated. These map the user's `organization_type` and `eligibility_attributes` against the grant's `eligible_applicant_types`.

### Filter Rules (applied in order)

```python
def passes_eligibility(user_profile, grant):
    # Filter 1: Applicant type match
    user_type = user_profile.organization_type
    grant_types = grant.eligible_applicant_types
    
    # Map user type to grant eligibility categories
    type_mapping = {
        "nonprofit_501c3": ["nonprofit_501c3", "nonprofit_other"],
        "nonprofit_other": ["nonprofit_other"],
        "higher_education": ["higher_education"],
        "for_profit_small_business": ["for_profit_small_business", "for_profit_other"],
        "for_profit_other": ["for_profit_other"],
        "state_government": ["state_government"],
        "local_government": ["local_government"],
        "tribal_government": ["tribal_government"],
        "individual": ["individual"],
    }
    
    allowed_types = type_mapping.get(user_type, [user_type])
    if grant_types and not any(t in grant_types for t in allowed_types):
        return False, "applicant_type_mismatch"
    
    # Filter 2: Deadline not passed
    if grant.close_date and grant.close_date < today():
        return False, "deadline_passed"
    
    # Filter 3: Amount range (if user specified)
    if user_profile.funding_preferences.min_amount:
        if grant.amount_ceiling and grant.amount_ceiling < user_profile.funding_preferences.min_amount:
            return False, "amount_too_low"
    
    if user_profile.funding_preferences.max_amount:
        if grant.amount_floor and grant.amount_floor > user_profile.funding_preferences.max_amount:
            return False, "amount_too_high"
    
    # Filter 4: SBIR/STTR requires small business
    if "sbir" in grant.program_name.lower() or "sttr" in grant.program_name.lower():
        if not user_profile.eligibility_attributes.is_small_business:
            return False, "sbir_requires_small_business"
    
    return True, "eligible"
```

### Soft Eligibility Signals (not hard filters, but affect score)

These don't eliminate grants but adjust the relevance score:

| Signal | Effect on Score | Logic |
|--------|----------------|-------|
| User's state matches grant's geographic_scope | +0.1 bonus | Exact state match |
| User has SAM registration, grant requires it | +0.05 bonus | Reduces application friction |
| User is HBCU/MSI, grant prioritizes these | +0.15 bonus | Many federal grants have MSI priority |
| Grant deadline is <30 days away | -0.05 penalty | Urgent but risky to recommend |
| User previously dismissed similar grants | -0.1 penalty | Learned from feedback |

## Scoring Formula

```python
def compute_match_score(semantic_similarity, eligibility_bonuses, user_feedback_penalty):
    """
    semantic_similarity: float [0, 1] — cosine similarity from vector search
    eligibility_bonuses: float [0, 0.3] — sum of applicable soft signals
    user_feedback_penalty: float [0, 0.2] — penalty from dismissed similar grants
    
    Returns: float [0, 1]
    """
    raw_score = (
        0.70 * semantic_similarity
      + 0.20 * eligibility_bonuses  # normalized to [0, 1]
      + 0.10 * deadline_proximity_score  # closer deadline = slightly lower
      - user_feedback_penalty
    )
    return max(0.0, min(1.0, raw_score))
```

**Score interpretation for the user:**
| Score Range | Label | Color |
|-------------|-------|-------|
| 0.80 – 1.00 | Excellent Match | 🟢 Green |
| 0.60 – 0.79 | Good Match | 🟡 Yellow |
| 0.40 – 0.59 | Possible Match | 🟠 Orange |
| Below 0.40 | Not shown | — |

Only grants scoring ≥ 0.40 are displayed. Top 10 are highlighted.

## Explanation Generation

Each match includes a 1-2 sentence explanation. This is generated using a **template system** (not LLM calls — too expensive for batch processing):

```python
def generate_explanation(user_profile, grant, match_score, semantic_sim):
    parts = []
    
    # Core relevance
    overlap = compute_topic_overlap(user_profile.focus_areas, grant.focus_areas)
    if overlap:
        parts.append(f"Matches your focus on {', '.join(overlap[:2])}")
    elif semantic_sim > 0.7:
        parts.append("Strong thematic alignment with your mission")
    else:
        parts.append("Related to your work area")
    
    # Amount
    if grant.amount_ceiling:
        parts.append(f"Awards up to ${grant.amount_ceiling:,}")
    
    # Deadline
    if grant.close_date:
        days = (grant.close_date - today()).days
        if days <= 30:
            parts.append(f"Deadline in {days} days")
        elif days <= 90:
            parts.append(f"Due {grant.close_date.strftime('%B %d, %Y')}")
    
    # Special eligibility bonus
    if user_profile.eligibility_attributes.is_minority_serving:
        if "minority" in grant.description.lower() or "underserved" in grant.description.lower():
            parts.append("Prioritizes minority-serving organizations")
    
    return ". ".join(parts) + "."
```

**Example output:**
> "Matches your focus on water quality, environmental justice. Awards up to $500,000. Due March 15, 2026. Prioritizes minority-serving organizations."

## Feedback Loop

When a user clicks "Not Relevant" on a match:
1. Store the dismissal: `(user_id, grant_id, timestamp)`
2. Compute the embedding of the dismissed grant
3. For future matching, apply a cosine-similarity penalty to grants that are within 0.85 similarity of any dismissed grant
4. This is a lightweight "negative signal" — no model retraining required

When a user clicks "Save" or "Track" on a match:
1. Store the save: `(user_id, grant_id, timestamp)`
2. Optionally use saved grants as positive signal to boost similar grants in future (v2)

---

# Document 5: ARCHITECTURE.md

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                       │
│  ┌─────────┐  ┌──────────┐  ┌───────────┐  ┌───────────────┐  │
│  │ Auth    │  │ Profile  │  │ Dashboard │  │ Grant Detail  │  │
│  │ Pages   │  │ Builder  │  │ + Matches │  │ + Tracking    │  │
│  └─────────┘  └──────────┘  └───────────┘  └───────────────┘  │
└──────────────────────────────┬──────────────────────────────────┘
                               │ REST API (JSON)
┌──────────────────────────────┼──────────────────────────────────┐
│                        BACKEND (FastAPI)                        │
│  ┌──────────┐  ┌───────────┐  ┌────────────┐  ┌────────────┐  │
│  │ Auth     │  │ Profile   │  │ Matching   │  │ Ingestion  │  │
│  │ Service  │  │ Service   │  │ Service    │  │ Service    │  │
│  └──────────┘  └───────────┘  └────────────┘  └────────────┘  │
│                                    │                │           │
│  ┌─────────────────────────────────┼────────────────┼────────┐ │
│  │         sentence-transformers (all-MiniLM-L6-v2)          │ │
│  │         Loaded once at startup, shared across services     │ │
│  └───────────────────────────────────────────────────────────┘ │
└──────────┬─────────────┬────────────────┬──────────────────────┘
           │             │                │
    ┌──────┴──────┐ ┌────┴─────┐  ┌───────┴───────┐
    │ PostgreSQL  │ │  Qdrant  │  │  External     │
    │ (users,     │ │  (grant  │  │  APIs         │
    │  grants,    │ │  vectors)│  │  (Grants.gov, │
    │  matches,   │ │          │  │   NIH, NSF,   │
    │  feedback)  │ │          │  │   SAM.gov)    │
    └─────────────┘ └──────────┘  └───────────────┘
```

## Frontend Stack

| Component | Technology | Reason |
|-----------|-----------|--------|
| Framework | **Next.js 14** (App Router) | SSR for SEO, API routes, fast dev |
| Styling | **Tailwind CSS** | Rapid UI without design system |
| Auth UI | **NextAuth.js** | Email/password + magic link |
| State | **React Query (TanStack)** | Server state caching |
| Email rendering | **React Email** | Digest email templates |
| Deployment | **Vercel** (free tier) | Zero-config, preview deploys |

### Key Pages

| Route | Page | Auth |
|-------|------|------|
| `/` | Landing page | Public |
| `/login` | Auth page | Public |
| `/onboarding` | 5-step profile builder | Auth required |
| `/dashboard` | Match results + saved grants | Auth required |
| `/grants/[id]` | Grant detail page | Auth required |
| `/settings` | Profile edit + preferences | Auth required |
| `/admin` | Ingestion status + user stats | Admin only |

## Backend Stack

| Component | Technology | Reason |
|-----------|-----------|--------|
| Framework | **FastAPI** (Python 3.11+) | Fast, typed, OpenAPI docs |
| ORM | **SQLAlchemy 2.0** + **Alembic** | Migrations, typed models |
| Task queue | **APScheduler** (in-process) | Simple cron for MVP; swap to Celery later |
| Embeddings | **sentence-transformers** (local) | No API costs, <50ms/embedding |
| Vector DB client | **qdrant-client** | Python client for Qdrant |
| Email | **Resend** or **SendGrid** (free tier) | Transactional + digest emails |
| Deployment | **Railway** or **Render** (free/hobby tier) | Simple container deploy |

### API Endpoints

```
# Auth
POST   /api/auth/register          — Create account
POST   /api/auth/login              — Login (returns JWT)
POST   /api/auth/magic-link         — Send magic link email

# Profile
GET    /api/profile                 — Get current user profile
PUT    /api/profile                 — Update profile (triggers re-embedding)
POST   /api/profile/import-ein      — Autofill from EIN lookup

# Matches
GET    /api/matches                 — Get user's current top matches
GET    /api/matches?q=climate       — Ad-hoc semantic search
POST   /api/matches/feedback        — Submit "not relevant" or "save"

# Grants
GET    /api/grants/:id              — Get grant detail
GET    /api/grants/saved            — Get user's saved grants
POST   /api/grants/:id/track        — Save grant to tracking list
DELETE /api/grants/:id/track        — Remove from tracking list

# Admin
GET    /api/admin/stats             — System statistics
POST   /api/admin/ingest/trigger    — Manually trigger ingestion
GET    /api/admin/ingestion-log     — Last N ingestion runs
```

## Database Schema (PostgreSQL)

```sql
-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    display_name VARCHAR(200) NOT NULL,
    organization_name VARCHAR(300),
    organization_ein VARCHAR(12),
    organization_type VARCHAR(50) NOT NULL,
    mission_statement TEXT NOT NULL,
    focus_areas JSONB NOT NULL DEFAULT '[]',
    annual_budget VARCHAR(20),
    employee_count VARCHAR(20),
    year_founded INTEGER,
    geographic_focus JSONB DEFAULT '{}',
    eligibility_attributes JSONB DEFAULT '{}',
    funding_preferences JSONB DEFAULT '{}',
    email_preferences JSONB DEFAULT '{"digest_enabled": true, "digest_day": "monday", "timezone": "America/New_York"}',
    subscription_plan VARCHAR(20) DEFAULT 'free',
    stripe_customer_id VARCHAR(100),
    embedding VECTOR(384),  -- pgvector extension (backup; primary search is Qdrant)
    embedding_updated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ
);

-- Grants (normalized from all sources)
CREATE TABLE grants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source VARCHAR(20) NOT NULL,
    source_id VARCHAR(100) NOT NULL,
    source_url TEXT,
    title TEXT NOT NULL,
    description TEXT,
    summary VARCHAR(1000),
    agency VARCHAR(200),
    agency_code VARCHAR(20),
    program_name VARCHAR(300),
    amount_floor INTEGER,
    amount_ceiling INTEGER,
    open_date DATE,
    close_date DATE,
    is_rolling BOOLEAN DEFAULT false,
    eligible_applicant_types JSONB DEFAULT '[]',
    eligible_categories JSONB DEFAULT '[]',
    cfda_numbers JSONB DEFAULT '[]',
    focus_areas JSONB DEFAULT '[]',
    geographic_scope VARCHAR(50) DEFAULT 'national',
    status VARCHAR(20) DEFAULT 'active',
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(source, source_id)
);

CREATE INDEX idx_grants_status ON grants(status);
CREATE INDEX idx_grants_close_date ON grants(close_date);
CREATE INDEX idx_grants_source ON grants(source);

-- Pre-computed match results (refreshed weekly)
CREATE TABLE match_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    grant_id UUID REFERENCES grants(id) ON DELETE CASCADE,
    score FLOAT NOT NULL,
    semantic_similarity FLOAT NOT NULL,
    eligibility_bonus FLOAT DEFAULT 0,
    explanation TEXT,
    is_new BOOLEAN DEFAULT true,  -- first time this match appeared
    computed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, grant_id)
);

CREATE INDEX idx_match_results_user ON match_results(user_id, score DESC);

-- User feedback on matches
CREATE TABLE match_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    grant_id UUID REFERENCES grants(id) ON DELETE CASCADE,
    feedback_type VARCHAR(20) NOT NULL,  -- 'dismissed' | 'saved' | 'applied'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, grant_id, feedback_type)
);

-- Saved/tracked grants with deadline reminders
CREATE TABLE tracked_grants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    grant_id UUID REFERENCES grants(id) ON DELETE CASCADE,
    notes TEXT,
    remind_days_before INTEGER DEFAULT 14,
    reminder_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, grant_id)
);

-- Ingestion log
CREATE TABLE ingestion_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source VARCHAR(20) NOT NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    grants_fetched INTEGER DEFAULT 0,
    grants_new INTEGER DEFAULT 0,
    grants_updated INTEGER DEFAULT 0,
    grants_closed INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'running',  -- running | completed | failed
    error_message TEXT
);
```

## Vector Database (Qdrant)

**Deployment:** Qdrant Cloud free tier (1GB storage, sufficient for 100K+ grants) or local Docker container.

**Collection setup:**
```python
from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance

client = QdrantClient(url="http://localhost:6333")  # or Qdrant Cloud URL

client.create_collection(
    collection_name="grants",
    vectors_config=VectorParams(
        size=384,  # all-MiniLM-L6-v2 output dimension
        distance=Distance.COSINE
    )
)
```

**Point structure:**
```python
{
    "id": "grant-uuid-as-string",
    "vector": [0.023, -0.089, ...],  # 384 floats
    "payload": {
        "status": "active",
        "source": "grants_gov",
        "agency_code": "HHS-HRSA",
        "close_date": "2026-03-15",
        "eligible_applicant_types": ["nonprofit_501c3", "higher_education"],
        "amount_ceiling": 1000000,
        "geographic_scope": "national"
    }
}
```

Payload fields enable server-side filtering in Qdrant queries, reducing the number of results that need post-processing.

## Data Ingestion Flow

```
┌──────────────┐
│  APScheduler │
│  (cron jobs) │
└──────┬───────┘
       │
       │  Nightly 2am UTC
       ▼
┌──────────────────────────────────────────────────┐
│  For each source (grants_gov, nsf, nih, sam):    │
│                                                   │
│  1. Fetch new/updated opportunities               │
│  2. Normalize to unified schema                   │
│  3. Compute embedding (sentence-transformers)     │
│  4. Upsert into PostgreSQL (grants table)         │
│  5. Upsert into Qdrant (vector + payload)         │
│  6. Mark closed grants (close_date < today)       │
│  7. Log results to ingestion_runs table           │
└──────────────────────────────────────────────────┘
       │
       │  Weekly Sunday 6am UTC
       ▼
┌──────────────────────────────────────────────────┐
│  For each active user:                            │
│                                                   │
│  1. Query Qdrant: user_embedding → top 200        │
│  2. Apply eligibility hard filters                │
│  3. Compute match score                           │
│  4. Generate explanation text                     │
│  5. Upsert match_results (mark new matches)       │
│  6. Queue email digest (if enabled)               │
└──────────────────────────────────────────────────┘
       │
       │  Monday 8am user-local-time
       ▼
┌──────────────────────────────────────────────────┐
│  Send email digests via Resend/SendGrid           │
│  - Top 5 new matches since last digest            │
│  - Deadline reminders for tracked grants          │
└──────────────────────────────────────────────────┘
```

## Deployment Architecture (MVP)

| Component | Service | Cost |
|-----------|---------|------|
| Frontend | Vercel (free tier) | $0 |
| Backend API | Railway ($5/mo hobby) or Render (free tier) | $0–5/mo |
| PostgreSQL | Railway or Neon (free tier, 0.5GB) | $0 |
| Qdrant | Qdrant Cloud (free tier, 1GB) or Docker on Railway | $0 |
| Email | Resend (free tier, 3K emails/mo) | $0 |
| Domain | Any registrar | ~$12/year |
| **Total MVP cost** | | **$0–5/month** |

---

# Document 6: MVP_BUILD_PLAN.md

## 8-Week Build Plan

### Week 1: Foundation

**Goal:** Working auth, database, and basic API skeleton.

**Tasks:**
- [ ] Initialize repos: `grantmatcher-api` (Python/FastAPI) and `grantmatcher-web` (Next.js)
- [ ] Set up PostgreSQL database with schema from ARCHITECTURE.md
- [ ] Run Alembic init + first migration
- [ ] Implement auth endpoints: register, login (JWT), magic link
- [ ] Set up NextAuth.js on frontend with credentials provider
- [ ] Create landing page (simple: hero, value prop, sign-up CTA)
- [ ] Deploy backend to Railway, frontend to Vercel
- [ ] Verify end-to-end: user can register and log in

**Skip:** Styling polish, onboarding flow, any grant data.

**Deliverable:** User can sign up, log in, and see a blank dashboard.

### Week 2: Grant Ingestion Pipeline

**Goal:** Real grants from Grants.gov flowing into the database.

**Tasks:**
- [ ] Implement Grants.gov ingestion script (fetch all posted opportunities)
- [ ] Implement data normalization to unified grant schema
- [ ] Install sentence-transformers, load all-MiniLM-L6-v2 model
- [ ] Compute and store embeddings for all grants
- [ ] Set up Qdrant (local Docker for dev, Cloud for prod)
- [ ] Upsert grant vectors + payloads into Qdrant
- [ ] Implement SAM.gov ingestion (same pattern, second source)
- [ ] Create ingestion_runs logging
- [ ] Set up APScheduler for nightly cron
- [ ] Implement `/api/admin/stats` endpoint

**Skip:** NSF and NIH (add in week 4). UI for grants.

**Deliverable:** ~3,000+ real grants in the database with embeddings. Admin can verify via API.

### Week 3: User Profile + Semantic Matching

**Goal:** User creates profile, gets real matches.

**Tasks:**
- [ ] Build 5-step onboarding wizard (frontend)
  - Step 1: Organization type selector
  - Step 2: Mission statement textarea (with character count)
  - Step 3: Focus areas (multi-select with search + free text)
  - Step 4: Eligibility checkboxes
  - Step 5: Funding preferences (amount range slider, deadline window)
- [ ] Implement `PUT /api/profile` — saves profile + computes embedding
- [ ] Implement matching pipeline: embed user → Qdrant search → eligibility filter → score → explain
- [ ] Implement `GET /api/matches` endpoint
- [ ] Build dashboard page showing top 10 matches as cards

**Skip:** Email digests, feedback, tracking. Focus on the core "profile → matches" loop.

**Deliverable:** User completes profile, sees 10 ranked grant matches in <30 seconds. This is the "wow moment" — validate with 5 test users.

### Week 4: Grant Detail + More Sources

**Goal:** Rich grant pages + NIH/NSF data.

**Tasks:**
- [ ] Build grant detail page (`/grants/[id]`)
  - Title, full description, agency, amount range, deadline
  - Eligibility requirements
  - "Apply on original site" button (links to source_url)
  - Match score badge + explanation
- [ ] Implement NSF Awards API ingestion
- [ ] Implement NIH RePORTER API ingestion
- [ ] Run full ingestion cycle (now 4 sources)
- [ ] Add "Save" button on grant cards and detail page
- [ ] Implement `tracked_grants` table operations
- [ ] Build "Saved Grants" tab on dashboard

**Skip:** Deadline reminders, feedback loop.

**Deliverable:** 5,000+ grants indexed from 4 sources. Users can browse, save, and link to original applications.

### Week 5: Feedback Loop + Search

**Goal:** Users can dismiss bad matches and run ad-hoc searches.

**Tasks:**
- [ ] Implement "Not Relevant" button on match cards
- [ ] Store feedback in `match_feedback` table
- [ ] Implement feedback penalty in scoring (dismissed grant similarity penalty)
- [ ] Build ad-hoc search: text input → embed → vector search → display
  - Add search bar to dashboard header
  - `GET /api/matches?q=climate+adaptation+rural`
- [ ] Implement filters sidebar on dashboard:
  - Amount range
  - Deadline window
  - Agency/source
  - Eligibility type
- [ ] Improve focus_areas extraction: use zero-shot classification on grant descriptions to auto-tag topics

**Skip:** Email, payments.

**Deliverable:** Matching quality improves with feedback. Users can search and filter. Core product loop is complete.

### Week 6: Email Digests + Reminders

**Goal:** Weekly digest emails go out. Deadline reminders work.

**Tasks:**
- [ ] Set up Resend (or SendGrid) account
- [ ] Design email digest template with React Email
  - Header: "Your Weekly Grant Matches"
  - Body: Top 5 new matches with title, score, deadline, 1-line explanation
  - CTA: "View All Matches" button
  - Footer: unsubscribe link
- [ ] Implement weekly match computation job (Sunday 6am)
- [ ] Implement email sending job (Monday 8am per timezone)
- [ ] Implement deadline reminders for tracked grants
  - Check tracked_grants where close_date - today <= remind_days_before
  - Send reminder email
  - Set reminder_sent = true
- [ ] Add email preferences to settings page

**Deliverable:** Users receive weekly email with top matches. Tracked grants send deadline reminders.

### Week 7: Polish + Payments

**Goal:** Production-ready UX. Stripe integration for paid tier.

**Tasks:**
- [ ] UI polish pass:
  - Responsive design (mobile-friendly dashboard)
  - Loading states and error handling
  - Empty states (no matches yet, no saved grants)
  - Score badges with color coding (green/yellow/orange)
- [ ] Implement Stripe checkout for Pro plan ($29/mo)
  - Free tier: 5 matches shown, no email digest
  - Pro tier: unlimited matches, weekly digest, deadline reminders
- [ ] Add plan gating to API endpoints
- [ ] Settings page: edit profile, change preferences, manage subscription
- [ ] EIN auto-import: user enters EIN → fetch from ProPublica API → autofill org name, type, state
- [ ] SEO: add meta tags, Open Graph, landing page content
- [ ] Add basic analytics (Plausible or PostHog free tier)

**Deliverable:** App looks professional. Paid tier works. Ready for public beta.

### Week 8: User Testing + Launch

**Goal:** Get 50 real users. Fix critical bugs. Launch publicly.

**Tasks:**
- [ ] Recruit 20-30 beta users:
  - Post in r/nonprofit, r/gradadmissions, r/SBIR subreddits
  - Post in nonprofit Slack/Discord communities
  - Email 10 local nonprofits directly
  - Share in university grant office mailing lists
- [ ] Monitor feedback:
  - Track match precision (% of top-10 rated relevant)
  - Track onboarding completion rate
  - Track email open/click rates
- [ ] Fix top 5 reported bugs
- [ ] Write 3 SEO blog posts:
  - "How to Find Federal Grants for Small Nonprofits"
  - "A Researcher's Guide to NSF and NIH Funding"
  - "SBIR/STTR Grants: What Small Businesses Need to Know"
- [ ] Submit to Product Hunt
- [ ] Submit to Indie Hackers
- [ ] Set up customer support (simple: email + Crisp chat widget)

**Deliverable:** 50+ registered users, 10+ paid users, match precision >60%.

## What to Validate First

The single most important validation is:

> **"Does the semantic matching actually surface relevant grants?"**

Test this by Week 3. If the top-10 matches for 5 different test profiles are mostly garbage, the product won't work regardless of how pretty the UI is. Specifically:

1. Create profiles for 3 archetype users (nonprofit, researcher, startup)
2. Have a domain expert rate the top 10 matches for each: Relevant / Somewhat Relevant / Not Relevant
3. Target: ≥6 out of 10 rated "Relevant" or "Somewhat Relevant"
4. If below target: improve embedding input text, add keyword boosting, or try a larger model (all-mpnet-base-v2)

## What to Explicitly Skip

| Feature | Why Skip | When to Add |
|---------|----------|-------------|
| Foundation/private grants | Requires 990-PF parsing (complex) | v2, month 4 |
| AI-written LOI drafts | Needs careful prompt engineering, liability concerns | v2 |
| Team features | Solo users are the initial market | v2, if institutional demand |
| State grant databases | 50 different formats, no standard | v3 |
| International grants | Different regulatory frameworks | v3 |
| Mobile app | Responsive web is sufficient for MVP | v3 |
| Custom ML model | Sentence-transformers works well enough for MVP | v2, if precision needs improvement |
| Real-time notifications | Weekly digest is sufficient | v2 |

## Cost Summary (First 3 Months)

| Item | Monthly Cost |
|------|-------------|
| Railway (backend hosting) | $5 |
| Qdrant Cloud (free tier) | $0 |
| Vercel (free tier) | $0 |
| Neon PostgreSQL (free tier) | $0 |
| Resend email (free tier, 3K/mo) | $0 |
| Domain name | $1 (amortized) |
| **Total** | **~$6/month** |

Revenue target at month 3: 50 paid users × $29/mo = **$1,450/mo**.

---

*End of documentation package. These six documents provide everything needed for an LLM-assisted developer to build GrantMatcherAI from zero to launched product in 8 weeks.*
