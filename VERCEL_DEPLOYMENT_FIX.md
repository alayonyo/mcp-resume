# Vercel Deployment Fix - Checklist

## Issues Fixed ✅

1. **Removed dependency on build/config.js** - Inlined configuration directly in
   api/index.js
2. **Added includeFiles in vercel.json** - Ensures api-resources/\*.md files are
   deployed
3. **Added .vercelignore** - Prevents unnecessary files from being deployed
4. **Improved error handling** - Added try-catch blocks and better error logging
5. **Added debugging logs** - Shows environment, CORS settings, and working
   directory

## Changes Made

### 1. api/index.js

- ✅ Inlined CORS configuration (removed import from ../build/config.js)
- ✅ Added error logging for debugging
- ✅ Added fallback error handler if app creation fails
- ✅ Improved JSON parsing error handling

### 2. vercel.json

- ✅ Added `includeFiles: ["api-resources/**/*.md"]` to ensure resource files
  are deployed

### 3. .vercelignore

- ✅ Created file to exclude build artifacts, tests, and unnecessary files

## Deployment Steps

### 1. Verify Environment Variables in Vercel Dashboard

Go to your Vercel project settings and ensure these are set:

- `ANTHROPIC_API_KEY` - Your Claude API key
- `NODE_ENV` - Should be "production" (auto-set by Vercel)

### 2. Deploy to Vercel

```bash
# If using Vercel CLI
vercel --prod

# Or push to your connected Git repository
git add .
git commit -m "fix: resolve serverless function crash in production"
git push origin main
```

### 3. Test After Deployment

```bash
# Test the status endpoint
curl https://your-domain.vercel.app/api/status

# Should return:
# {
#   "status": "ok",
#   "server": "File Context MCP Server",
#   "version": "1.0.0",
#   "timestamp": "...",
#   "environment": "production",
#   "hasClaudeKey": true
# }
```

### 4. Monitor Logs

In Vercel dashboard, check the Function Logs for:

- ✅ `🔧 Environment: Production`
- ✅ `🌐 CORS enabled for: https://yonatan-ayalon.com, ...`
- ✅ `🔑 Has ANTHROPIC_API_KEY: true`
- ✅ `✅ Express app created successfully`

## Testing the API

### Test Status Endpoint

```bash
curl https://your-vercel-domain/api/status
```

### Test Chat Endpoint

```bash
curl -X POST https://your-vercel-domain/api/chat \\
  -H "Content-Type: application/json" \\
  -H "Origin: https://yonatan-ayalon.com" \\
  -d '{"message": "Hello, test message"}'
```

### Test Public Evaluate Candidate Endpoint

```bash
curl -X POST https://your-vercel-domain/api/public/evaluate-candidate \\
  -H "Content-Type: application/json" \\
  -H "Origin: https://yonatan-ayalon.com" \\
  -d '{"jobDescription": "Senior React Developer"}'
```

## Common Issues & Solutions

### If you still get 500 errors:

1. **Check Vercel Function Logs**

   - Go to Vercel Dashboard → Your Project → Deployments → Click latest → View
     Function Logs

2. **Verify ANTHROPIC_API_KEY**

   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Ensure the key is set and valid

3. **Check File Paths**

   - Serverless functions have limited file system access
   - api-resources folder must be at project root
   - Verify includeFiles in vercel.json

4. **Module Import Issues**
   - Ensure all imports use correct paths
   - No relative imports outside api/ directory
   - All dependencies in package.json

## Next Steps

After successful deployment:

1. ✅ Test all API endpoints
2. ✅ Verify CORS headers work from yonatan-ayalon.com
3. ✅ Monitor function execution times and errors
4. ✅ Set up error alerting in Vercel (optional)

## Rollback Plan

If issues persist:

```bash
# Revert to previous deployment
vercel rollback
```

## Support

If you continue to experience issues:

1. Share the Vercel Function Logs
2. Check the Runtime Logs in Vercel Dashboard
3. Verify all environment variables are set correctly
