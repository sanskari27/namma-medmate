import type { Preview } from '@storybook/react';
import { Provider } from 'react-redux';
import { createPlanGatingStore } from '../src/store/index.ts';
import './preview.css';

const preview: Preview = {
  decorators: [
    (Story, context) => {
      const store = createPlanGatingStore(
        { baseUrl: 'http://localhost:3006' },
        context.parameters.preloadedState as { entitlements?: never } | undefined,
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
