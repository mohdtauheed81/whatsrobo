# Deployment Guide

This document outlines the deployment process for the WhatsApp SaaS platform.

## Pre-Deployment Checklist

### Infrastructure Setup

- [ ] MongoDB replica set configured (for production)
- [ ] Redis Cluster or ElastiCache configured
- [ ] AWS/GCP/Azure account and VPC setup
- [ ] Load balancer configured (Nginx, AWS ALB)
- [ ] SSL certificate obtained and installed
- [ ] Persistent storage for WhatsApp sessions (EFS/NFS)
- [ ] Backup strategy implemented
- [ ] Monitoring and alerting configured

### Application Preparation

- [ ] All environment variables configured
- [ ] Database migrations completed
- [ ] Subscription plans seeded
- [ ] ESLint passes without errors
- [ ] All dependencies pinned to specific versions
- [ ] Security audit completed
- [ ] CORS properly configured
- [ ] API rate limiting configured

### Testing

- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Load test results acceptable (< 2GB RAM, < 100ms latency)
- [ ] Manual smoke tests completed
- [ ] Staging environment tested

## Deployment Process

### 1. Prepare Deployment Package

```bash
# Install production dependencies
npm install --production

# Build (if needed)
npm run build

# Verify health check
npm run dev &
sleep 5
curl http://localhost:5000/health

# Create deployment package
tar czf whatsapp-saas-v1.0.0.tar.gz src/ package.json package-lock.json pm2.config.js
```

### 2. Deploy to Staging

```bash
# Copy to staging server
scp whatsapp-saas-v1.0.0.tar.gz user@staging-server:/app/

# SSH into staging
ssh user@staging-server

# Extract and setup
cd /app
tar xzf whatsapp-saas-v1.0.0.tar.gz
npm install --production

# Configure environment
cp .env.staging .env

# Start with PM2
pm2 start pm2.config.js

# Verify
curl http://localhost:5000/health
```

### 3. Run Smoke Tests

```bash
# Test authentication
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Test device creation (requires valid token)
curl -X POST http://localhost:5000/api/devices \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Device"}'

# Test health check
curl http://localhost:5000/health
```

### 4. Deploy to Production

```bash
# Copy to production
scp whatsapp-saas-v1.0.0.tar.gz user@prod-server:/app/

# SSH into production
ssh user@prod-server

# Backup current version
cp -r /app/src /app/src.backup.$(date +%Y%m%d_%H%M%S)

# Extract new version
cd /app
tar xzf whatsapp-saas-v1.0.0.tar.gz
npm install --production

# Configure environment
cp .env.production .env

# Reload PM2
pm2 reload all

# Verify
pm2 logs
curl http://localhost:5000/health
```

## Post-Deployment

### Verification

- [ ] Health check returning 200
- [ ] All PM2 processes running
- [ ] Database connections established
- [ ] Redis connections established
- [ ] No errors in logs
- [ ] API endpoints responding
- [ ] Socket.IO connected
- [ ] Test QR code generation
- [ ] Test message sending

### Monitoring

1. **Set up monitoring dashboards**
   - API response times
   - Error rates
   - WhatsApp client connections
   - Memory usage
   - Database query performance
   - Queue depth

2. **Configure alerts**
   - CPU > 80%
   - Memory > 90%
   - Error rate > 1%
   - Queue depth > 1000
   - Database unavailable
   - Redis unavailable

3. **Log aggregation**
   - Setup CloudWatch / ELK stack
   - Configure log retention (30 days)
   - Set up log-based alarms

## Scaling Considerations

### Horizontal Scaling (API Servers)

```bash
# Update load balancer to include multiple servers
# Run multiple API instances behind load balancer
pm2 start pm2.config.js -i 4  # 4 instances

# Ensure sticky sessions for WebSocket
# Configure in Nginx/Load Balancer
```

### Message Worker Scaling

```bash
# Run on dedicated worker nodes
# Only ONE worker instance per company's queue
# Or use Bull's built-in worker pool
```

### Database Scaling

```bash
# MongoDB Replica Set for high availability
# Connection pooling (10-20 connections per instance)
# Sharding for data > 100GB
# Backup every 6 hours
```

### Redis Scaling

```bash
# Redis Cluster for distributed caching
# Or use AWS ElastiCache for managed service
# Memory limit: monitor queue depth
# Persistence: RDB snapshots every 6 hours
```

## Disaster Recovery

### Backup Strategy

