# Redis Setup Guide for Windows

Redis is required for the message queue system. Choose one of these options:

## Option 1: Windows Subsystem for Linux (WSL) - RECOMMENDED ✅

### Step 1: Install WSL2
```bash
# Run in PowerShell as Administrator
wsl --install -d Ubuntu

# This will install Ubuntu. Restart when prompted.
```

### Step 2: Install Redis in Ubuntu
```bash
# Inside WSL Ubuntu terminal
sudo apt update
sudo apt install redis-server

# Start Redis
redis-server
```

### Step 3: Connect from Windows
Redis in WSL is accessible at `localhost:6379` from Windows applications.

---

## Option 2: Docker Desktop - EASY ✅

### Step 1: Install Docker Desktop
- Download: https://www.docker.com/products/docker-desktop
- Install and start Docker

### Step 2: Run Redis Container
```bash
docker run -d -p 6379:6379 --name redis redis:latest
```

### Step 3: Verify
```bash
docker ps
# You should see redis container running
```

---

## Option 3: Using Windows Redis Port (GitHub Releases)

### Step 1: Download Redis for Windows
1. Go to: https://github.com/microsoftarchive/redis/releases
2. Download: `Redis-x64-3.0.504.msi` (or latest)
3. Install with default settings

### Step 2: Start Redis Service
```bash
# Option A: As Windows Service (auto-starts)
redis-server --service-install

# Option B: Manual start
redis-server
```

### Step 3: Verify Connection
```bash
redis-cli ping
# Should return: PONG
```

---

## Option 4: Using Redis Cloud (Hosted) - NO SETUP 🚀

### Step 1: Create Free Account
1. Go to: https://redis.com/try-free/
2. Sign up (free tier available)
3. Create a database

### Step 2: Get Connection String
Copy your Redis connection URL from the dashboard (looks like: `redis://:password@host:port`)

### Step 3: Update .env
```env
REDIS_URL=redis://:your_password@your-cloud-host:6379
```

### Step 4: Done!
No local installation needed.

---

## Quick Verification

After starting Redis with any method above, test it:

```bash
# Terminal 1: Start Redis
redis-server

# Terminal 2: Test connection
redis-cli ping
# Expected output: PONG
```

---

## For Development: Option 2 (Docker) is Easiest

1. Install Docker Desktop
2. Run: `docker run -d -p 6379:6379 redis:latest`
3. Done - Redis runs in background automatically

---

## Troubleshooting

### "Cannot connect to Redis"
1. Verify Redis is running: `redis-cli ping`
2. Check port is 6379: `netstat -ano | findstr :6379`
3. Check REDIS_URL in .env file

### "Address already in use"
```bash
# Find what's using port 6379
netstat -ano | findstr :6379

# Kill the process (replace PID)
taskkill /PID 1234 /F

# Or use different port in .env
REDIS_URL=redis://localhost:6380
```

### WSL Performance
If WSL Redis seems slow:
- Use Docker instead
- Or use online Redis cloud service

---

## Next Steps

After setting up Redis, start services in 4 terminals:

**Terminal 1:**
```bash
redis-server
# Or if using Docker: docker start redis
```

**Terminal 2 (F:\git_repo\SaaSWhatsapp):**
```bash
npm run dev
```

**Terminal 3 (F:\git_repo\SaaSWhatsapp):**
```bash
node src/services/worker/MessageWorker.js
```

**Terminal 4 (F:\git_repo\SaaSWhatsapp\client):**
```bash
npm run dev
```

Then open: http://localhost:3000
