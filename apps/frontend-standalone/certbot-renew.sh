#!/bin/sh

# Script to renew SSL certificates with certbot using DNS challenge
# This script should be run periodically (e.g., via cron)

# Check if Cloudflare credentials are available
if [ ! -f /etc/letsencrypt/cloudflare.ini ]; then
    echo "Error: Cloudflare credentials file not found at /etc/letsencrypt/cloudflare.ini"
    echo "Please create this file with your Cloudflare API credentials:"
    echo "dns_cloudflare_api_token = your_cloudflare_api_token"
    echo "dns_cloudflare_email = your_cloudflare_email"
    exit 1
fi

# Set proper permissions for credentials file
chmod 600 /etc/letsencrypt/cloudflare.ini

# Renew certificates using DNS challenge
certbot renew --dns-cloudflare --dns-cloudflare-credentials /etc/letsencrypt/cloudflare.ini --quiet

# Reload nginx to use the renewed certificates
nginx -s reload

echo "Certificate renewal completed at $(date)"
