import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

export const fetchRules = createAsyncThunk(
  'autoreply/fetchRules',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/autoreply');
      return response.data.rules;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch rules');
    }
  }
);

export const createRule = createAsyncThunk(
  'autoreply/createRule',
  async (ruleData, { rejectWithValue }) => {
    try {
      const response = await api.post('/autoreply', ruleData);
      return response.data.rule;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to create rule');
    }
  }
);

export const updateRule = createAsyncThunk(
  'autoreply/updateRule',
  async ({ ruleId, ...ruleData }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/autoreply/${ruleId}`, ruleData);
      return response.data.rule;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to update rule');
    }
  }
);

export const deleteRule = createAsyncThunk(
  'autoreply/deleteRule',
  async (ruleId, { rejectWithValue }) => {
    try {
      await api.delete(`/autoreply/${ruleId}`);
      return ruleId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to delete rule');
    }
  }
);

export const testRule = createAsyncThunk(
  'autoreply/testRule',
  async ({ ruleId, testMessage }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/autoreply/${ruleId}/test`, { testMessage });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to test rule');
    }
  }
);

const initialState = {
  rules: [],
  loading: false,
  error: null,
  testResult: null
};

const autoreplySlice = createSlice({
  name: 'autoreply',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearTestResult: (state) => {
      state.testResult = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRules.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchRules.fulfilled, (state, action) => {
        state.loading = false;
        state.rules = action.payload;
      })
      .addCase(fetchRules.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createRule.pending, (state) => {
        state.loading = true;
      })
      .addCase(createRule.fulfilled, (state, action) => {
        state.loading = false;
        state.rules.push(action.payload);
      })
      .addCase(createRule.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateRule.fulfilled, (state, action) => {
        const index = state.rules.findIndex(r => r._id === action.payload._id);
        if (index !== -1) {
          state.rules[index] = action.payload;
        }
      })
      .addCase(deleteRule.fulfilled, (state, action) => {
        state.rules = state.rules.filter(r => r._id !== action.payload);
      })
      .addCase(testRule.fulfilled, (state, action) => {
        state.testResult = action.payload;
      });
  }
});

export const { clearError, clearTestResult } = autoreplySlice.actions;
export default autoreplySlice.reducer;
