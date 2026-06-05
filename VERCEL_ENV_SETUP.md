# Vercel Environment Variables Setup Guide

## Issue
The backend is returning 500 errors because environment variables are not set on Vercel.

## Solution
You need to set the following environment variables in your Vercel project:

1. Go to: https://vercel.com/dashboard
2. Select your project: `exam-management-system`
3. Navigate to **Settings** → **Environment Variables**
4. Add these variables:

| Key | Value | Environment |
|-----|-------|-------------|
| `MONGO_URI` | Your MongoDB Atlas connection string (from backend/.env) | Production, Preview, Development |
| `JWT_SECRET` | Your JWT secret key (from backend/.env) | Production, Preview, Development |

### Example MONGO_URI format:
```
mongodb+srv://username:password@cluster.mongodb.net/examdb
```

## How to get your values:
- **MONGO_URI**: Copy from `backend/.env` (the line starting with `mongodb+srv://`)
- **JWT_SECRET**: Copy from `backend/.env` (the JWT_SECRET value)

## After setting variables:
1. Commit any pending changes: `git add . && git commit -m "Update backend config"`
2. Push to GitHub: `git push`
3. Wait for Vercel to redeploy (auto-triggered)
4. Test login/register again

## Fallback behavior:
- If MONGO_URI is not set but `mongodb-memory-server` works, data will be in-memory (resets on redeploy)
- For production, you MUST set MONGO_URI to persist data
