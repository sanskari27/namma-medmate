import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ApprovalAction, ApprovalRule } from '@/services/approvals';
import { createSignOffRule, loadSignOff } from './signOffRules.thunks';
export type PageStatus = 'loading' | 'empty' | 'denied' | 'failure' | 'success' | null;

export type SignOffRulesState = {
  status: PageStatus;
  banner: string | null;
  formError: string | null;
  rules: ApprovalRule[];
  actions: ApprovalAction[];
  actionKey: string;
  threshold: string;
};

export const initialSignOffRulesState: SignOffRulesState = {
  status: 'loading',
  banner: null,
  formError: null,
  rules: [],
  actions: [],
  actionKey: 'SALES_DISCOUNT_PERCENT',
  threshold: '1000',
};

const signOffRulesSlice = createSlice({
  name: 'signOffRules',
  initialState: initialSignOffRulesState,
  reducers: {
    accessDenied(state, action: PayloadAction<string>) {
      state.status = 'denied';
      state.banner = action.payload;
    },
    actionKeyChanged(state, action: PayloadAction<string>) {
      state.actionKey = action.payload;
    },
    thresholdChanged(state, action: PayloadAction<string>) {
      state.threshold = action.payload;
    },
    formErrorSet(state, action: PayloadAction<string | null>) {
      state.formError = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadSignOff.fulfilled, (state, action) => {
        state.rules = action.payload.rules;
        state.actions = action.payload.actions;
        if (action.payload.actions[0]) {
          state.actionKey = action.payload.actions[0].actionKey;
        }
        state.status = action.payload.rules.length === 0 ? 'empty' : null;
      })
      .addCase(loadSignOff.rejected, (state, action) => {
        state.status = action.payload ?? 'failure';
      })
      .addCase(createSignOffRule.fulfilled, (state) => {
        state.banner = 'Sign-off rule saved for this pharmacy.';
        state.status = 'success';
        state.formError = null;
      })
      .addCase(createSignOffRule.rejected, (state, action) => {
        state.formError = action.payload ?? 'Could not save this rule. Try again.';
      });
  },
});

export const { accessDenied, actionKeyChanged, thresholdChanged, formErrorSet } = signOffRulesSlice.actions;
export const signOffRulesReducer = signOffRulesSlice.reducer;
