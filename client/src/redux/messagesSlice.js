import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

export const sendMessage = createAsyncThunk(
  'messages/sendMessage',
  async (data, { rejectWithValue }) => {
    try {
      const response = await api.post('/messages/send', data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to send message');
    }
  }
);

export const fetchMessages = createAsyncThunk(
  'messages/fetchMessages',
  async (params, { rejectWithValue }) => {
    try {
      const response = await api.get('/messages', { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch messages');
    }
  }
);

export const fetchBulkJobs = createAsyncThunk(
  'messages/fetchBulkJobs',
  async (params, { rejectWithValue }) => {
    try {
      const response = await api.get('/messages/bulk/jobs', { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch bulk jobs');
    }
  }
);

export const uploadBulk = createAsyncThunk(
  'messages/uploadBulk',
  async (formData, { rejectWithValue }) => {
    try {
      const response = await api.post('/messages/bulk/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to upload file');
    }
  }
);

const initialState = {
  messages: [],
  bulkJobs: [],
  loading: false,
  error: null,
  pagination: { page: 1, limit: 20, total: 0 },
};

const messagesSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    addMessage: (state, action) => {
      state.messages.unshift(action.payload);
    },
    updateMessageStatus: (state, action) => {
      const message = state.messages.find(m => m._id === action.payload.messageId);
      if (message) {
        message.status = action.payload.status;
      }
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendMessage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.loading = false;
        state.messages.unshift(action.payload.message);
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.messages = action.payload.messages;
        state.pagination = action.payload.pagination;
      })
      .addCase(uploadBulk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(uploadBulk.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.batch) {
          state.bulkJobs.unshift(action.payload.batch);
        }
      })
      .addCase(uploadBulk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchBulkJobs.fulfilled, (state, action) => {
        state.bulkJobs = action.payload.jobs || [];
      });
  },
});

export const { addMessage, updateMessageStatus, clearError } = messagesSlice.actions;
export default messagesSlice.reducer;
