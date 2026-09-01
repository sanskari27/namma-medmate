import { FormEvent } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
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
      <h2 className="text-xl font-semibold">HQ sign in</h2>
      <p className="text-sm text-slate-400">Platform CRM — scaffold login (no API yet)</p>
      <input
        type="email"
        placeholder="Email"
        className="w-full rounded border border-slate-600 bg-slate-900 px-3 py-2"
        defaultValue="admin@nammamedmate.com"
      />
      <input
        type="password"
        placeholder="Password"
        className="w-full rounded border border-slate-600 bg-slate-900 px-3 py-2"
        defaultValue="password"
      />
      <button
        type="submit"
        className="w-full rounded bg-sky-600 py-2 font-medium hover:bg-sky-500"
      >
        Sign in
      </button>
    </form>
  );
}
