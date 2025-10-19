#!/bin/sh

# Check if SSL certificates exist
if [ -f "/etc/letsencrypt/live/thesis.khadim.io/fullchain.pem" ] && [ -f "/etc/letsencrypt/live/thesis.khadim.io/privkey.pem" ]; then
    echo "SSL certificates found, enabling HTTPS..."
    # Copy SSL configuration
    cp /etc/nginx/ssl.conf.template /etc/nginx/ssl.conf
else
    echo "SSL certificates not found, running HTTP only..."
    echo "To enable SSL, run: /usr/local/bin/certbot-setup.sh"
    # Create empty SSL configuration file
    touch /etc/nginx/ssl.conf
fi

# Start nginx
exec nginx -g "daemon off;"
