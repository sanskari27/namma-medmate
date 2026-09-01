import type { Preview } from '@storybook/react';
import { Provider } from 'react-redux';
import { createAuthStore } from '../src/store/index.ts';
import './preview.css';

const preview: Preview = {
  decorators: [
    (Story, context) => {
      const store = createAuthStore(
        { baseUrl: 'http://localhost:3001' },
        context.parameters.preloadedState as { session?: never } | undefined,
      );
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
