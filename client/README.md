# WhatsApp SaaS Platform - Frontend

React-based frontend for the WhatsApp SaaS Platform with user dashboard and admin panel.

## Features

### User Dashboard
- **Device Management** - Add, manage, and monitor WhatsApp devices with QR code authentication
- **Messages** - Send individual messages or bulk messages via Excel upload
- **Chat Inbox** - View incoming messages and conversation history
- **Subscription** - View available plans and current subscription details
- **Invoices** - Download billing invoices

### Admin Dashboard
- **Overview** - Key metrics and statistics
- **Company Management** - Manage companies and their subscriptions
- **Plan Management** - Create and modify subscription plans
- **Analytics** - Message statistics and revenue tracking

## Tech Stack

- **React 18** - UI framework
- **Redux Toolkit** - State management
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **Socket.IO Client** - Real-time communication
- **Vite** - Build tool
- **Lucide React** - Icon library

## Installation

### Prerequisites
- Node.js >= 16
- NPM or Yarn

### Setup

1. **Install dependencies**
```bash
cd client
npm install
```

2. **Configure environment**
```bash
cp .env.example .env
```

Edit `.env` with your backend URLs:
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

3. **Start development server**
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Project Structure

```
client/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   └── ProtectedRoute.jsx
│   ├── pages/
│   │   ├── LoginPage.jsx
│   │   ├── RegisterPage.jsx
│   │   ├── DashboardLayout.jsx
│   │   ├── DevicesPage.jsx
│   │   ├── MessagesPage.jsx
│   │   ├── ChatsPage.jsx
│   │   ├── SubscriptionPage.jsx
│   │   ├── InvoicesPage.jsx
│   │   ├── AdminDashboard.jsx
│   │   ├── AdminCompanies.jsx
│   │   └── AdminPlans.jsx
│   ├── redux/
│   │   ├── store.js
│   │   ├── authSlice.js
│   │   ├── devicesSlice.js
│   │   ├── messagesSlice.js
│   │   └── chatsSlice.js
│   ├── services/
│   │   ├── api.js
│   │   └── socket.js
│   ├── styles/
│   │   ├── globals.css
│   │   ├── auth.css
│   │   ├── dashboard.css
│   │   ├── devices.css
│   │   ├── messages.css
│   │   ├── chats.css
│   │   ├── subscription.css
│   │   ├── invoices.css
│   │   └── admin.css
│   ├── App.jsx
│   └── index.jsx
├── vite.config.js
├── package.json
└── .env.example
```

## API Integration

The frontend connects to the backend API at `/api` endpoint. Ensure your backend is running before starting the frontend.

### Authentication
- Login/Register handled via JWT tokens
- Tokens stored in localStorage
- Automatic redirect to login on 401 response

### Real-Time Updates
- Socket.IO namespaces: `/device` and `/chat`
- Real-time QR code display
- Live message and status updates
- Auto-reconnect on disconnection

## Building for Production

```bash
# Build optimized bundle
npm run build

# Preview production build
npm run preview
```

Output directory: `dist/`

## Features Guide

### Device Management
1. Navigate to Devices page
2. Click "Add Device"
3. Enter device name
4. Scan QR code with WhatsApp
5. Device status updates to "connected"

### Send Messages
1. Go to Messages page
2. Select connected device
3. Enter phone number and message
4. Click Send

### Bulk Messaging
1. Go to Messages → Bulk Send
2. Prepare Excel file with columns: Phone Number | Message | Name
3. Upload file
4. Monitor progress in real-time

### View Chats
1. Go to Chats page
2. Click chat to view conversation
3. View message history
4. Archive or delete if needed

### Manage Subscription
1. Go to Subscription page
2. View current plan details
3. See usage statistics
4. Upgrade to higher tier if needed

### Admin Functions
1. Access /admin/dashboard
2. View platform statistics
3. Manage companies in Companies tab
4. Edit subscription plans in Plans tab

## Styling

The app uses a custom CSS design with:
- Color scheme: Green (#075e54) primary, Light (#25d366) secondary
- Responsive grid layouts
- Mobile-friendly components
- Consistent component styling via CSS variables

## Environment Variables

```
REACT_APP_API_URL    - Backend API base URL
REACT_APP_SOCKET_URL - WebSocket server URL
```

## Development

### Redux State Structure
```
auth: {
  isAuthenticated,
  user,
  isAdmin,
  loading,
  error
}

devices: {
  devices,
  loading,
  error,
  selectedDevice
}

messages: {
  messages,
  bulkJobs,
  loading,
  error,
  pagination
}

chats: {
  chats,
  selectedChat,
  chatMessages,
  loading,
  error,
  unreadCount
}
```

## Common Issues

1. **CORS errors**
   - Ensure backend CORS is configured
   - Check REACT_APP_API_URL matches backend

2. **WebSocket connection failed**
   - Verify Socket.IO running on backend
   - Check firewall/proxy settings

3. **API 404 errors**
   - Ensure backend API routes are implemented
   - Check endpoint URLs in API service

## Deployment

For production deployment:

1. Set environment variables for production API URLs
2. Build the optimized bundle
3. Deploy to static hosting (Vercel, Netlify, etc.)
4. Configure CORS on backend for production domain

## License

MIT

## Support

For issues or questions, refer to the main project README.
