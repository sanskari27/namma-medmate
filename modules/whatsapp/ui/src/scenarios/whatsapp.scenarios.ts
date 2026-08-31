import type { StoryScenario } from '@namma-medmate/story-generator';

const khataRead = {
  message_id: '3c9f1a22-1111-4b22-8333-444455556666',
  template_key: 'khata_remind',
  to: '+919876543210',
  purpose: 'khata_remind',
  status: 'read',
  bill_id: 'INV-24-00018',
  mandatory: false,
  retry_count: 0,
  created_at: '2026-08-31T10:00:00.000Z',
  preview: 'Sri Krishna Medicals: payment reminder for your khata.',
};

const otpSent = {
  message_id: '7b2e8c11-2222-4c33-9444-555566667777',
  template_key: 'login_otp',
  to: '+919876543210',
  purpose: 'otp',
  status: 'sent',
  bill_id: null,
  mandatory: false,
  retry_count: 0,
  created_at: '2026-08-31T10:05:00.000Z',
  preview: 'Login code sent.',
};

const irnFail = {
  message_id: 'aa111111-2222-4333-8444-555566667777',
  template_key: 'irn_fail',
  bill_id: 'INV-24-00019',
  status: 'failed',
  last_error_code: 'META_UNAVAILABLE',
  created_at: '2026-08-31T11:00:00.000Z',
};

export const inboxScenarios = [
  {
    id: 'loaded',
    title: 'Loaded inbox',
    description: 'Inbox rows with Read khata and redacted OTP preview.',
    props: { skipQuery: true, items: [khataRead, otpSent] },
  },
  {
    id: 'empty',
    title: 'Empty inbox',
    description: 'No WhatsApp messages for this shop.',
    props: { skipQuery: true, items: [] },
  },
] as const satisfies readonly StoryScenario[];

export const bannerScenarios = [
  {
    id: 'failed',
    title: 'Mandatory failure',
    description: 'Owner sees an IRN WhatsApp failure until acknowledge.',
    props: { skipQuery: true, skipMutation: true, items: [irnFail] },
  },
  {
    id: 'cashier-forbidden',
    title: 'Cashier cannot acknowledge',
    description: 'Cashier acknowledge is refused and the banner stays.',
    props: {
      skipQuery: true,
      skipMutation: true,
      canAcknowledge: false,
      items: [irnFail],
    },
  },
] as const satisfies readonly StoryScenario[];

export const shareScenarios = [
  {
    id: 'ready',
    title: 'Share bill',
    description: 'Share builds a wa.me link without sending.',
    props: {
      skipMutation: true,
      text: 'Sri Krishna Medicals — invoice INV-24-00018. Thank you.',
      to: '+919876543210',
      tenantId: '8f1c0a7e-2b3d-4e5f-8a90-123456789abc',
      locationId: '1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809',
    },
  },
] as const satisfies readonly StoryScenario[];

export const templateScenarios = [
  {
    id: 'catalogue',
    title: 'Template catalogue',
    description: 'Read-only English template bodies.',
    props: {
      skipQuery: true,
      items: [
        {
          template_key: 'login_otp',
          meta_template_name: 'namma_login_otp',
          language: 'en',
          i18n_key: 'whatsapp.templates.loginOtp.body',
          transactional: true,
          body_preview_en: '{{shop_name}}: your login code is {{otp}}. It expires in 10 minutes.',
        },
      ],
    },
  },
] as const satisfies readonly StoryScenario[];
