import type { Preview } from '@storybook/react';
import { Provider } from 'react-redux';
import { createGoLiveKycStore } from '../src/store/index.ts';
import './preview.css';

const preview: Preview = {
  decorators: [
    (Story) => {
      const store = createGoLiveKycStore({
        baseUrl: 'http://localhost:3009',
        getAccessToken: () => 'token',
        getLocationId: () => '1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809',
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
