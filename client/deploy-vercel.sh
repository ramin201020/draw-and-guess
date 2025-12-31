#!/bin/bash

echo "🚀 Deploying to Vercel..."

# Clean install dependencies
echo "📦 Installing dependencies..."
npm ci

# Build the project
echo "🔨 Building project..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build successful! Ready for deployment."
    echo "📁 Built files are in the 'dist' directory"
    echo "🌐 Deploy to Vercel using: vercel --prod"
else
    echo "❌ Build failed! Please check the errors above."
    exit 1
fi