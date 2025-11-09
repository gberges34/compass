#!/bin/bash

# Compass Backend - Railway Deployment Script

set -e  # Exit on error

echo "🚀 Compass Backend Deployment to Railway"
echo "========================================"
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found"
    echo ""
    echo "Install it with:"
    echo "  brew install railway"
    echo "  or visit: https://docs.railway.app/develop/cli"
    exit 1
fi

echo "✅ Railway CLI found"
echo ""

# Navigate to backend directory
cd ~/compass/backend

# Check if logged in
echo "🔐 Checking Railway authentication..."
if ! railway whoami &> /dev/null; then
    echo "Not logged in. Opening browser for authentication..."
    railway login
else
    echo "✅ Already authenticated as: $(railway whoami)"
fi

echo ""
echo "📦 Deploying backend to Railway..."
railway up

echo ""
echo "🌐 Getting your public URL..."
RAILWAY_URL=$(railway domain 2>&1 | grep -Eo 'https://[a-zA-Z0-9.-]+\.railway\.app' | head -n 1)

if [ -z "$RAILWAY_URL" ]; then
    echo "⚠️  No domain found. Creating one..."
    railway domain
    RAILWAY_URL=$(railway domain 2>&1 | grep -Eo 'https://[a-zA-Z0-9.-]+\.railway\.app' | head -n 1)
fi

echo ""
echo "✅ DEPLOYMENT COMPLETE!"
echo "========================================"
echo ""
echo "Your Compass API is live at:"
echo "  $RAILWAY_URL"
echo ""
echo "📝 Next Steps:"
echo ""
echo "1. Test the API:"
echo "   curl $RAILWAY_URL/health"
echo ""
echo "2. Update your iOS Shortcuts:"
echo "   Replace [YOUR_BACKEND_URL] with:"
echo "   $RAILWAY_URL"
echo ""
echo "3. Verify database:"
echo "   railway run npx prisma studio"
echo ""
echo "4. Check logs:"
echo "   railway logs"
echo ""
echo "📚 iOS Shortcuts guides available at:"
echo "   ~/compass/shortcuts/"
echo ""
echo "Happy productivity! 🎯"
