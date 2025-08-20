import os

# Server socket
bind = f"0.0.0.0:{os.environ.get('WEBSITES_PORT', os.environ.get('PORT', '8000'))}"
backlog = 2048

# Worker processes
workers = 1
worker_class = 'sync'
worker_connections = 1000
timeout = 120  # Set reasonable timeout (was 0/infinite)
keepalive = 2
# Logging
loglevel = 'info'
accesslog = '-'
errorlog = '-'
capture_output = True

# Process naming
proc_name = 'candidatehub-api'

# Server mechanics - Disable preload_app for Firebase compatibility
preload_app = False  # Changed from True - Firebase doesn't handle forking well
daemon = False
pidfile = None
tmp_upload_dir = None

# Azure App Service specific settings
graceful_timeout = 120
worker_tmp_dir = '/dev/shm'

# Worker restart settings for stability
max_requests = 500  # Restart workers more frequently
max_requests_jitter = 100

# SSL (if needed)
keyfile = None
certfile = None
