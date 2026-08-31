import { configureStore } from '@reduxjs/toolkit';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createSilentLogger, renderWithStore, selectToken } from '../../src/index.ts';

describe('testing-utils', () => {
  it('creates a silent logger', () => {
    const logger = createSilentLogger();
    logger.info('noop');
    logger.child({ a: 1 }).debug('noop');
  });

  it('renders with a redux store', () => {
    const store = configureStore({ reducer: { ok: () => true } });
    renderWithStore(<p>hello</p>, store);
    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  it('selects named token fixtures', () => {
    expect(selectToken([{ name: 'valid', token: 'abc' }], 'valid')).toBe('abc');
    expect(() => selectToken([], 'missing')).toThrow('Unknown token fixture: missing');
  });
});
