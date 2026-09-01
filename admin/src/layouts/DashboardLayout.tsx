import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout, type RootState } from '@/store';
import { NAV_ITEMS, ROUTES } from '@/libs/constants/routes.const';

export default function DashboardLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const displayName = useSelector((s: RootState) => s.auth.displayName);

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <aside className="w-56 border-r border-slate-800 bg-slate-900 p-4">
        <h1 className="mb-6 text-lg font-bold text-sky-400">MedMate HQ</h1>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === ROUTES.DASHBOARD}
              className={({ isActive }) =>
                `rounded px-3 py-2 text-sm ${isActive ? 'bg-slate-800 font-medium text-sky-300' : 'text-slate-400 hover:bg-slate-800'}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-6 py-3">
          <span className="text-sm text-slate-400">Platform CRM</span>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">{displayName}</span>
            <button
              type="button"
              className="rounded border border-slate-600 px-3 py-1 text-sm"
              onClick={() => {
                dispatch(logout());
                navigate(ROUTES.LOGIN);
              }}
            >
              Logout
            </button>
          </div>
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
