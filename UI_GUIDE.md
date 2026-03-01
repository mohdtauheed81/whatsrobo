# WhatsApp SaaS Platform - UI/Frontend Guide

## Complete Frontend Implementation

A fully-featured React application with user dashboard and admin panel, connected to the backend API with real-time Socket.IO integration.

## 📁 Frontend Structure

```
client/
├── public/index.html              # HTML entry point
├── src/
│   ├── index.jsx                  # React entry point
│   ├── App.jsx                    # Main routing component
│   ├── components/
│   │   └── ProtectedRoute.jsx     # Auth guard component
│   ├── pages/                     # Page components (11 total)
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
│   ├── redux/                     # State management
│   │   ├── store.js              # Redux store configuration
│   │   ├── authSlice.js          # Auth state & actions
│   │   ├── devicesSlice.js       # Devices state
│   │   ├── messagesSlice.js      # Messages state
│   │   └── chatsSlice.js         # Chats state
│   ├── services/                  # API & WebSocket
│   │   ├── api.js                # Axios with auth interceptors
│   │   └── socket.js             # Socket.IO client
│   ├── styles/                    # CSS files (9 total)
│   │   ├── globals.css           # Global styles & variables
│   │   ├── auth.css              # Login/Register styles
│   │   ├── dashboard.css         # Dashboard layout
│   │   ├── devices.css           # Device card styles
│   │   ├── messages.css          # Message form styles
│   │   ├── chats.css             # Chat UI styles
│   │   ├── subscription.css      # Plan cards
│   │   ├── invoices.css          # Invoice table
│   │   └── admin.css             # Admin panels
│   ├── .env.example
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## 🎨 Design System

### Color Palette
```css
--primary-color: #075e54        /* WhatsApp green */
--secondary-color: #25d366      /* Light green */
--danger-color: #ef4444         /* Red for destructive actions */
--warning-color: #f59e0b        /* Yellow/Orange */
--success-color: #10b981        /* Green for success */
--dark-bg: #0f172a             /* Dark sidebar background */
--light-bg: #f8fafc            /* Light background */
--text-primary: #1e293b        /* Primary text */
--text-secondary: #64748b      /* Secondary text */
--border-color: #e2e8f0        /* Border color */
```

### Typography
- Font: System fonts (Apple/Google/Microsoft)
- Body: 14px, Regular
- Headers: 18-28px, Bold
- Small text: 12px, Regular

## 📄 Pages & Routes

### Public Pages
- **`/login`** - Company login
- **`/register`** - New company registration

### User Dashboard Routes (`/dashboard/*`)
- **`/dashboard/devices`** - WhatsApp device management
- **`/dashboard/messages`** - Send individual or bulk messages
- **`/dashboard/chats`** - Chat inbox and history
- **`/dashboard/subscription`** - View and upgrade plans
- **`/dashboard/invoices`** - Download billing invoices

### Admin Routes (`/admin/*`)
- **`/admin/dashboard`** - Platform statistics
- **`/admin/companies`** - Manage companies
- **`/admin/plans`** - Manage subscription plans

## 🔐 Authentication Flow

```
1. User visits /login
   ↓
2. Enters credentials
   ↓
3. Axios POST to /api/auth/login
   ↓
4. Backend returns JWT token
   ↓
5. Token stored in localStorage
   ↓
6. Token added to all API requests via interceptor
   ↓
7. Redirect to /dashboard
```

### Protected Routes
- All `/dashboard/*` and `/admin/*` routes require authentication
- Unauthorized users redirected to `/login`
- Invalid tokens trigger re-login

## 🔄 State Management (Redux)

### Auth Slice
```javascript
{
  isAuthenticated: boolean,
  user: {
    _id, companyName, email, subscriptionPlan,
    usageStats, daysRemaining, ...
  },
  isAdmin: boolean,
  loading: boolean,
  error: string
}
```

### Devices Slice
```javascript
{
  devices: Device[],
  loading: boolean,
  error: string,
  selectedDevice: Device | null
}
```

### Messages Slice
```javascript
{
  messages: Message[],
  bulkJobs: BulkMessage[],
  loading: boolean,
  error: string,
  pagination: { page, limit, total }
}
```

### Chats Slice
```javascript
{
  chats: Chat[],
  selectedChat: Chat | null,
  chatMessages: ChatMessage[],
  loading: boolean,
  error: string,
  unreadCount: number
}
```

## 🌐 API Integration

All API calls go through centralized `services/api.js`:

```javascript
// Automatic features:
- Base URL: http://localhost:5000/api
- JWT token added to Authorization header
- 401 responses trigger logout
- Content-Type: application/json by default
```

### API Endpoints Used
```
POST   /auth/login
POST   /auth/register
GET    /auth/profile
PUT    /auth/profile
POST   /auth/logout

GET    /devices
POST   /devices
DELETE /devices/:id

POST   /messages/send
GET    /messages
POST   /messages/bulk/upload
GET    /messages/bulk/status/:jobId

GET    /chats
GET    /chats/:id
GET    /chats/:id/messages
POST   /chats/:id/archive
DELETE /chats/:id

GET    /plans
POST   /subscription/subscribe
GET    /usage
GET    /invoices/:id/download

GET    /health
```

## 📡 Real-Time Features (Socket.IO)

### Device Namespace (`/device`)
**Events received:**
- `qr_code` - New QR code with expiry
- `status_change` - Device status updates
- `connection_error` - Connection failures

**Events sent:**
- `subscribe_device` - Subscribe to device updates
- `unsubscribe_device` - Unsubscribe
- `request_qr` - Request QR code

### Chat Namespace (`/chat`)
**Events received:**
- `new_message` - Incoming message from contact
- `message_status` - Message delivery/read status
- `typing_indicator` - Contact typing status

**Events sent:**
- `subscribe_company` - Subscribe to all chats
- `subscribe_chat` - Subscribe to specific chat
- `typing` - Send typing indicator

### Integration
```javascript
// Auto-connect on app load with JWT token
// Auto-reconnect on disconnect
// Automatic room subscriptions
// Error handling & cleanup
```

## 📱 Responsive Design

### Breakpoints
- **Mobile**: < 640px - Single column, collapsible sidebar
- **Tablet**: 640px - 1024px - 2 column layouts
- **Desktop**: > 1024px - Full multi-column layouts

### Mobile Features
- Collapsible sidebar navigation
- Touch-friendly buttons (40x40px minimum)
- Optimized form input sizes
- Bottom-aligned modals
- Full-width content area

## 🧩 Key Components

### ProtectedRoute
Wraps routes that require authentication:
```jsx
<ProtectedRoute isAuthenticated={auth}>
  <Dashboard />
</ProtectedRoute>
```

### DashboardLayout
Main layout with sidebar and header:
- Collapsible navigation menu
- User profile section
- Logout button
- Dynamic page titles

### Device Cards
- Status indicator with color coding
- QR code display for pending devices
- Quick actions (delete, reconnect)
- Last connected timestamp

### Message Forms
- Device selector dropdown
- Phone number input with validation
- Message text area with character count
- File upload for bulk messaging
- Real-time progress tracking

### Chat Inbox
- Split view: Chat list + Message view
- Unread badge with count
- Last message preview
- Contact name or phone number
- Search/filter functionality
- Archive and delete options

### Subscription Cards
- Tiered pricing display
- Feature lists with checkmarks
- Monthly billing cycle
- Upgrade buttons
- Current plan highlight

### Admin Panels
- Statistical cards (KPIs)
- Company management table
- Plan management cards
- Search and filter options
- CRUD operations

## 🎯 User Flows

### Device Setup Flow
```
1. Click "Add Device"
2. Enter device name
3. QR code displays via WebSocket
4. Scan with WhatsApp
5. Device status updates to "connected"
6. Can now send messages from this device
```

### Send Message Flow
```
1. Go to Messages page
2. Select connected device
3. Enter phone number
4. Type message
5. Click Send
6. Message queued and processed
7. Status updates in real-time
```

### Bulk Message Flow
```
1. Create Excel file (Phone | Message | Name)
2. Go to Messages → Bulk Send
3. Select device
4. Upload file
5. File validated and messages queued
6. Real-time progress display
7. Download report when complete
```

### Admin Company Management Flow
```
1. Go to Admin → Companies
2. View all companies in table
3. Filter/search by name or email
4. Click row to view details
5. Edit subscription plan
6. View usage statistics
```

## ⚙️ Setup Instructions

### Installation
```bash
cd client
npm install
cp .env.example .env
```

### Development
```bash
npm run dev
```
Runs on `http://localhost:3000` with HMR

### Production Build
```bash
npm run build
npm run preview
```
Creates optimized bundle in `dist/`

## 🚀 Key Features Implemented

✅ **Authentication**
- Login & Register with JWT
- Auto-redirect on logout
- Token auto-refresh
- Secure API requests

✅ **Device Management**
- Add/delete devices
- QR code generation
- Real-time status updates
- Connection indication

✅ **Messaging**
- Send individual messages
- Bulk upload via Excel
- Progress tracking
- Error handling

✅ **Chat Management**
- Inbox with unread count
- Message history
- Search functionality
- Archive/delete options

✅ **Real-Time Updates**
- Socket.IO integration
- Auto-reconnect
- Live status changes
- Incoming message notifications

✅ **Admin Panel**
- Company management
- Plan editing
- Usage statistics
- Revenue tracking

✅ **Responsive Design**
- Mobile-optimized
- Tablet friendly
- Desktop full-featured
- Touch interactions

## 🎓 Development Guidelines

### Adding a New Page
1. Create component in `src/pages/`
2. Import in `App.jsx`
3. Add route in Routes
4. Create CSS file in `src/styles/`
5. Use Redux for state management

### Adding a New Feature
1. Create Redux slice if needed
2. Create API call in service
3. Implement component
4. Add styling
5. Add route if needed
6. Test with backend

### Styling Conventions
- Use CSS variables for colors
- Flexbox for layouts
- Mobile-first media queries
- BEM naming for complex components
- Consistent padding/spacing (8px increments)

## 📊 Project Statistics

| Metric | Count |
|--------|-------|
| Pages | 11 |
| Components | 12+ |
| Redux Slices | 4 |
| CSS Files | 9 |
| Routes | 10+ |
| Icons Used | 30+ |
| API Endpoints | 20+ |

## 🔗 Integration Points

**Backend API:** `http://localhost:5000/api`
**WebSocket:** `http://localhost:5000`
**Frontend:** `http://localhost:3000`

All communication is two-way with real-time updates via Socket.IO.

## 📝 Notes

- Frontend is completely decoupled from backend
- Can be deployed independently (Vercel, Netlify, etc.)
- Responsive and works on all devices
- Dark mode ready (CSS variables prepared)
- Accessible UI with semantic HTML
- No external UI library - custom CSS design

## 🎨 Future Enhancements

- Dark mode theme
- Multi-language support
- Advanced analytics charts
- User activity logs
- Custom branding options
- Mobile app version
- PWA offline support
- File/media message support
