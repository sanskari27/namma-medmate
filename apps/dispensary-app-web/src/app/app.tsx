import '../styles.css';
import { AppProviders } from './providers/app-providers.tsx';
import { AppRoutes } from './routes/app-routes.tsx';

export function App() {
  return (
    <AppProviders>
      <AppRoutes />
    </AppProviders>
  );
}
