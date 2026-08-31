import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RequestContextProvider, useRequestContext } from '../../src/index.ts';

function Probe() {
  const ctx = useRequestContext();
  return <span>{ctx.requestId}</span>;
}

describe('RequestContextProvider', () => {
  it('provides client request context', () => {
    render(
      <RequestContextProvider value={{ requestId: 'r1', correlationId: 'c1' }}>
        <Probe />
      </RequestContextProvider>,
    );
    expect(screen.getByText('r1')).toBeInTheDocument();
  });

  it('throws outside the provider', () => {
    expect(() => render(<Probe />)).toThrow(
      'useRequestContext must be used within RequestContextProvider',
    );
  });
});
