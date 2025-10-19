# SSL Certificate Setup for Frontend Standalone

This document explains how to set up SSL certificates for the frontend-standalone service using Let's Encrypt and Cloudflare DNS challenge.

## Prerequisites

1. **Domain Configuration**: Ensure your domain `thesis.khadim.io` is properly configured to point to your server
2. **Cloudflare Account**: You need a Cloudflare account with DNS management for your domain
3. **Cloudflare API Token**: You need to create an API token with DNS edit permissions

## Step-by-Step Setup

### 1. Create Cloudflare API Token

1. Log into your Cloudflare dashboard
2. Go to "My Profile" → "API Tokens"
3. Click "Create Token"
4. Use the "Custom token" template with these permissions:
   - **Zone**: `DNS:Edit` for your domain (`thesis.khadim.io`)
   - **Zone Resources**: Include specific zone (`thesis.khadim.io`)
5. Copy the generated token

### 2. Configure Cloudflare Credentials

1. Copy the example credentials file:

   ```bash
   cp letsencrypt/cloudflare.ini.example letsencrypt/cloudflare.ini
   ```

2. Edit `letsencrypt/cloudflare.ini` and add your credentials:
   ```ini
   dns_cloudflare_api_token = your_actual_api_token_here
   ```

### 3. Build and Start the Container

```bash
# Build the container
docker-compose build frontend-standalone

# Start the container
docker-compose up frontend-standalone
```

### 4. Request SSL Certificates

Once the container is running, execute the SSL setup script:

```bash
# Enter the running container
docker exec -it frontend-standalone sh

# Run the SSL setup script
/usr/local/bin/certbot-setup.sh
```

The script will:

- Check if Cloudflare credentials are properly configured
- Request new SSL certificates using DNS challenge
- Automatically create the necessary DNS records in Cloudflare
- Reload nginx to use the new certificates

### 5. Verify SSL Setup

1. Check that certificates were created:

   ```bash
   ls -la /etc/letsencrypt/live/thesis.khadim.io/
   ```

2. Test HTTPS access:

   ```bash
   curl -I https://thesis.khadim.io
   ```

3. Check nginx logs:
   ```bash
   docker logs frontend-standalone
   ```

## Automatic Renewal

The SSL certificates will automatically renew. The renewal script is located at `/usr/local/bin/certbot-renew.sh` and can be run manually or via cron.

To set up automatic renewal via cron:

```bash
# Add to crontab (renew every 2 months)
0 3 1 */2 * docker exec frontend-standalone /usr/local/bin/certbot-renew.sh
```

## Troubleshooting

### DNS Records Not Created

If DNS records are not being created automatically:

1. **Check Cloudflare credentials**:

   ```bash
   # Verify credentials file exists and has correct permissions
   ls -la /etc/letsencrypt/cloudflare.ini
   ```

2. **Test Cloudflare API access**:

   ```bash
   # Test if the API token works
   docker exec -it frontend-standalone sh
   certbot certificates --dns-cloudflare --dns-cloudflare-credentials /etc/letsencrypt/cloudflare.ini
   ```

3. **Check domain configuration**:
   - Ensure the domain is managed by Cloudflare
   - Verify the domain points to your server's IP address
   - Check that Cloudflare is set to "Proxied" (orange cloud) for the domain

### Certificate Request Fails

If certificate request fails:

1. **Check logs**:

   ```bash
   docker logs frontend-standalone
   ```

2. **Verify domain accessibility**:

   ```bash
   # Test if domain resolves to your server
   nslookup thesis.khadim.io
   ```

3. **Check firewall settings**:
   - Ensure ports 80 and 443 are open
   - Verify nginx is listening on both ports

### Manual Certificate Request

If the automated script fails, you can request certificates manually:

```bash
docker exec -it frontend-standalone sh

certbot certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials /etc/letsencrypt/cloudflare.ini \
  --non-interactive \
  --agree-tos \
  --email admin@thesis.khadim.io \
  --domains thesis.khadim.io \
  --expand
```

## File Structure

```
apps/frontend-standalone/
├── ssl.conf                    # SSL nginx configuration template
├── certbot-setup.sh           # Initial SSL setup script
├── certbot-renew.sh           # Certificate renewal script
├── start.sh                   # Container startup script
└── SSL-SETUP.md              # This documentation

letsencrypt/
├── cloudflare.ini.example     # Cloudflare credentials template
└── cloudflare.ini            # Your actual credentials (create this)
```
