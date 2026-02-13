# GrantMatcher API

FastAPI backend for GrantMatcherAI - AI-powered grant matching for nonprofits and researchers.

## Local Development

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Run the development server:
```bash
uvicorn main:app --reload
```

## Production Deployment

### Railway (Recommended)

1. Connect your GitHub repository to Railway
2. Set environment variables in Railway dashboard:
   - `DATABASE_URL`: PostgreSQL connection string from Neon
   - `SECRET_KEY`: Random secret key for JWT
   - `FRONTEND_URL`: Your Vercel frontend URL
   - `QDRANT_URL`: Qdrant Cloud URL (optional for MVP)
   - `QDRANT_API_KEY`: Qdrant API key (optional for MVP)

3. Railway will automatically detect the Dockerfile and deploy

### Render

1. Create a new Web Service
2. Connect your GitHub repository
3. Set build command: `pip install -r requirements.txt`
4. Set start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Set environment variables as above

## API Documentation

Once running, visit `http://localhost:8000/docs` for interactive API documentation.