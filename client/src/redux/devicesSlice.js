import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

export const fetchDevices = createAsyncThunk(
  'devices/fetchDevices',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/devices');
      return response.data.devices || [];
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch devices');
    }
  }
);

export const createDevice = createAsyncThunk(
  'devices/createDevice',
  async (data, { rejectWithValue }) => {
    try {
      const response = await api.post('/devices', data);
      return response.data.device;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to create device');
    }
  }
);

export const deleteDevice = createAsyncThunk(
  'devices/deleteDevice',
  async (deviceId, { rejectWithValue }) => {
    try {
      await api.delete(`/devices/${deviceId}`);
      return deviceId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to delete device');
    }
  }
);

const initialState = {
  devices: [],
  loading: false,
  error: null,
  selectedDevice: null,
};

const devicesSlice = createSlice({
  name: 'devices',
  initialState,
  reducers: {
    selectDevice: (state, action) => {
      state.selectedDevice = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDevices.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDevices.fulfilled, (state, action) => {
        state.loading = false;
        state.devices = action.payload;
      })
      .addCase(fetchDevices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createDevice.fulfilled, (state, action) => {
        state.devices.push(action.payload);
      })
      .addCase(deleteDevice.fulfilled, (state, action) => {
        state.devices = state.devices.filter(d => d._id !== action.payload);
      });
  },
});

export const { selectDevice, clearError } = devicesSlice.actions;
export default devicesSlice.reducer;
