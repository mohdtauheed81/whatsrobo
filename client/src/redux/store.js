import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import devicesReducer from './devicesSlice';
import messagesReducer from './messagesSlice';
import chatsReducer from './chatsSlice';
import autoreplyReducer from './autoreplySlice';

// Persistence middleware
const persistenceMiddleware = store => next => action => {
  const result = next(action);

  // Persist auth state to localStorage
  const state = store.getState();
  if (state.auth) {
    localStorage.setItem('authState', JSON.stringify(state.auth));
  }

  return result;
};

// Load persisted auth state
const loadPersistedAuthState = () => {
  try {
    const persistedAuth = localStorage.getItem('authState');
    if (persistedAuth) {
      return JSON.parse(persistedAuth);
    }
  } catch (error) {
    console.error('Failed to load persisted auth state:', error);
  }
  return undefined;
};

const store = configureStore({
  reducer: {
    auth: authReducer,
    devices: devicesReducer,
    messages: messagesReducer,
    chats: chatsReducer,
    autoreply: autoreplyReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(persistenceMiddleware),
  preloadedState: {
    auth: loadPersistedAuthState() || {
      isAuthenticated: false,
      user: null,
      isAdmin: false,
      loading: false,
      error: null,
    },
  },
});

export default store;
