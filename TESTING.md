# Testing Checklist

Complete manual testing checklist for WhatsApp SaaS Platform before production release.

## Setup for Testing

1. **Start MongoDB**
   ```bash
   mongod
   ```

2. **Start Redis**
   ```bash
   redis-server
   ```

3. **Start Application**
   ```bash
   npm run dev
   ```

4. **Start Message Worker** (in another terminal)
   ```bash
   node src/services/worker/MessageWorker.js
   ```

5. **Seed Data**
   ```bash
   npm run seed
   ```

## Authentication Testing

- [ ] **Register new company**
  - Enter valid company name, email, password
  - Confirm email validation
  - Confirm Starter plan assigned
  - Confirm subscription end date is 30 days from now

- [ ] **Login with valid credentials**
  - Verify JWT token returned
  - Verify token contains companyId

- [ ] **Login with invalid credentials**
  - Test wrong password → 401 error
  - Test non-existent email → 401 error

- [ ] **JWT token expiry**
  - Login and note token
  - Modify token to invalid value
  - Verify access denied
  - Test refresh token endpoint

- [ ] **Update profile**
  - Modify company details
  - Verify changes saved
  - Verify no changes to password without special endpoint

## Device Management Testing

- [ ] **Create device**
  - POST /api/devices with device name
  - Verify device created with status "disconnected"
  - Verify device appears in list

- [ ] **Device count limit enforcement**
  - Starter plan allows 1 device
  - Create 1 device → success
  - Try to create 2nd device → 403 error "Device limit reached"
  - Upgrade to Professional plan
  - Now able to create up to 3 devices

- [ ] **QR code generation**
  - Create device and monitor WebSocket
  - Verify qr_code event received via /device namespace
  - Verify QR code is valid data URL
  - Verify QR expires after 2 minutes

- [ ] **Device reconnection**
  - Create and connect device
  - Stop WhatsApp client manually
  - Verify status changes to "disconnected"
  - Verify auto-reconnect attempts (watch logs)
  - Verify exponential backoff delay

- [ ] **Delete device**
  - Create device
  - DELETE /api/devices/:id
  - Verify device soft-deleted
  - Verify no longer appears in active list

## Message Testing

- [ ] **Send single message**
  - POST /api/messages/send with valid phone and message
  - Verify message status "queued"
  - Watch worker logs for processing
  - Verify status changes to "sent"
  - Check actual WhatsApp message received

- [ ] **Rate limiting**
  - Send 20 messages rapidly
  - All 20 should queue successfully
  - Send 21st message → queued but delayed
  - Verify processing respects 1-2 second global delay
  - Verify < 20 messages sent per minute

- [ ] **Monthly quota enforcement**
  - Get company usage stats
  - Calculate remaining quota
  - Send messages up to limit
  - Next message attempt → 403 "Monthly limit reached"
  - Reset quota (manual or wait for month end)
  - Verify can send again

- [ ] **Message failed status**
  - Send message to invalid number
  - Verify status eventually becomes "failed"
  - Verify error message stored
  - Verify retry count incremented

- [ ] **Message delivered status**
  - Send message from WhatsApp device
  - Monitor message_status events via Socket.IO
  - Watch delivery status transition
  - Verify all statuses: sent → delivered → read

## Bulk Messaging Testing

- [ ] **Upload Excel file**
  - Create Excel with columns: Phone Number | Message | Name
  - Upload file
  - Verify file parsed successfully
  - Verify all contacts queued
  - Verify batch created with status "processing"

- [ ] **Bulk message personalization**
  - Upload Excel with names
  - Verify messages contain {{name}} replacement
  - Send and verify personalized messages received

- [ ] **Bulk progress tracking**
  - Get batch status
  - Monitor progress incrementally
  - Verify counts update as messages process
  - Check final delivery rate

- [ ] **Bulk error handling**
  - Upload file with invalid phone numbers
  - Verify invalid rows reported
  - Verify valid rows still queued
  - Check error report details

- [ ] **Bulk cancellation**
  - Start bulk send
  - Cancel batch immediately
  - Verify status changes to "cancelled"
  - Verify queued messages not processed

