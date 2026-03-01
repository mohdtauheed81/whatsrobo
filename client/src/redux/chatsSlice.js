import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

export const fetchChats = createAsyncThunk(
  'chats/fetchChats',
  async (params, { rejectWithValue }) => {
    try {
      const response = await api.get('/chats', { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch chats');
    }
  }
);

export const fetchChatMessages = createAsyncThunk(
  'chats/fetchChatMessages',
  async (chatId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/chats/${chatId}/messages`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch messages');
    }
  }
);

export const sendChatMessage = createAsyncThunk(
  'chats/sendChatMessage',
  async ({ chatId, message }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/chats/${chatId}/messages`, { message });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to send message');
    }
  }
);

export const archiveChat = createAsyncThunk(
  'chats/archiveChat',
  async (chatId, { rejectWithValue }) => {
    try {
      const response = await api.post(`/chats/${chatId}/archive`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to archive chat');
    }
  }
);

const initialState = {
  chats: [],
  selectedChat: null,
  chatMessages: [],
  loading: false,
  error: null,
  unreadCount: 0,
};

const chatsSlice = createSlice({
  name: 'chats',
  initialState,
  reducers: {
    selectChat: (state, action) => {
      state.selectedChat = action.payload;
    },
    addIncomingMessage: (state, action) => {
      const chat = state.chats.find(c => c._id === action.payload.chatId);
      if (chat) {
        chat.lastMessage = action.payload.messageText;
        chat.unreadCount = (chat.unreadCount || 0) + 1;
      }
      state.unreadCount += 1;
    },
    addChatMessage: (state, action) => {
      state.chatMessages.push(action.payload);
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchChats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchChats.fulfilled, (state, action) => {
        state.loading = false;
        state.chats = action.payload.chats;
        state.unreadCount = action.payload.chats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);
      })
      .addCase(fetchChats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchChatMessages.fulfilled, (state, action) => {
        state.chatMessages = action.payload.messages;
      })
      .addCase(archiveChat.fulfilled, (state, action) => {
        state.chats = state.chats.filter(c => c._id !== action.payload._id);
      })
      .addCase(sendChatMessage.fulfilled, (state, action) => {
        if (action.payload.data) {
          state.chatMessages.push(action.payload.data);
        }
      });
  },
});

export const { selectChat, addIncomingMessage, addChatMessage, clearError } = chatsSlice.actions;
export default chatsSlice.reducer;
