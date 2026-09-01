import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout, type RootState } from '@/store';
import { NAV_ITEMS, ROUTES } from '@/libs/constants/routes.const';

export default function DashboardLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const displayName = useSelector((s: RootState) => s.auth.displayName);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="w-56 border-r border-slate-200 bg-white p-4">
        <h1 className="mb-6 text-lg font-bold text-emerald-700">MedMate ERP</h1>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === ROUTES.DASHBOARD}
              className={({ isActive }) =>
                `rounded px-3 py-2 text-sm ${isActive ? 'bg-emerald-50 font-medium text-emerald-800' : 'text-slate-600 hover:bg-slate-50'}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <span className="text-sm text-slate-500">Pharmacy workspace</span>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">{displayName}</span>
            <button
              type="button"
              className="rounded border border-slate-300 px-3 py-1 text-sm"
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
