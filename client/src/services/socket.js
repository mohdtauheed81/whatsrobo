import { io } from 'socket.io-client';

// Use Vite's import.meta.env for browser environment
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

class SocketService {
  constructor() {
    this.deviceSocket = null;
    this.chatSocket = null;
  }

  connectDevice(token) {
    if (this.deviceSocket?.connected) return this.deviceSocket;

    this.deviceSocket = io(`${SOCKET_URL}/device`, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    this.deviceSocket.on('connect', () => {
      console.log('Device socket connected');
    });

    this.deviceSocket.on('disconnect', () => {
      console.log('Device socket disconnected');
    });

    return this.deviceSocket;
  }

  connectChat(token) {
    if (this.chatSocket?.connected) return this.chatSocket;

    this.chatSocket = io(`${SOCKET_URL}/chat`, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    this.chatSocket.on('connect', () => {
      console.log('Chat socket connected');
    });

    this.chatSocket.on('disconnect', () => {
      console.log('Chat socket disconnected');
    });

    return this.chatSocket;
  }

  subscribeToDevice(deviceId, callback) {
    if (!this.deviceSocket) return;
    this.deviceSocket.emit('subscribe_device', { deviceId });
    this.deviceSocket.on('qr_code', callback);
    this.deviceSocket.on('status_change', callback);
  }

  subscribeToChat(chatId, callback) {
    if (!this.chatSocket) return;
    this.chatSocket.emit('subscribe_chat', { chatId });
    this.chatSocket.on('new_message', callback);
    this.chatSocket.on('message_status', callback);
  }

  subscribeToCompany(companyId, callback) {
    if (!this.chatSocket) return;
    this.chatSocket.emit('subscribe_company', { companyId });
    this.chatSocket.on('new_message', callback);
  }

  disconnect() {
    if (this.deviceSocket) this.deviceSocket.disconnect();
    if (this.chatSocket) this.chatSocket.disconnect();
  }
}

export default new SocketService();
