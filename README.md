# Exponent - ML Platform

No setup. No notebooks. Just prompt AI, run it in the cloud, and deploy it anywhere.

## 🚀 Production Deployment

### Frontend (Vercel)

1. **Environment Variables**
   - Copy `env.example` to `.env.local`
   - Set up Clerk authentication:
     - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
     - `CLERK_SECRET_KEY`
   - Configure API URL:
     - `NEXT_PUBLIC_API_URL` (your backend URL)

2. **Deploy to Vercel**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Deploy
   vercel --prod
   ```

3. **Vercel Configuration**
   - `vercel.json` is already configured
   - Environment variables are set in Vercel dashboard
   - Automatic deployments on git push

### Backend (Render)

1. **Environment Variables**
   - Copy `env.example` to `.env`
   - Required variables:
     - `S3_BUCKET_NAME`
     - `OPENAI_API_KEY`
     - `GITHUB_TOKEN`
     - `FRONTEND_URL` (your Vercel frontend URL)
     - `AWS_ACCESS_KEY` & `AWS_SECRET_KEY` (optional, can use IAM roles)

2. **Deploy to Render**
   - Connect your GitHub repository
   - Render will use `render.yaml` for configuration
   - Set environment variables in Render dashboard

## 🛠️ Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## 📁 Project Structure

```
exponent/
├── app/                    # Next.js app directory
│   ├── dashboard/         # Main dashboard
│   ├── sign-in/          # Authentication
│   ├── sign-up/          # Registration
│   └── layout.tsx        # Root layout
├── components/           # Reusable components
├── lib/                 # Utilities and API client
├── public/              # Static assets
└── vercel.json          # Vercel configuration
```

## 🔧 Configuration

### Environment Variables

See `env.example` for all required environment variables.

### API Configuration

The frontend connects to the backend API. Update `NEXT_PUBLIC_API_URL` to point to your deployed backend.

## 🚨 Production Checklist

- [ ] Environment variables configured
- [ ] Clerk authentication set up
- [ ] API URL points to production backend
- [ ] Error boundaries implemented
- [ ] Security headers configured
- [ ] Rate limiting enabled (backend)
- [ ] CORS properly configured
- [ ] Health checks implemented
- [ ] Logging configured
- [ ] SSL certificates enabled

## 📝 License

MIT