## Chat & Inbox Testing

- [ ] **Receive incoming message**
  - Send message to WhatsApp device
  - Verify Chat created
  - Verify ChatMessage logged
  - Verify Socket.IO event emitted to client
  - Verify unread count incremented

- [ ] **Chat listing**
  - Receive multiple messages from different contacts
  - GET /api/chats
  - Verify chats sorted by last message time
  - Verify pagination working (limit 20)

- [ ] **Chat messages pagination**
  - GET /api/chats/:id/messages
  - Verify messages returned in reverse chronological order
  - Verify oldest messages paginated correctly
  - Test page navigation

- [ ] **Mark messages read**
  - View chat and load messages
  - Verify all marked as read
  - Verify readAt timestamp set
  - Verify unreadCount reset to 0

- [ ] **Archive chat**
  - POST /api/chats/:id/archive
  - Verify chat status changed
  - Verify not in active list
  - Verify can be unarchived

## Auto-Reply Testing

- [ ] **Create auto-reply rule**
  - Trigger type: "contains"
  - Keyword: "hello"
  - Response: "Hi there! How can I help?"
  - Verify rule created and active

- [ ] **Trigger auto-reply**
  - Send message containing trigger keyword
  - Verify auto-reply response sent automatically
  - Verify response in message history
  - Verify source marked as "auto_reply"

- [ ] **Auto-reply keyword matching**
  - Test all trigger types: exact, contains, startsWith, endsWith, regex
  - Verify each type matches correctly
  - Test case sensitivity toggle

- [ ] **Auto-reply with variables**
  - Create rule with {{name}}, {{time}}, {{date}} variables
  - Verify variables replaced correctly
  - Check timestamp and date formatting

- [ ] **Auto-reply daily limit**
  - Create rule with maxUsagePerDay: 3
  - Trigger 3 times → success
  - Trigger 4th time → no response
  - Next day → can trigger again

- [ ] **Delete auto-reply rule**
  - Delete rule
  - Trigger keyword again → no response

## Subscription & Billing Testing

- [ ] **View available plans**
  - GET /api/plans
  - Verify all 3 plans returned (Starter, Professional, Enterprise)
  - Verify correct pricing and limits

- [ ] **Upgrade subscription**
  - Register company (gets Starter)
  - POST /api/subscription/subscribe with Professional plan
  - Verify subscription updated
  - Verify end date extended
  - Verify new limits apply
  - Verify invoice created

- [ ] **Usage tracking**
  - Send messages and monitor usage
  - GET /api/usage
  - Verify messagesThisMonth incremented
  - Verify percentageUsed calculated correctly
  - Verify remaining quota accurate

- [ ] **Invoice generation**
  - Trigger invoice creation (via subscription action)
  - GET /api/invoices
  - Verify invoice listed
  - GET /api/invoices/:id/download
  - Verify PDF generated with correct details

- [ ] **Invoice details**
  - Download PDF
  - Verify all fields present: Invoice number, dates, amounts
  - Verify tax calculation (18% default)
  - Verify total amount correct

- [ ] **Subscription renewal**
  - Set subscription end date to today
  - POST /api/subscription/renew
  - Verify end date extended 30 days
  - Verify new invoice created

## Socket.IO Real-Time Testing

- [ ] **Device namespace connection**
  - Connect with JWT token
  - Subscribe to device:deviceId
  - Verify "subscribed" event received

- [ ] **QR code emission**
  - Create device
  - Subscribe to device namespace
  - Receive qr_code event
  - Verify QR image is valid

- [ ] **Status change events**
  - Monitor status_change events
  - Verify all statuses: connecting, qr_pending, connected, disconnected
  - Verify status matches device record

- [ ] **Chat namespace connection**
  - Connect with JWT token
  - Subscribe to company:companyId
  - Verify "subscribed" event received

- [ ] **Incoming message events**
  - Send message to device from external WhatsApp
  - Verify incoming_message event received
  - Verify message data correct

- [ ] **Typing indicator**
  - Send typing event from client
  - Verify other clients in chat receive typing_indicator

## Rate Limiting Testing

