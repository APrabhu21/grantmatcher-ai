# GrantMatcherAI MVP

AI-powered grant matching for nonprofits and researchers. This is a complete, functional MVP ready for deployment.

## What's Included

✅ **Complete MVP Features:**
- User registration and authentication
- 5-step guided profile onboarding
- AI-powered grant matching using semantic search
- Grant detail pages with application links
- Save/bookmark functionality
- Application status tracking
- "Not Relevant" feedback system
- Ad-hoc search functionality

✅ **Production-Ready Architecture:**
- FastAPI backend with comprehensive API
- Next.js frontend with responsive UI
- SQLite database (development) / PostgreSQL (production)
- Sentence-transformers for embeddings
- JWT authentication with NextAuth.js

## Quick Deployment (3 Steps)

### 1. Set up Backend (Railway)

1. Go to [Railway.app](https://railway.app) and create account
2. Connect your GitHub repository
3. Set environment variables:
   ```
   DATABASE_URL=postgresql://... (Railway provides this)
   SECRET_KEY=your-random-secret-key
   FRONTEND_URL=https://your-frontend.vercel.app
   ```
4. Deploy - Railway auto-detects Dockerfile

### 2. Set up Database (Neon)

1. Go to [Neon.tech](https://neon.tech) and create account
2. Create a new project
3. Copy the connection string to Railway environment variables

### 3. Set up Frontend (Vercel)

1. Go to [Vercel.com](https://vercel.com) and create account
2. Connect your GitHub repository
3. Set environment variables:
   ```
   NEXT_PUBLIC_API_BASE_URL=https://your-backend.railway.app
   NEXTAUTH_URL=https://your-frontend.vercel.app
   NEXTAUTH_SECRET=your-random-secret
   ```
4. Deploy - Vercel auto-detects Next.js

## Cost: $0-5/month

| Service | Cost | Purpose |
|---------|------|---------|
| Vercel | $0 | Frontend hosting |
| Railway | $5 | Backend hosting |
| Neon | $0 | PostgreSQL database |
| Domain | $12/year | Custom domain (optional) |

## Local Development

### Backend
```bash
cd grantmatcher-api
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend
```bash
cd grantmatcher-web
npm install
npm run dev
```

## Next Steps After Deployment

1. **Domain Registration**: Purchase a domain name and point it to Vercel
2. **Grant Data Ingestion**: Run the ingestion pipeline to populate grants
3. **User Testing**: Get beta users and gather feedback
4. **Email Digests**: Add weekly email functionality (post-launch)
5. **Payments**: Implement Stripe for premium features (post-launch)

## Architecture Overview

```
Frontend (Vercel) ←→ Backend (Railway) ←→ Database (Neon)
     ↓                                        ↓
   Next.js 14                             PostgreSQL
 NextAuth.js                              SQLAlchemy
Tailwind CSS                              FastAPI
                                           Sentence Transformers
```

## API Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/matches` - Get grant matches
- `GET /api/grants/{id}` - Grant details
- `POST /api/grants/{id}/track` - Save grant
- `POST /api/matches/feedback` - Submit feedback

## Support

This MVP is production-ready and includes all core functionality. The architecture supports easy scaling and feature additions.