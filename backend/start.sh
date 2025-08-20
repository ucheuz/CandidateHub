#!/bin/bash

# Wait for firebase credentials
if [ ! -f "/app/firebase-key.json" ]; then
    echo "Waiting for firebase-key.json..."
    sleep 10
fi

# Start Flask app with proper error logging
python -u app.py 2>&1 | tee /app/flask.log
