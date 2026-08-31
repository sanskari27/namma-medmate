import { render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { emit, resetEventBus, useEventEmitter, useEventListener } from '../../src/index.ts';

declare module '../../src/event-map.ts' {
  interface EventMap {
    'test:ping': { n: number };
  }
}

function Probe() {
  const [value, setValue] = useState(0);
  const emitEvent = useEventEmitter();
  useEventListener('test:ping', (payload) => {
    setValue(payload.n);
  });
  return (
    <button type="button" onClick={() => emitEvent('test:ping', { n: 7 })}>
      {value}
    </button>
  );
}

describe('event-bus hooks', () => {
  afterEach(() => {
    resetEventBus();
  });

  it('listens and emits through hooks', async () => {
    const { unmount } = render(<Probe />);
    emit('test:ping', { n: 3 });
    expect(await screen.findByText('3')).toBeInTheDocument();
    screen.getByRole('button').click();
    expect(await screen.findByText('7')).toBeInTheDocument();
    unmount();
    emit('test:ping', { n: 9 });
  });
});
