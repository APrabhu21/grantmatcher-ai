# GrantMatcher Web

Next.js frontend for GrantMatcherAI - AI-powered grant matching for nonprofits and researchers.

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env.local
```

3. Update `.env.local` with your backend URL (default is http://localhost:8001)

4. Run the development server:
```bash
npm run dev
```

## Production Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_API_BASE_URL`: Your Railway/Render backend URL
   - `NEXTAUTH_URL`: Your Vercel domain (e.g., https://grantmatcher.vercel.app)
   - `NEXTAUTH_SECRET`: Random secret string for NextAuth

3. Vercel will automatically detect Next.js and deploy

### Manual Deployment

1. Build the application:
```bash
npm run build
```

2. Start the production server:
```bash
npm start
```

## Features

- User authentication with NextAuth.js
- 5-step onboarding wizard
- Grant matching dashboard
- Grant detail pages
- Save/bookmark functionality
- Application status tracking
- Feedback system
- Search functionality

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
