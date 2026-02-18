#!/bin/bash
# Auto-fix script for EC2 backend

echo "Checking Docker..."
docker --version

echo "Checking if container exists..."
if docker ps -a | grep -q unitalks-backend; then
    echo "Container exists. Checking status..."
    docker ps -a | grep unitalks-backend
    echo "Stopping and removing old container..."
    docker stop unitalks-backend || true
    docker rm unitalks-backend || true
fi

echo "Logging into ECR..."
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 278513763034.dkr.ecr.us-east-1.amazonaws.com

echo "Pulling latest image..."
docker pull 278513763034.dkr.ecr.us-east-1.amazonaws.com/unitalks-backend:latest

echo "Starting container..."
docker run -d --name unitalks-backend --restart unless-stopped \
  -p 8080:8080 \
  -e JWT_SECRET=$(openssl rand -hex 32) \
  -e PORT=8080 \
  -e NODE_ENV=production \
  278513763034.dkr.ecr.us-east-1.amazonaws.com/unitalks-backend:latest

echo "Waiting 5 seconds..."
sleep 5

echo "Checking container status..."
docker ps | grep unitalks-backend

echo "Checking logs..."
docker logs unitalks-backend --tail 20

echo "Testing health endpoint..."
curl http://localhost:8080/health || echo "Health check failed"