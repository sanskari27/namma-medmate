import type { Preview } from '@storybook/react';
import { Provider } from 'react-redux';
import { createMasterCatalogueStore } from '../src/store/index.ts';
import './preview.css';

const preview: Preview = {
  decorators: [
    (Story) => {
      const store = createMasterCatalogueStore({ baseUrl: 'http://localhost:3005' });
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