```bash
# MongoDB backup (daily)
mongodump --uri "mongodb://user:pass@host:27017/whatsapp_saas" --out /backups/mongo/

# Files backup (WhatsApp sessions)
rsync -av /path/to/sessions /backups/sessions/

# Code backup
git push origin main
```

### Recovery Process

```bash
# Restore MongoDB
mongorestore --uri "mongodb://user:pass@host:27017/whatsapp_saas" /backups/mongo/

# Restore sessions
rsync -av /backups/sessions/ /path/to/sessions/

# Restart services
pm2 restart all
```

## Performance Optimization

### Database Optimization

```javascript
// Create indexes
db.companies.createIndex({ email: 1 });
db.devices.createIndex({ companyId: 1, status: 1 });
db.messages.createIndex({ companyId: 1, createdAt: -1 });

// Enable compression
mongod --networkMessageCompressors snappy

// Connection pooling
MONGODB_POOL_SIZE=20
```

### Redis Optimization

```bash
# Memory management
maxmemory 2gb
maxmemory-policy allkeys-lru

# AOF persistence (for durability)
appendonly yes
appendfsync everysec

# Monitor
redis-cli INFO stats
```

### Application Optimization

```javascript
// Enable compression middleware
app.use(compression());

// Cache headers
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'public, max-age=3600');
  next();
});

// Connection pooling
mongoose.connect(uri, {
  maxPoolSize: 20,
  minPoolSize: 5
});
```

## Security Hardening

### Environment Variables

- Never commit `.env` to version control
- Rotate secrets quarterly
- Use AWS Secrets Manager or similar

### API Security

- [ ] Rate limiting configured
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (Mongoose handles this)
- [ ] XSS protection (helmet enabled)
- [ ] CORS properly scoped
- [ ] HTTPS enforced
- [ ] Sensitive data not logged

### Database Security

- [ ] MongoDB authentication enabled
- [ ] Network access restricted to app servers
- [ ] Data encryption at rest enabled
- [ ] Data encryption in transit (TLS)
- [ ] Regular security audits

### WhatsApp Sessions

- [ ] Sessions stored on encrypted volume
- [ ] Sessions backed up regularly
- [ ] Access logs maintained
- [ ] Old sessions pruned

## Rollback Procedure

If issues occur post-deployment:

```bash
# Check PM2 logs for errors
pm2 logs

# If critical issues found:

# 1. Restore backup
rm -rf /app/src
mv /app/src.backup.TIMESTAMP /app/src

# 2. Reinstall dependencies
npm install --production

# 3. Restore env file
cp /app/.env.backup .env

# 4. Restart services
pm2 restart all

# 5. Verify
curl http://localhost:5000/health
```

## CI/CD Pipeline

### GitHub Actions Example

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Install dependencies
        run: npm install

      - name: Run linter
        run: npm run lint

      - name: Run tests
        run: npm run test

      - name: Deploy to staging
        run: |
          scp -r src/ package.json staging-server:/app/
          ssh staging-server "cd /app && npm install --production && pm2 reload all"

      - name: Run smoke tests
        run: bash scripts/smoke-tests.sh

      - name: Deploy to production
        if: success()
        run: |
          scp -r src/ package.json prod-server:/app/
          ssh prod-server "cd /app && npm install --production && pm2 reload all"
```

## Maintenance

### Regular Tasks

- **Daily**: Check logs for errors
- **Weekly**: Review monitoring dashboards
- **Monthly**: Rotate secrets, apply security patches
- **Quarterly**: Run penetration testing
- **Yearly**: Major version updates

### Version Updates

```bash
# Test in staging first
npm update
npm audit fix

# Test thoroughly
npm run test

# Deploy to production
# Follow deployment steps above
```

## Support and Troubleshooting

### Common Issues

1. **WhatsApp Client Disconnection**
   - Check internet connectivity
   - Verify WhatsApp account not logged in elsewhere
   - Check logs for auth failure
   - Rebuild sessions if corrupted

2. **Message Queue Backing Up**
   - Monitor queue depth
   - Check worker process status
   - Verify device connectivity
   - Increase worker instances if needed

3. **Database Performance**
   - Check slow query logs
   - Verify indexes exist
   - Monitor connection pool
   - Consider sharding if > 100GB

4. **Memory Leaks**
   - Monitor heap usage
   - Check WhatsApp client lifecycle
   - Enable heap snapshots
   - Consider node-heapdump for debugging

## Contact

For deployment issues or questions, contact the DevOps team.
