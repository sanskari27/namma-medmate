import type { Preview } from '@storybook/react';
import { Provider } from 'react-redux';
import { createTenancyStore } from '../src/store/index.ts';
import './preview.css';

const preview: Preview = {
  decorators: [
    (Story, context) => {
      const store = createTenancyStore(
        { baseUrl: 'http://localhost:3002' },
        context.parameters.preloadedState as { tenant?: never } | undefined,
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
