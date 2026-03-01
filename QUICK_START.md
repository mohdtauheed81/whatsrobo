# WhatsApp SaaS Platform - Quick Start Guide

## 🚀 5-Minute Setup

### Prerequisites
- Node.js v22+
- MongoDB Atlas account (connection string in .env)
- WhatsApp account (on your phone)
- Browser with JavaScript enabled

### Start Servers
```bash
# Terminal 1 - Backend
cd F:/git_repo/SaaSWhatsapp
npm start

# Terminal 2 - Frontend
cd F:/git_repo/SaaSWhatsapp/client
npm run dev
```

### Access the System
- **Frontend**: http://localhost:8081
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/health

---

## Step-by-Step: Connect WhatsApp

### 1️⃣ Register Your Business Account
```
URL: http://localhost:8081
- Click "Sign Up"
- Fill in: Company Name, Email, Password
- Click "Register"
```

### 2️⃣ Go to Devices Dashboard
```
URL: http://localhost:8081/dashboard/devices
- You'll see "No devices yet" message
- Click "Add Device" button
- Enter device name: "My WhatsApp Device"
- Click "Create"
```

### 3️⃣ Connect WhatsApp with QR Code
```
On your browser:
- Click "Connect" button on the device
- Wait for QR code to appear
- A popup/section will show the QR code

On your phone:
- Open WhatsApp
- Go to Settings → Linked Devices
- Click "Link a Device"
- Point phone camera at QR code on screen
- Wait for connection to complete
```

### 4️⃣ Send Your First Message
```
Once device shows "Connected":
- Look for "Send Message" button/form
- Enter recipient phone: +1234567890
- Enter message: "Hello from WhatsApp SaaS!"
- Click "Send"

Message appears on WhatsApp within seconds!
```

---

## ✅ All Features Working

✅ Authentication - JWT + Registration/Login
✅ Device Management - Create, Connect, Delete
✅ QR Scanner - Real-time via Socket.IO
✅ Message Sending - Send through connected devices
✅ Device Status - Real-time updates (connecting, qr_pending, connected)
✅ API Endpoints - All tested and working
✅ Frontend UI - React dashboard
✅ Real-time Updates - Socket.IO events

---

## 🔌 API Endpoints

**Device Endpoints:**
- `GET /api/devices` - List devices
- `POST /api/devices` - Create device
- `POST /api/devices/:id/connect` - Trigger QR code
- `POST /api/devices/:id/send-message` - Send message
- `DELETE /api/devices/:id` - Delete device

**Auth Endpoints:**
- `POST /api/auth/register` - Register
- `POST /api/auth/login` - Login
- `GET /api/auth/profile` - Get profile

**Health:**
- `GET /health` - System status

---

See TESTING_GUIDE.md for detailed instructions!
