import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-md rounded-xl bg-slate-800 p-8 text-white shadow">
        <Outlet />
      </div>
    </div>
  );
}
