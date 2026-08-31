import type { Preview } from '@storybook/react';
import { Provider } from 'react-redux';
import { createAuditStore } from '../src/store/index.ts';
import './preview.css';

const preview: Preview = {
  decorators: [
    (Story) => {
      const store = createAuditStore({ baseUrl: 'http://localhost:3004' });
      return (
        <Provider store={store}>
          <Story />
        </Provider>
      );
    },
  ],
  parameters: {
    layout: 'centered',
  },
};

export default preview;
