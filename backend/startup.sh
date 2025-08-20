#!/bin/bash

echo "=== CandidateHub Backend Startup ==="
echo "Current directory: $(pwd)"
echo "Python version: $(python --version)"

# Debug environment variables
echo "All PORT-related environment variables:"
env | grep -i port

# Set port - Azure Web Apps uses WEBSITES_PORT
if [ -n "$WEBSITES_PORT" ]; then
    export PORT=$WEBSITES_PORT
    echo "Using WEBSITES_PORT: $PORT"
elif [ -n "$PORT" ]; then
    echo "Using PORT: $PORT"
else
    export PORT=8000
    echo "Using default port: $PORT"
fi

# Test imports
echo "Testing app import..."
python -c "import app; print('✓ App import successful')" || exit 1

# Test that the app can start without immediate crashes
echo "Testing basic app functionality..."
python -c "
import app
from flask import Flask
print('✓ Flask app created successfully')
print('✓ All imports working')
" || exit 1

# Start with Gunicorn using config file
echo "Starting Gunicorn on 0.0.0.0:$PORT with config file..."
echo "Gunicorn config: preload_app=False, workers=1, timeout=120"

# Add some debug info
echo "Memory usage before starting:"
free -h || echo "free command not available"

# Start Gunicorn with additional logging
exec gunicorn --config gunicorn.conf.py --log-level info --access-logfile - --error-logfile - app:app