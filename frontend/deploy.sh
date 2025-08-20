#!/bin/bash

# Configuration
REGISTRY_NAME="candidateregistry"
REPOSITORY_NAME="candidatehub-frontend"
IMAGE_TAG="latest"
FULL_IMAGE_NAME="${REGISTRY_NAME}.azurecr.io/${REPOSITORY_NAME}:${IMAGE_TAG}"

# Clean up any existing containers/images to prevent conflicts
echo "Cleaning up existing Docker resources..."
docker system prune -f

# Build the Docker image with explicit platform and optimizations
echo "Building Docker image for ${FULL_IMAGE_NAME}..."
docker build \
  --platform=linux/amd64 \
  --no-cache \
  --pull \
  --build-arg BUILDKIT_INLINE_CACHE=1 \
  -t ${FULL_IMAGE_NAME} .

# Check if build was successful
if [ $? -ne 0 ]; then
    echo "Error: Docker build failed"
    exit 1
fi

# Test the container locally before pushing
echo "Testing container startup locally..."
docker run --rm -d --name test-container -p 3001:8080 ${FULL_IMAGE_NAME}
sleep 10
if ! curl -f http://localhost:3001 > /dev/null 2>&1; then
    echo "Warning: Container health check failed, but proceeding with push..."
fi
docker stop test-container 2>/dev/null || true

# Login to Azure Container Registry
echo "Logging in to Azure Container Registry..."
az acr login --name ${REGISTRY_NAME}

# Push the image to the container registry
echo "Pushing image to ${FULL_IMAGE_NAME}..."
docker push ${FULL_IMAGE_NAME}

# Check if push was successful
if [ $? -ne 0 ]; then
    echo "Error: Failed to push Docker image to registry"
    exit 1
fi

echo "Successfully built and pushed ${FULL_IMAGE_NAME}"
echo ""
echo "Deploy to Azure App Service with these settings:"
echo "Image: ${FULL_IMAGE_NAME}"
echo "Port: 8080"
echo "Platform: Linux"
echo ""
echo "Command:"
echo "az webapp config container set --name YOUR_APP_NAME --resource-group YOUR_RESOURCE_GROUP --docker-custom-image-name ${FULL_IMAGE_NAME}"
