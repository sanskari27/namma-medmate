import { configureStore } from '@reduxjs/toolkit';
import { describe, expect, it } from 'vitest';
import type { PosDraftLine } from '@/screens/pos/pos.types';
import { authReducer, branchSwitched } from '@/store/auth.slice';
import { initialPosState, posReducer } from '@/screens/pos/store/pos.slice';

describe('POS outlet switch', () => {
  it('abandons an open till draft when the counter switches outlet', () => {
    const store = configureStore({
      reducer: { auth: authReducer, pos: posReducer },
      preloadedState: {
        pos: {
          ...initialPosState,
          status: null,
          draft: [{ id: 'line-1' } as PosDraftLine],
        },
      },
    });

    store.dispatch(branchSwitched({ activeBranchId: 'b2' }));
    expect(store.getState().pos.draft).toEqual([]);
    expect(store.getState().pos.invoice).toBeNull();
  });
});
