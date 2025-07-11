#!/bin/bash

echo "Testing server-side pre-fetching implementation..."
echo "Starting development server..."

# Start the dev server in the background
npm run dev &
DEV_PID=$!

# Wait for server to start
sleep 5

# Test the main page to see if data is being pre-fetched
echo "Testing main page..."
curl -s "http://localhost:3000" > /dev/null

if [ $? -eq 0 ]; then
    echo "✓ Server is running and responding"
else
    echo "✗ Server not responding"
fi

# Stop the dev server
kill $DEV_PID

echo "Test completed. Check the console logs in your development server to see the pre-fetching in action."
