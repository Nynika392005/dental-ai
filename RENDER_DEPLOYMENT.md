# Deploy DentAI Backend on Render

## Prerequisites
- GitHub account with your dentai-ai repository
- Render account (sign up at https://render.com)
- MongoDB Atlas account for production database

## Step 1: Set Up MongoDB Atlas (Production Database)

1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free cluster (M0 Sandbox)
3. Create a database user with password
4. Whitelist all IPs: `0.0.0.0/0` (for Render access)
5. Get your connection string:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/dentai?retryWrites=true&w=majority
   ```

## Step 2: Deploy on Render

### Option A: Using render.yaml (Recommended)

1. **Push render.yaml to GitHub**
   ```bash
   git add render.yaml
   git commit -m "Add Render deployment config"
   git push origin master
   ```

2. **Create New Service on Render**
   - Go to https://dashboard.render.com
   - Click "New +" → "Blueprint"
   - Connect your GitHub repository
   - Render will detect `render.yaml` automatically
   - Click "Apply"

3. **Set Environment Variables**
   In Render Dashboard → Your Service → Environment:
   ```
   MONGODB_URL=<your-atlas-connection-string>
   OPENROUTER_API_KEY=<your-openrouter-key>
   GROQ_API_KEY=<your-groq-key>
   GOOGLE_API_KEY=<your-google-key>
   ENVIRONMENT=production
   ```
   (SECRET_KEY is auto-generated)

### Option B: Manual Deployment

1. **Create New Web Service**
   - Go to https://dashboard.render.com
   - Click "New +" → "Web Service"
   - Connect your GitHub repo

2. **Configure Service**
   ```
   Name: dentai-backend
   Region: Singapore (or closest to you)
   Branch: master
   Root Directory: dentai-backend
   Runtime: Python 3
   Build Command: pip install -r requirements.txt
   Start Command: uvicorn app.main:app --host 0.0.0.0 --port $PORT
   Plan: Free
   ```

3. **Environment Variables** (same as above)

## Step 3: Get Your Render URL

After deployment completes, Render will give you a URL like:
```
https://dentai-backend-abc123.onrender.com
```

## Step 4: Update Mobile App

1. **Edit `dentai-mobile/lib/api.ts`**
   ```typescript
   const BACKEND_URLS = [
     'https://dentai-backend-abc123.onrender.com',  // Your actual Render URL
     'http://172.20.10.2:8000',  // Local dev fallback
     // ... other local IPs
   ];
   ```

2. **Rebuild Mobile App**
   ```bash
   cd dentai-mobile
   npx expo start
   ```

## Step 5: Test Deployment

1. **Test Backend Health**
   ```bash
   curl https://your-render-url.onrender.com/
   ```

2. **Test from Mobile App**
   - Open the app
   - Try logging in
   - Try scanning an image
   - Check if it's using the Render URL (should show in logs)

## Important Notes

### Free Tier Limitations
- ⚠️ **Render free tier spins down after 15 minutes of inactivity**
- First request after spin-down takes 30-60 seconds to wake up
- 750 hours/month of runtime (enough for development/testing)

### Production Checklist
- ✅ MongoDB Atlas cluster created
- ✅ Environment variables set in Render
- ✅ CORS origins include mobile app domains
- ✅ Mobile app updated with Render URL
- ✅ Test all features (auth, scanner, appointments, chat)

### CORS Configuration

The backend already includes CORS configuration in `app/core/config.py`:
```python
CORS_ORIGINS: List[str] = [
    "https://nynika392005.github.io",
    "*"  # Allows mobile apps
]
```

This allows your mobile app to connect to the deployed backend.

## Troubleshooting

### Backend won't start
- Check Render logs for errors
- Verify all environment variables are set
- Check Python version matches requirements

### Mobile app can't connect
- Verify Render URL is correct in `api.ts`
- Check Render service is running (not sleeping)
- Test URL directly in browser

### Database connection fails
- Verify MongoDB Atlas connection string
- Check IP whitelist includes `0.0.0.0/0`
- Test connection string format

## Monitoring

- **Render Dashboard**: https://dashboard.render.com
- **View Logs**: Service → Logs tab
- **Metrics**: Service → Metrics tab

## Cost

- **Render Free Tier**: $0/month (with limitations)
- **MongoDB Atlas Free**: $0/month (512MB storage)
- **Total**: FREE for development and testing!

## Upgrade to Paid (Optional)

For production with real users:
- Render: $7/month (no spin-down, better performance)
- MongoDB Atlas: $9/month (dedicated cluster)
