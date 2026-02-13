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

## Quick FREE Deployment (3 Steps)

### 1. Set up Database (Neon - FREE)
1. Go to [neon.tech](https://neon.tech) → Create account
2. Create a new project → Copy connection string
3. Example: `postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/dbname`

### 2. Set up Backend (Render - FREE)
1. Go to [render.com](https://render.com) → Create account
2. **New → Web Service** → Connect GitHub → Select `grantmatcher-ai` repo → Select `grantmatcher-api` folder
3. Set build command: `pip install -r requirements.txt`
4. Set start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables:
   ```
   DATABASE_URL=your-neon-connection-string
   SECRET_KEY=your-random-secret-key
   FRONTEND_URL=https://your-app.vercel.app
   ```
6. Deploy - FREE tier available!

### 3. Set up Frontend (Vercel - FREE)
1. Go to [vercel.com](https://vercel.com) → Create account
2. **New Project** → Connect GitHub → Select `grantmatcher-ai` repo → Select `grantmatcher-web` folder
3. Add environment variables:
   ```
   NEXT_PUBLIC_API_BASE_URL=https://your-render-app.onrender.com
   NEXTAUTH_URL=https://your-app.vercel.app
   NEXTAUTH_SECRET=your-random-secret-string
   ```
4. Deploy - FREE!

## Cost Summary (FREE Tier)

| Service | Cost | Purpose |
|---------|------|---------|
| Vercel | $0 | Frontend hosting |
| Render | $0 | Backend hosting (free tier) |
| Neon | $0 | PostgreSQL database (0.5GB) |
| Qdrant | $0 | Vector database (1GB) |
| Resend | $0 | Email service (3K/mo) |
| **TOTAL** | **$0/month** | Use free Vercel domain |

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
Frontend (Vercel) ←→ Backend (Render) ←→ Database (Neon)
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