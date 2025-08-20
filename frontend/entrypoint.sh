#!/bin/sh

# Replace environment variables in nginx config
if [ -n "$BACKEND_URL" ]; then
    echo "Configuring nginx with BACKEND_URL: $BACKEND_URL"
    sed -i "s|\${BACKEND_URL}|$BACKEND_URL|g" /etc/nginx/nginx.conf
else
    echo "Warning: BACKEND_URL not set, using default backend"
    sed -i "s|\${BACKEND_URL}|https://candidatehubapiv2.azurewebsites.net|g" /etc/nginx/nginx.conf
fi

# Test nginx configuration
nginx -t

# Execute the command passed to the script
exec "$@"