- [ ] **API rate limiting**
  - Send 100+ requests in 1 second
  - Verify some requests return 429 (Too Many Requests)
  - After reset window, can send again

- [ ] **Queue rate limiting**
  - Send 30 messages in 1 second
  - Verify only 20 processed per minute
  - Remaining are queued
  - Verify processing respects rate limit

## Error Handling Testing

- [ ] **Invalid input validation**
  - Send invalid email → validation error
  - Send short password → validation error
  - Send invalid phone number → validation error

- [ ] **Authentication errors**
  - Missing token → 401
  - Invalid token → 401
  - Expired token → 401

- [ ] **Authorization errors**
  - Access another company's data → 403
  - Try bulk_messaging without feature → 403

- [ ] **Not found errors**
  - GET /api/devices/invalid_id → 404
  - GET /api/chats/invalid_id → 404

- [ ] **Server errors**
  - Database unavailable → 500 with error message
  - Internal error → 500 with error message

## Performance Testing

- [ ] **Message throughput**
  - Send 100 messages rapidly
  - Time until all processed
  - Target: < 1 minute for 100 messages

- [ ] **Memory usage**
  - Monitor memory during test
  - Target: < 500MB for API, < 300MB for worker

- [ ] **Database query performance**
  - Monitor slow query logs
  - Verify all queries < 100ms
  - Especially pagination queries

- [ ] **Socket.IO connection load**
  - Connect 100 clients
  - Broadcast message
  - Verify all receive in < 1 second
  - Monitor memory impact

## Security Testing

- [ ] **SQL injection prevention**
  - Try injection in text fields → sanitized/safe

- [ ] **XSS prevention**
  - Send `<script>alert('xss')</script>` in message
  - Verify not executed when viewed

- [ ] **CORS validation**
  - Request from different origin
  - Verify only whitelisted origins allowed

- [ ] **Password security**
  - Verify passwords hashed (not plain text in DB)
  - Verify old session tokens don't grant access after logout

- [ ] **Sensitive data not logged**
  - Send message with sensitive content
  - Check logs don't contain full message body or passwords

## Deployment-Specific Testing

- [ ] **Health check endpoint**
  - GET /health
  - Verify all components report correct status
  - Verify memory usage reported

- [ ] **Graceful shutdown**
  - SIGTERM signal
  - Verify WhatsApp clients disconnected
  - Verify message queue closed
  - Verify process exits cleanly

- [ ] **PM2 restart**
  - Kill process manually
  - Verify PM2 auto-restarts
  - Verify service recovers

- [ ] **Log rotation**
  - Monitor log file sizes
  - Verify old logs archived
  - Verify logs don't fill disk

## Integration Testing

- [ ] **End-to-end flow: Company registration → Device setup → Message send**
  - Register new company
  - Create device and scan QR
  - Send manual message
  - Verify message received
  - Check message in inbox

- [ ] **End-to-end flow: Bulk messaging**
  - Create Excel file with 10 contacts
  - Upload and send
  - Monitor batch progress
  - Verify all messages delivered
  - Download report

- [ ] **End-to-end flow: Auto-reply conversation**
  - Set up auto-reply for "help"
  - Send "I need help" from external WhatsApp
  - Verify auto-reply response sent
  - Send follow-up message
  - Verify conversation in inbox

## Compatibility Testing

- [ ] **Different browsers**
  - Test on Chrome, Firefox, Safari, Edge
  - Verify WebSocket connections work
  - Verify QR code display works

- [ ] **Mobile responsiveness**
  - Test on iOS Safari
  - Test on Android Chrome
  - Verify touch interactions work

- [ ] **Different WhatsApp clients**
  - Test with WhatsApp Web
  - Test with WhatsApp Business
  - Verify both work correctly

## Test Results Summary

Date: _____________
Tester: _____________
Environment: [ ] Development  [ ] Staging  [ ] Production

### Passed Tests: _____ / 100+

### Failed Tests:
1. _______________
2. _______________
3. _______________

### Critical Issues Found:
- [ ] None
- [ ] Yes (list below):
  1. _______________
  2. _______________

### Approved for Production:
- [ ] Yes
- [ ] No (requires fixes)

Signature: _______________ Date: _______________
