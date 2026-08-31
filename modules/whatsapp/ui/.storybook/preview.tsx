import type { Preview } from '@storybook/react';
import { Provider } from 'react-redux';
import { createWhatsAppStore } from '../src/store/index.ts';
import './preview.css';

const preview: Preview = {
  decorators: [
    (Story) => {
      const store = createWhatsAppStore({
        baseUrl: 'http://localhost:3003',
        getLocationId: () => '1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809',
        getTenantId: () => '8f1c0a7e-2b3d-4e5f-8a90-123456789abc',
      });
      return (
        <Provider store={store}>
          <Story />
        </Provider>
      );
    },
  ],
  parameters: {
    layout: 'padded',
  },
};

export default preview;
