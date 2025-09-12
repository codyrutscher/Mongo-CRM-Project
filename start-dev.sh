#!/bin/bash

echo "🚀 Starting ProspereCRM in Development Mode"
echo "========================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm are installed"

# Install backend dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    npm install
fi

# Install frontend dependencies if node_modules doesn't exist
if [ ! -d "react-frontend/node_modules" ]; then
    echo "📦 Installing React frontend dependencies..."
    cd react-frontend
    npm install
    cd ..
fi

echo "🔧 Starting backend API server on port 3001..."
npm run dev &
BACKEND_PID=$!

echo "⏳ Waiting for backend to start..."
sleep 3

echo "🎨 Starting React frontend on port 3000..."
cd react-frontend
npm start &
FRONTEND_PID=$!

echo ""
echo "✅ Development servers started!"
echo "🌐 Backend API: http://localhost:3001"
echo "🎨 Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both servers"

# Function to kill both processes on script exit
cleanup() {
    echo ""
    echo "🛑 Shutting down servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

# Set trap to call cleanup function on script exit
trap cleanup INT TERM

# Wait for both background processes
wait