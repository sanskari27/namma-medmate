import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { TooltipProvider } from '@atoms';
import router from '@/router';
import { store } from '@/store';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <TooltipProvider>
        <RouterProvider router={router} />
      </TooltipProvider>
      <Toaster
        position="top-right"
        containerStyle={{ zIndex: 200 }}
        toastOptions={{
          duration: 5000,
          style: {
            background: 'var(--color-surface)',
            color: 'var(--color-ink)',
            border: '1px solid var(--color-line)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.875rem',
            maxWidth: '24rem',
            overflowWrap: 'anywhere',
          },
          error: {
            iconTheme: {
              primary: 'var(--color-danger)',
              secondary: 'var(--color-surface)',
            },
            style: { borderColor: 'var(--color-danger)' },
          },
        }}
      />
    </Provider>
  </StrictMode>,
);
