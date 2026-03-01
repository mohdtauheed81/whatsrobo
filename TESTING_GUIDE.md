# WhatsApp SaaS Platform - Complete Testing Guide

## System Overview
- **Backend API**: http://localhost:5000
- **Frontend UI**: http://localhost:8081
- **Database**: MongoDB Atlas (Cloud)
- **Real-time**: Socket.IO for QR codes and messaging

---

## Part 1: Setup & Registration

### Step 1: Register a New Company
1. Open http://localhost:8081 in your browser
2. Click "Sign Up" / "Register"
3. Fill in the form:
   - Company Name: `My WhatsApp Business`
   - Email: `mycompany@example.com`
   - Password: `SecurePass123!`
   - Confirm Password: `SecurePass123!`
4. Click "Register"
5. You'll receive a JWT token and be logged in

### Step 2: Login (If Not Already Logged In)
1. Go to http://localhost:8081/login
2. Enter your email and password
3. Click "Login"

---

## Part 2: Device Management & QR Scanner

### Step 3: Create Your First WhatsApp Device
1. Navigate to **Dashboard → Devices** (http://localhost:8081/dashboard/devices)
2. Click **"Add Device"** button
3. Enter a device name: `My WhatsApp Device`
4. Click **"Create"**
5. Your device appears in the list with status: **"disconnected"**

### Step 4: Connect Device with QR Scanner
1. Click **"Connect"** button on your device
2. A QR code will appear below the device card
3. On your phone with WhatsApp installed:
   - Open WhatsApp
   - Go to **Settings → Linked Devices** (or **Settings → WhatsApp Web**)
   - Click **"Link a Device"** or **"Link a Device"**
   - **Point your phone camera at the QR code** displayed on the screen
4. WhatsApp will scan the QR code and verify
5. The device status will change to **"connected"** and show your WhatsApp phone number

---

## Part 3: Sending Messages

### Step 5: Send a Test Message
1. Click on your **Connected Device** to view details
2. Look for the **"Send Message"** option (or scroll down to message form)
3. Fill in:
   - **Recipient Number**: `+1234567890` (or your phone number)
   - **Message**: `Hello from WhatsApp SaaS!`
4. Click **"Send"**
5. The message will appear in WhatsApp on your phone in seconds

### Using the API Directly (If Frontend Not Ready)
```bash
# Get your token first (from registration/login)
TOKEN="your_jwt_token_here"
DEVICE_ID="device_id_from_step_3"
PHONE="+1234567890"

# Send a message
curl -X POST http://localhost:5000/api/devices/$DEVICE_ID/send-message \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "'$PHONE'",
    "message": "Hello from API!"
  }'
```

---

## Part 4: Monitoring & Status

### View Device Status
```bash
TOKEN="your_jwt_token_here"

# List all devices
curl http://localhost:5000/api/devices \
  -H "Authorization: Bearer $TOKEN"

# Get specific device
curl http://localhost:5000/api/devices/$DEVICE_ID \
  -H "Authorization: Bearer $TOKEN"
```

### System Health Check
```bash
curl http://localhost:5000/health
```

Expected output:
```json
{
  "status": "OK",
  "mongodb": "connected",
  "redis": "unavailable",
  "whatsappClients": {
    "total": 1,
    "connected": 1,
    "disconnected": 0
  }
}
```

---

## Part 5: Advanced Features

### 5.1 Auto-Reply Messages
*(Coming Soon - Once chat system is complete)*

### 5.2 Bulk Messaging
1. Go to **Dashboard → Messages → Bulk Send**
2. Upload CSV file with format:
   ```
   Phone Number,Message
   +1234567890,Hello
   +1234567891,Hi there
   ```
3. Messages will be queued and sent respecting rate limits

### 5.3 Incoming Messages & Chat
1. When someone messages your connected WhatsApp device:
   - Message appears in **Dashboard → Chats**
   - Real-time update via Socket.IO
   - You can reply directly

---

## Common Issues & Troubleshooting

### Issue 1: QR Code Not Appearing
**Symptom**: Click "Connect" but no QR code shows
- **Solution**: Check browser console (F12) for errors
- **Check**: Backend logs show `QR code received`
- **Try**: Refresh the page (F5)
- **Check**: Socket.IO connection: Open DevTools → Network → WS (should show `device` connection)

### Issue 2: Device Stuck on "qr_pending"
**Symptom**: QR code appears but device doesn't connect after scanning
- **Solution**: Try refreshing the page and scanning QR again
- **Try**: Delete device and create new one
- **Note**: QR code expires after 60 seconds

### Issue 3: "Device Not Connected" When Sending Message
**Symptom**: Send message fails with device not connected error
- **Solution**: Make sure device shows "connected" status in green
- **Try**: Reconnect device (click Connect again)
- **Note**: WhatsApp must be online on the phone

### Issue 4: Backend Port 5000 Already in Use
**Symptom**: Error "address already in use :::5000"
```bash
# Kill existing process
powershell -Command "Stop-Process -Name node -Force"
# Then restart backend
cd F:/git_repo/SaaSWhatsapp && npm start
```

### Issue 5: Frontend Port 8081 Not Loading
**Symptom**: http://localhost:8081 shows blank page
- **Check**: Frontend server is running (npm run dev)
- **Try**: Hard refresh (Ctrl+Shift+R)
- **Check**: Browser console for errors
- **Try**: Clear browser cache and cookies

---

## API Endpoints Reference

### Authentication
- `POST /api/auth/register` - Register new company
- `POST /api/auth/login` - Login and get token
- `GET /api/auth/profile` - Get company profile (requires auth)

### Devices
- `GET /api/devices` - List all devices (requires auth)
- `POST /api/devices` - Create new device (requires auth)
- `GET /api/devices/:deviceId` - Get device details (requires auth)
- `POST /api/devices/:deviceId/connect` - Initiate QR connection (requires auth)
- `POST /api/devices/:deviceId/send-message` - Send message (requires auth)
- `DELETE /api/devices/:deviceId` - Delete device (requires auth)

### Messages
- `GET /api/messages` - List messages (requires auth)
- `POST /api/messages/send` - Send message via queue (requires auth)

### Health
- `GET /health` - System health check (no auth required)

---

## Testing with cURL

### Complete Flow Example
```bash
#!/bin/bash

# 1. Register
RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Test Company",
    "email": "test'$(date +%s)'@example.com",
    "password": "TestPass123!",
    "confirmPassword": "TestPass123!"
  }')

TOKEN=$(echo $RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
echo "✅ Registered. Token: $TOKEN"

# 2. Create device
DEVICE_RESPONSE=$(curl -s -X POST http://localhost:5000/api/devices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Device"}')

DEVICE_ID=$(echo $DEVICE_RESPONSE | grep -o '"_id":"[^"]*' | cut -d'"' -f4)
echo "✅ Device created. ID: $DEVICE_ID"

# 3. Initiate connection
curl -s -X POST http://localhost:5000/api/devices/$DEVICE_ID/connect \
  -H "Authorization: Bearer $TOKEN" | jq

echo "✅ QR Code generation initiated. Check http://localhost:8081/dashboard/devices"
```

---

## Next Steps

1. ✅ Test device registration and QR scanning
2. ✅ Verify WhatsApp connection
3. ✅ Send test messages
4. ⏳ Setup auto-reply rules
5. ⏳ Implement bulk messaging
6. ⏳ Configure webhook for incoming messages

---

## Support

For issues or questions:
1. Check the logs:
   - Backend: `tail -f backend.log`
   - Frontend: `tail -f frontend.log`
2. Check backend error logs for detailed errors
3. Open browser console (F12) for frontend errors
