# WhatsApp SaaS Platform - Complete Setup Instructions

## Prerequisites Checklist ✅

- [ ] Node.js v16+ installed: `node --version`
- [ ] npm installed: `npm --version`
- [ ] MongoDB Atlas configured (already done ✅)
- [ ] Project files downloaded

---

## Step 1: Verify Configuration (5 minutes)

### 1.1 Run Diagnostic
```bash
cd F:\git_repo\SaaSWhatsapp
node DIAGNOSE_AND_FIX.js
```

You should see:
- ✅ All backend files found
- ✅ All frontend files found
- ✅ All environment variables set
- ⚠️ Backend API not running (normal at this point)

### 1.2 Test MongoDB Connection
```bash
node test-db-connection.js
```

Expected output:
```
✅ MongoDB Atlas connection successful!
Database: whatsapp_saas
Host: cluster0.jmfjzwx.mongodb.net
```

---

## Step 2: Set Up Redis (10-15 minutes)

Redis is required for the message queue system. Choose ONE option:

### Option A: Docker (EASIEST - Recommended) 🐳

1. Install Docker Desktop: https://www.docker.com/products/docker-desktop
2. Start Docker Desktop
3. In terminal, run:
   ```bash
   docker run -d -p 6379:6379 --name redis redis:latest
   ```
4. Verify:
   ```bash
   docker ps
   # You should see redis container running
   ```

**Advantages:** Works perfectly, no system installation needed, easy cleanup
**Time:** 5 minutes (just download and run)

---

### Option B: Windows Subsystem for Linux (WSL) - Advanced

1. Install WSL2 (PowerShell as Admin):
   ```powershell
   wsl --install -d Ubuntu
   # Restart when prompted
   ```

2. Inside Ubuntu terminal:
   ```bash
   sudo apt update
   sudo apt install redis-server
   ```

3. Start Redis:
   ```bash
   redis-server
   ```

**Advantages:** Lightweight, native Linux experience
**Time:** 10-15 minutes

---

### Option C: Online Redis Cloud (NO SETUP)

1. Go to: https://redis.com/try-free/
2. Create free account
3. Create database
4. Copy connection URL
5. Update `.env`:
   ```env
   REDIS_URL=redis://:your_password@your-host:6379
   ```

**Advantages:** No local installation
**Disadvantages:** Internet dependent

---

**For first-time setup, use Option A (Docker) - it's the fastest and most reliable.**

---

## Step 3: Start All Services (5 minutes)

You need 4 terminal windows open simultaneously.

### Quick Option: Use Batch Script (Windows Only)
```bash
cd F:\git_repo\SaaSWhatsapp
START_ALL.bat
```

This will open 4 terminals automatically. Go to Step 4.

---

### Manual Option: Open Terminals One by One

#### Terminal 1: Start Redis

**If using Docker:**
```bash
docker run -d -p 6379:6379 --name redis redis:latest
docker logs -f redis
```

**If using WSL/Windows Redis:**
```bash
redis-server
```

Expected output:
```
Ready to accept connections
```

---

#### Terminal 2: Start Backend API

```bash
cd F:\git_repo\SaaSWhatsapp
npm run dev
```

Expected output:
```
[nodemon] starting `node src/server.js`
[dotenv@17.3.1] injecting env (25) from .env
[INFO]: Socket.IO namespaces configured successfully
[INFO]: MongoDB connected successfully
[INFO]: Server running on port 5000
```

**If you see "Redis error"** - that's normal, Terminal 1 will establish connection.

---

#### Terminal 3: Start Message Worker

```bash
cd F:\git_repo\SaaSWhatsapp
node src/services/worker/MessageWorker.js
```

Expected output:
```
[INFO]: Message Worker started
[INFO]: Listening for queued messages...
```

---

#### Terminal 4: Start Frontend

```bash
cd F:\git_repo\SaaSWhatsapp\client
npm run dev
```

Expected output:
```
VITE v5.x.x ready in XXX ms

➜  Local:   http://localhost:3000/
➜  press h to show help
```

---

## Step 4: Verify Everything Works ✅

### 4.1 Check Health Endpoint

In a 5th terminal:
```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "status": "OK",
  "mongodb": "connected",
  "redis": "connected",
  "whatsappClients": {
    "total": 0,
    "connected": 0,
    "disconnected": 0
  },
  "memory": {...}
}
```

### 4.2 Open Frontend in Browser

1. Open: **http://localhost:3000**
2. You should see the **WhatsApp SaaS Login Page**
3. No errors in browser console (Press F12)

---

## Step 5: Test the Application

### 5.1 Register a Test Account

1. Click **"Register"** button
2. Fill in:
   - **Company Name:** Test Company
   - **Email:** test@example.com
   - **Password:** Test123456!
   - **Phone:** +1234567890 (optional)
3. Click **"Register"**

Expected: You should be redirected to **Dashboard** ✅

### 5.2 Add a WhatsApp Device

1. Go to **"Devices"** page
2. Click **"+ Add Device"**
3. Enter name: **"My WhatsApp"**
4. Click **"Create"**
5. A **QR code** should appear
6. Scan with WhatsApp on your phone
7. Wait for status to change to **"connected"** (30-60 seconds)

Expected: Device status changes from "connecting" → "connected" ✅

### 5.3 Send a Test Message

