#!/bin/sh

# Comprehensive SSL certificate setup script
# This script handles both initial certificate acquisition and renewals

set -e

DOMAIN="thesis.khadim.io"
CLOUDFLARE_CREDENTIALS="/etc/letsencrypt/cloudflare.ini"
CERT_PATH="/etc/letsencrypt/live/$DOMAIN"

echo "=== SSL Certificate Setup for $DOMAIN ==="

# Check if Cloudflare credentials are available
if [ ! -f "$CLOUDFLARE_CREDENTIALS" ]; then
    echo "Error: Cloudflare credentials file not found at $CLOUDFLARE_CREDENTIALS"
    echo "Please create this file with your Cloudflare API credentials:"
    echo "dns_cloudflare_api_token = your_cloudflare_api_token"
    echo ""
    echo "You can copy the example file:"
    echo "cp letsencrypt/cloudflare.ini.example letsencrypt/cloudflare.ini"
    echo "Then edit it with your actual credentials."
    exit 1
fi

# Set proper permissions for credentials file
chmod 600 "$CLOUDFLARE_CREDENTIALS"

# Check if certificates already exist
if [ -f "$CERT_PATH/fullchain.pem" ] && [ -f "$CERT_PATH/privkey.pem" ]; then
    echo "SSL certificates already exist for $DOMAIN"
    echo "Checking if renewal is needed..."
    
    # Try to renew existing certificates
    if certbot renew --dns-cloudflare --dns-cloudflare-credentials "$CLOUDFLARE_CREDENTIALS" --quiet; then
        echo "Certificate renewal completed successfully"
    else
        echo "Certificate renewal failed or not needed"
    fi
else
    echo "No SSL certificates found. Requesting new certificates for $DOMAIN..."
    
    # Request new certificates using DNS challenge
    certbot certonly \
        --dns-cloudflare \
        --dns-cloudflare-credentials "$CLOUDFLARE_CREDENTIALS" \
        --non-interactive \
        --agree-tos \
        --email admin@$DOMAIN \
        --domains "$DOMAIN" \
        --expand
    
    if [ $? -eq 0 ]; then
        echo "SSL certificates successfully obtained for $DOMAIN"
        echo "Certificates are stored at: $CERT_PATH"
    else
        echo "Failed to obtain SSL certificates for $DOMAIN"
        echo "Please check your Cloudflare credentials and DNS configuration"
        exit 1
    fi
fi

# Reload nginx to use the certificates
echo "Reloading nginx configuration..."
nginx -s reload

echo "SSL certificate setup completed at $(date)"
