# Production Deployment Checklist

## 🎯 Pre-Deployment Checklist

### Frontend (Vercel) ✅

- [ ] **Environment Variables**
  - [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk publishable key
  - [ ] `CLERK_SECRET_KEY` - Clerk secret key
  - [ ] `NEXT_PUBLIC_API_URL` - Backend API URL
  - [ ] `NEXT_PUBLIC_CLERK_SIGN_IN_URL` - Sign-in page URL
  - [ ] `NEXT_PUBLIC_CLERK_SIGN_UP_URL` - Sign-up page URL
  - [ ] `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` - Post-sign-in redirect
  - [ ] `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` - Post-sign-up redirect

- [ ] **Clerk Configuration**
  - [ ] Create Clerk application
  - [ ] Configure authentication routes
  - [ ] Set up user management
  - [ ] Configure webhooks (optional)

- [ ] **Build Configuration**
  - [ ] `vercel.json` configured ✅
  - [ ] `next.config.ts` optimized ✅
  - [ ] TypeScript compilation passes ✅
  - [ ] All dependencies installed ✅

### Backend (Render) ✅

- [ ] **Environment Variables**
  - [ ] `S3_BUCKET_NAME` - AWS S3 bucket name
  - [ ] `OPENAI_API_KEY` - OpenAI API key
  - [ ] `GITHUB_TOKEN` - GitHub personal access token
  - [ ] `FRONTEND_URL` - Frontend Vercel URL
  - [ ] `AWS_ACCESS_KEY` - AWS access key (optional with IAM)
  - [ ] `AWS_SECRET_KEY` - AWS secret key (optional with IAM)

- [ ] **Infrastructure Setup**
  - [ ] AWS S3 bucket created
  - [ ] S3 bucket permissions configured
  - [ ] OpenAI API account active
  - [ ] GitHub token with repo access
  - [ ] Modal account configured (for ML training)

- [ ] **Render Configuration**
  - [ ] `render.yaml` configured ✅
  - [ ] `requirements.txt` updated ✅
  - [ ] `start.sh` executable ✅
  - [ ] Python 3.11 specified ✅

## 🚀 Deployment Steps

### 1. Deploy Backend First (Render)

1. **Connect Repository**
   ```bash
   # Push to GitHub if not already done
   git add .
   git commit -m "Production ready"
   git push origin main
   ```

2. **Render Setup**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Render will auto-detect `render.yaml`

3. **Environment Variables**
   - Set all required environment variables in Render dashboard
   - Ensure `FRONTEND_URL` points to your Vercel domain

4. **Deploy**
   - Click "Create Web Service"
   - Monitor deployment logs
   - Test health endpoint: `https://your-app.onrender.com/health`

### 2. Deploy Frontend (Vercel)

1. **Vercel Setup**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Login to Vercel
   vercel login
   ```

2. **Environment Variables**
   - Set all required environment variables in Vercel dashboard
   - Ensure `NEXT_PUBLIC_API_URL` points to your Render backend

3. **Deploy**
   ```bash
   # Deploy to production
   vercel --prod
   ```

4. **Verify Deployment**
   - Test authentication flow
   - Verify API connectivity
   - Check error boundaries

## 🔧 Post-Deployment Verification

### Frontend Tests
- [ ] Homepage loads correctly
- [ ] Authentication works (sign-in/sign-up)
- [ ] Dashboard accessible after login
- [ ] API calls to backend succeed
- [ ] Error boundaries catch errors gracefully
- [ ] Responsive design works on mobile

### Backend Tests
- [ ] Health check endpoint responds
- [ ] CORS allows frontend requests
- [ ] Rate limiting works
- [ ] File uploads to S3 succeed
- [ ] OpenAI API calls work
- [ ] Training endpoints respond

### Integration Tests
- [ ] Create a new project
- [ ] Upload a dataset
- [ ] Start a training job
- [ ] Monitor training progress
- [ ] Download results

## 🔒 Security Verification

### Frontend Security
- [ ] HTTPS enabled (Vercel handles this)
- [ ] Security headers configured ✅
- [ ] Authentication required for protected routes ✅
- [ ] No sensitive data in client-side code ✅

### Backend Security
- [ ] HTTPS enabled (Render handles this)
- [ ] CORS properly configured ✅
- [ ] Rate limiting active ✅
- [ ] Input validation working ✅
- [ ] Error messages don't leak sensitive info ✅

## 📊 Monitoring Setup

### Frontend Monitoring
- [ ] Vercel Analytics enabled
- [ ] Error tracking configured
- [ ] Performance monitoring active

### Backend Monitoring
- [ ] Render logs accessible
- [ ] Health check monitoring
- [ ] Error alerting configured

## 🚨 Troubleshooting

### Common Issues

1. **CORS Errors**
   - Check `FRONTEND_URL` in backend environment
   - Verify frontend domain in allowed origins

2. **Authentication Failures**
   - Verify Clerk keys are correct
   - Check Clerk application configuration

3. **API Connection Issues**
   - Confirm `NEXT_PUBLIC_API_URL` is correct
   - Test backend health endpoint

4. **S3 Upload Failures**
   - Check AWS credentials
   - Verify S3 bucket permissions
   - Test bucket access

5. **Training Failures**
   - Check Modal configuration
   - Verify GPU provider availability
   - Review training logs

## 📈 Performance Optimization

### Frontend
- [ ] Images optimized
- [ ] Code splitting implemented
- [ ] Bundle size analyzed
- [ ] Core Web Vitals optimized

### Backend
- [ ] Database queries optimized (if applicable)
- [ ] Caching implemented where appropriate
- [ ] Response times monitored
- [ ] Resource usage optimized

## ✅ Final Checklist

- [ ] Both frontend and backend deployed successfully
- [ ] All environment variables configured
- [ ] Authentication working end-to-end
- [ ] Core functionality tested
- [ ] Error handling verified
- [ ] Security measures active
- [ ] Monitoring configured
- [ ] Documentation updated
- [ ] Team notified of deployment

## 🎉 Deployment Complete!

Your Exponent ML Platform is now live in production! 🚀

**Frontend**: https://your-app.vercel.app
**Backend**: https://your-app.onrender.com

Remember to:
- Monitor performance and errors
- Set up alerts for critical issues
- Keep dependencies updated
- Regularly backup data
- Test new features in staging first 