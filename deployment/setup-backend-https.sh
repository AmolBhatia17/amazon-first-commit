#!/bin/bash
# Setup HTTPS for Backend using nginx and Let's Encrypt
# Run this on EC2 instance via SSH

set -e

echo "=== Setting up HTTPS for Backend ==="
echo ""

# Check if domain is provided
if [ -z "$1" ]; then
    echo "Usage: ./setup-backend-https.sh yourdomain.com"
    echo ""
    echo "If you don't have a domain, you can:"
    echo "1. Get a free domain from Freenom (freenom.com)"
    echo "2. Or use AWS API Gateway (see BACKEND_HTTPS_GUIDE.md)"
    exit 1
fi

DOMAIN=$1
BACKEND_PORT=8080

echo "Domain: $DOMAIN"
echo "Backend port: $BACKEND_PORT"
echo ""

# Update system
echo "Updating system..."
sudo apt update
sudo apt upgrade -y

# Install nginx and certbot
echo "Installing nginx and certbot..."
sudo apt install -y nginx certbot python3-certbot-nginx

# Configure nginx
echo "Configuring nginx..."
sudo tee /etc/nginx/sites-available/unitalks-backend > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    # Proxy to backend
    location / {
        proxy_pass http://localhost:$BACKEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # WebSocket support
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
    }
}
EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/unitalks-backend /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx config
sudo nginx -t

# Start nginx
sudo systemctl restart nginx
sudo systemctl enable nginx

# Get SSL certificate
echo "Getting SSL certificate from Let's Encrypt..."
sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN --redirect

# Setup auto-renewal
echo "Setting up certificate auto-renewal..."
sudo systemctl enable certbot.timer

echo ""
echo "✅ HTTPS setup complete!"
echo ""
echo "Backend HTTPS URL: https://$DOMAIN"
echo ""
echo "Update your frontend REACT_APP_API_URL to: https://$DOMAIN"
echo ""
