import { FormEvent } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { login } from '@/store';
import { ROUTES } from '@/libs/constants/routes.const';

export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    dispatch(login({ token: 'dev-token', displayName: 'HQ Admin' }));
    navigate(ROUTES.DASHBOARD);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <h1 className="text-lg font-medium text-ink">HQ sign in</h1>
        <p className="mt-1 text-sm text-muted">Platform CRM — scaffold login (no API yet)</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          name="email"
          autoComplete="username"
          defaultValue="admin@nammamedmate.com"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          name="password"
          autoComplete="current-password"
          defaultValue="password"
        />
      </div>
      <Button type="submit" className="w-full">
        Sign in
      </Button>
    </form>
  );
}
