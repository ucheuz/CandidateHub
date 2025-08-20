#!/bin/bash

echo "=== CandidateHub Backend Simple Startup ==="
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

# Test simple app import
echo "Testing simple app import..."
python -c "import simple_app; print('✓ Simple app import successful')" || exit 1

# Start with Gunicorn - simplified config
echo "Starting Gunicorn on 0.0.0.0:$PORT (Simple Mode)..."
exec gunicorn simple_app:app --bind 0.0.0.0:$PORT --workers 1 --timeout 120 --log-level info --access-logfile - --error-logfile -
