import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useAuth, usePermission } from '../../src/index.ts';

function Probe({ session }: { session: { authenticated: boolean; sub?: string } | undefined }) {
  const auth = useAuth(session);
  const allowed = usePermission('session:read', auth);
  return (
    <span>
      {auth.isAuthenticated ? auth.subject : 'anon'}:{allowed ? 'yes' : 'no'}
    </span>
  );
}

describe('useAuth', () => {
  it('treats missing or unauthenticated sessions as anonymous', () => {
    const { rerender } = render(<Probe session={undefined} />);
    expect(screen.getByText('anon:no')).toBeInTheDocument();
    rerender(<Probe session={{ authenticated: false }} />);
    expect(screen.getByText('anon:no')).toBeInTheDocument();
    rerender(<Probe session={{ authenticated: true }} />);
    expect(screen.getByText('anon:no')).toBeInTheDocument();
    rerender(<Probe session={{ authenticated: true, sub: 'user-1' }} />);
    expect(screen.getByText('user-1:yes')).toBeInTheDocument();
  });
});
