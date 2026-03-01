# Frontend Startup Guide

## 🚀 Quick Start (3 Options)

### Option 1: Batch File (Easiest - Windows)
Double-click this file:
```
F:\git_repo\SaaSWhatsapp\START_FRONTEND.bat
```

### Option 2: Manual Terminal Command
```bash
cd F:\git_repo\SaaSWhatsapp\client
npm run dev
```

### Option 3: Using npm from project root
```bash
cd F:\git_repo\SaaSWhatsapp
npm --prefix client run dev
```

---

## ✅ Successful Startup Output

You should see:

```
  VITE v5.1.0  ready in 450 ms

  ➜  Local:   http://localhost:3000/
  ➜  press h to show help
```

Then:
1. **Open Browser**: http://localhost:3000
2. **You'll see**: WhatsApp SaaS Login Page
3. **Click "Register"** to create a test account

---

## 🔍 Troubleshooting

### Problem 1: "npm: command not found"

**Solution:** Node.js not installed or not in PATH

```bash
# Check if Node is installed
node --version

# Should show: v16.x.x or higher

# If not installed:
# Download from https://nodejs.org
# Install with default settings
# Restart terminal
```

### Problem 2: "EADDRINUSE: address already in use :::3000"

**Solution:** Port 3000 is already in use

**Option A: Kill the process**
```bash
# Find what's using port 3000
netstat -ano | findstr :3000

# Kill it (replace PID with the process ID)
taskkill /PID 1234 /F
```

**Option B: Use different port**

Edit `client/vite.config.js`:
```javascript
server: {
  port: 3001,  // Change from 3000 to 3001
  ...
}
```

Then run:
```bash
npm run dev
# Will start on http://localhost:3001
```

### Problem 3: "Cannot find module 'react'"

**Solution:** Dependencies not installed

```bash
cd client
npm install

# Wait for it to complete, then:
npm run dev
```

### Problem 4: "No webpage was found (404)"

**Solutions to try (in order):**

1. **Check if server is running**
   - Terminal should show: "➜ Local: http://localhost:3000/"
   - If not, run: `npm run dev`

2. **Clear browser cache**
   - Press: `Ctrl + Shift + Delete`
   - Select "All time"
   - Click "Clear data"

3. **Try hard refresh**
   - Press: `Ctrl + Shift + R` (not just F5)

4. **Check browser console**
   - Press: `F12` to open Developer Tools
   - Go to "Console" tab
   - Look for red errors
   - Screenshot and share if needed

5. **Check if backend API is running**
   - Open new terminal
   - Run: `curl http://localhost:5000/health`
   - Should see: `{"status":"OK",...}`
   - If not, start the backend API first

### Problem 5: "WebSocket connection failed"

**Solution:** Backend API not running

Make sure your backend API is running on port 5000:

```bash
# New terminal
cd F:\git_repo\SaaSWhatsapp
npm run dev

# Should show: "Server running on port 5000"
```

Frontend needs the API to work properly.

### Problem 6: Blank white page after login

**Solutions:**

1. Check browser console (F12) for JavaScript errors
2. Make sure API is running: `curl http://localhost:5000/health`
3. Check network tab in DevTools to see API calls
4. Clear localStorage:
   ```javascript
   // In browser console:
   localStorage.clear()
   // Then refresh the page
   ```

---

## 📋 Startup Checklist

Before starting frontend, verify:

- [ ] Backend API running on port 5000
  ```bash
  curl http://localhost:5000/health
  # Should return: {"status":"OK",...}
  ```

- [ ] MongoDB connected
  ```bash
  node test-db-connection.js
  # Should show: ✅ Connected
  ```

- [ ] Redis running
  ```bash
  redis-cli ping
  # Should return: PONG
  ```

- [ ] Node.js installed
  ```bash
  node --version
  # Should show: v16+
  ```

- [ ] Dependencies installed
  ```bash
  cd client
  npm list react
  # Should show: whatsapp-saas-client@1.0.0 with react
  ```

---

## 🌐 Accessing the App

### URLs

| URL | Purpose |
|-----|---------|
| http://localhost:3000 | Frontend login page |
| http://localhost:3000/dashboard | User dashboard (after login) |
| http://localhost:3000/admin | Admin panel (if admin) |
| http://localhost:5000/health | API health check |

### Test Account

After clicking "Register":
- **Email:** test@example.com
- **Password:** Test123456!
- **Company:** Test Company
- **Phone:** +1234567890 (optional)

---

## 🛠️ Development Commands

```bash
cd client

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Check dependencies
npm list

# Update dependencies
npm update
```

---

## 📁 Important Files

- **Entry:** `client/src/index.jsx`
- **Main App:** `client/src/App.jsx`
- **Config:** `client/vite.config.js`
- **Package:** `client/package.json`
- **Environment:** `client/.env` (create if needed)

---

## 🔗 Environment Setup

Create `client/.env` if it doesn't exist:

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

If you want to use a different API:

```env
REACT_APP_API_URL=http://your-api-url/api
REACT_APP_SOCKET_URL=http://your-api-url
```

---

## ⚡ Performance Tips

1. **First load is slow** (Vite bundling)
   - Wait 5-10 seconds on first page load
   - Subsequent loads are instant

2. **Enable HMR (Hot Module Replacement)**
   - Changes auto-reload without refresh
   - Just save files and see changes

3. **Clear cache if issues**
   ```bash
   # Delete node_modules and reinstall
   cd client
   rm -r node_modules package-lock.json
   npm install
   npm run dev
   ```

---

## 📞 Still Having Issues?

1. **Check logs:**
   - Browser console: `F12`
   - Terminal output where `npm run dev` is running

2. **Common errors and fixes:**
   - "Cannot GET /" → Server not running
   - "504 Bad Gateway" → Backend not running
   - "WebSocket error" → Backend not running
   - "Module not found" → Run `npm install`

3. **Restart everything:**
   ```bash
   # Kill all node processes
   taskkill /F /IM node.exe

   # Restart terminals:
   # Terminal 1: redis-server
   # Terminal 2: npm run dev (backend)
   # Terminal 3: node src/services/worker/MessageWorker.js
   # Terminal 4: cd client && npm run dev
   ```

---

## ✅ Success Indicators

When everything is working:

1. ✅ Browser opens to http://localhost:3000
2. ✅ Login page loads without errors
3. ✅ Can register new company
4. ✅ Dashboard loads after login
5. ✅ Real-time updates working (WebSocket)
6. ✅ API calls completing (Network tab shows 200 status)
7. ✅ No console errors (F12 console clean)

If you see all these, **you're good to go!** 🎉

---

## 🚀 Next Steps

1. Register account
2. Add WhatsApp device
3. Scan QR code
4. Send test message
5. Explore features

Enjoy your WhatsApp SaaS platform! 🎊
