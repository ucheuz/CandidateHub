# Use Python 3.9 slim image with explicit platform
FROM --platform=linux/amd64 python:3.9-slim

# Set working directory
WORKDIR /app

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV FLASK_ENV=production

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Make startup scripts executable
RUN chmod +x startup.sh simple_startup.sh

# List files for debugging (including Firebase key)
RUN ls -la /app/
RUN echo "Checking for Firebase key files:"
RUN ls -la /app/*firebase* || echo "No firebase files found in /app/"

# Expose port (Azure will set PORT env var)
EXPOSE 8000

# Health check with Azure Web Apps port - shorter timeout for faster recovery
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:${WEBSITES_PORT:-8000}/health || exit 1

# Use regular startup with resilient error handling
CMD ["./startup.sh"]