1. Go to **"Messages"** page
2. Select the **connected device** from dropdown
3. Enter phone number (with +): **+919876543210**
4. Type message: **"Hello from WhatsApp SaaS!"**
5. Click **"Send Message"**

Expected: Message status updates in real-time ✅

---

## Troubleshooting

### Issue 1: "Cannot GET /" (Port 3000 shows error)

**Solution:**
- Verify Terminal 4 shows: `ready in XXX ms`
- Check browser console (F12) for errors
- Try hard refresh: Ctrl+Shift+R (not F5)
- Check that frontend actually started (look for Vite messages)

---

### Issue 2: "Socket hang up" or "ECONNREFUSED 5000"

**Solution:**
- Verify Terminal 2 shows: `Server running on port 5000`
- Check Terminal 2 for errors
- Verify .env file has `PORT=5000`
- Run: `netstat -ano | findstr :5000` to check port usage

---

### Issue 3: Redis errors in Terminal 2

**Solution:**
- Start Terminal 1 with Redis (Docker or redis-server)
- Verify: `redis-cli ping` returns `PONG`
- Check .env: `REDIS_URL=redis://localhost:6379`
- If using cloud Redis, update REDIS_URL with your credentials

---

### Issue 4: "Server listening on port 5000" but not responding

**Solution:**
1. Check MongoDB connection: `node test-db-connection.js`
2. Check Redis: `redis-cli ping`
3. Check logs in Terminal 2 for specific errors
4. Restart backend: Ctrl+C in Terminal 2, then `npm run dev` again

---

### Issue 5: "Cannot find module 'X'"

**Solution:**
```bash
# Reinstall dependencies
cd F:\git_repo\SaaSWhatsapp
rm -r node_modules package-lock.json
npm install

# Frontend
cd client
rm -r node_modules package-lock.json
npm install
```

---

### Issue 6: Device QR code not showing

**Solution:**
1. Check browser console (F12) for JavaScript errors
2. Check Terminal 2 logs for WhatsApp errors
3. Verify Socket.IO connected (DevTools → Network)
4. Try refreshing page
5. QR expires in 60 seconds - scan quickly

---

### Issue 7: Message not sending

**Solution:**
- [ ] Device status is "connected"
- [ ] Phone number has + and country code
- [ ] Message text is not empty
- [ ] Terminal 3 (Message Worker) is running
- [ ] Terminal 1 (Redis) is running
- [ ] Check Terminal 3 logs for errors

---

## Complete System Status Checklist

When fully working, you should have:

```
Terminal 1: Redis
├─ Status: "Ready to accept connections"
└─ Command: redis-server OR docker logs -f redis

Terminal 2: Backend API
├─ Status: "Server running on port 5000"
├─ MongoDB: connected
├─ Redis: connected
└─ Socket.IO: ready

Terminal 3: Message Worker
├─ Status: "Message Worker started"
├─ Redis: connected
└─ Listening: for jobs

Terminal 4: Frontend (Vite)
├─ Status: "ready in XXX ms"
├─ Local: http://localhost:3000
└─ Browser: Page loads

Browser: http://localhost:3000
├─ Login page displays
├─ Console clean (F12)
├─ Can register account
├─ Can add device
├─ QR code displays
└─ Message sending works
```

---

## Next Steps

After everything is working:

### 1. Seed Subscription Plans (Optional)
```bash
npm run seed
```

This creates test plans: Starter, Professional, Enterprise

### 2. Explore Features
- Create multiple devices
- Send bulk messages (upload Excel)
- View chat inbox
- Check auto-reply rules
- View invoices

### 3. Admin Dashboard
Access: `http://localhost:3000/admin` (if admin user)

Shows:
- Total companies
- Total messages sent
- Active devices
- Revenue

---

## Database Collections Created

After setup and usage, you'll have in MongoDB:

```
whatsapp_saas database:
├── companies          - Tenant accounts
├── devices            - WhatsApp devices
├── messages           - Message history
├── chats              - Chat conversations
├── chatmessages       - Individual chat messages
├── subscriptionplans  - Billing plans
├── invoices           - Billing records
├── autoreply rules    - Auto-response rules
├── bulkmessages       - Bulk send batches
└── messagequeues      - Queue state
```

View in MongoDB Atlas:
1. Go to: https://cloud.mongodb.com
2. Login → Cluster0 → Collections
3. Select "whatsapp_saas" database

---

## 🎉 Success!

If you can see:
1. ✅ Login page at http://localhost:3000
2. ✅ Register new account
3. ✅ Device page shows "Add Device"
4. ✅ QR code scans successfully
5. ✅ Message sends successfully

**You're done! The platform is fully operational.** 🚀

---

## Getting Help

- **Check logs:** Look at terminal output for errors
- **Database issue:** Run `node test-db-connection.js`
- **Redis issue:** Run `redis-cli ping`
- **Port conflict:** `netstat -ano | findstr :5000` (or :3000, :6379)
- **Module missing:** Delete node_modules and run `npm install` again

---

## Quick Reference Commands

```bash
# Diagnostic
node DIAGNOSE_AND_FIX.js

# Test MongoDB
node test-db-connection.js

# Backend
npm run dev

# Message Worker
node src/services/worker/MessageWorker.js

# Frontend
cd client && npm run dev

# Seed Plans
npm run seed

# Health Check
curl http://localhost:5000/health

# Redis Test
redis-cli ping
```

---

Enjoy your WhatsApp SaaS platform! 🎊
