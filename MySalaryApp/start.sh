#!/bin/bash

# Function to check if a port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        return 0
    else
        return 1
    fi
}

# Function to start a server
start_server() {
    local dir=$1
    local name=$2
    
    echo "Starting $name server..."
    cd $dir
    
    # Install dependencies if node_modules doesn't exist
    if [ ! -d "node_modules" ]; then
        echo "Installing dependencies for $name..."
        npm install
    fi
    
    # Start the server
    npm run dev &
    sleep 2
}

# Clear the terminal
clear

echo "Starting Salary App servers..."
echo "-----------------------------"

# Check if port 8000 is in use
if check_port 8000; then
    echo "Port 8000 is already in use. Please free up the port and try again."
    exit 1
fi

# Create data directory if it doesn't exist
if [ ! -d "backend/data" ]; then
    mkdir -p backend/data
fi

# Start backend server
start_server "backend" "backend"

# Check if backend started successfully
if ! check_port 8000; then
    echo "Failed to start backend server"
    exit 1
fi

# Start frontend server
start_server "frontend" "frontend"

echo "-----------------------------"
echo "Both servers are now running!"
echo "Access the application at: http://localhost:8000"
echo ""
echo "Default manager credentials:"
echo "Email: admin@example.com"
echo "Password: admin123"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for Ctrl+C
trap 'kill $(jobs -p)' INT
wait