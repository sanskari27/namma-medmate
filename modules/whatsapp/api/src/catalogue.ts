import type { WhatsAppPurpose, WhatsAppTemplateKey } from '@namma-medmate/db-services';

export interface TemplateCatalogueEntry {
  template_key: WhatsAppTemplateKey;
  meta_template_name: string;
  language: 'en';
  i18n_key: string;
  transactional: boolean;
  body_preview_en: string;
}

export const TEMPLATE_CATALOGUE: readonly TemplateCatalogueEntry[] = [
  {
    template_key: 'login_otp',
    meta_template_name: 'namma_login_otp',
    language: 'en',
    i18n_key: 'whatsapp.templates.loginOtp.body',
    transactional: true,
    body_preview_en: '{{shop_name}}: your login code is {{otp}}. It expires in 10 minutes.',
  },
  {
    template_key: 'khata_remind',
    meta_template_name: 'namma_khata_remind',
    language: 'en',
    i18n_key: 'whatsapp.templates.khataRemind.body',
    transactional: true,
    body_preview_en:
      '{{shop_name}}: khata reminder. Amount due {{amount}}. Please visit the pharmacy.',
  },
  {
    template_key: 'refill',
    meta_template_name: 'namma_refill',
    language: 'en',
    i18n_key: 'whatsapp.templates.refill.body',
    transactional: true,
    body_preview_en: '{{shop_name}}: your medicine refill is due. Reply or visit the pharmacy.',
  },
  {
    template_key: 'low_stock',
    meta_template_name: 'namma_low_stock',
    language: 'en',
    i18n_key: 'whatsapp.templates.lowStock.body',
    transactional: true,
    body_preview_en: '{{shop_name}}: low stock alert for {{sku_name}}.',
  },
  {
    template_key: 'licence_expiry',
    meta_template_name: 'namma_licence_expiry',
    language: 'en',
    i18n_key: 'whatsapp.templates.licenceExpiry.body',
    transactional: true,
    body_preview_en: '{{shop_name}}: {{licence_type}} expires on {{expiry_date}}.',
  },
  {
    template_key: 'irn_fail',
    meta_template_name: 'namma_irn_fail',
    language: 'en',
    i18n_key: 'whatsapp.templates.irnFail.body',
    transactional: true,
    body_preview_en: '{{shop_name}}: IRN request failed for bill {{bill_no}}. Open the console.',
  },
  {
    template_key: 'gstn_fail',
    meta_template_name: 'namma_gstn_fail',
    language: 'en',
    i18n_key: 'whatsapp.templates.gstnFail.body',
    transactional: true,
    body_preview_en: '{{shop_name}}: GSTN request failed. Open the console. 2B may be stale.',
  },
  {
    template_key: 'subscription_dunning',
    meta_template_name: 'namma_subscription_dunning',
    language: 'en',
    i18n_key: 'whatsapp.templates.subscriptionDunning.body',
    transactional: true,
    body_preview_en: '{{shop_name}}: Namma MedMate subscription payment is due.',
  },
  {
    template_key: 'rx_pending',
    meta_template_name: 'namma_rx_pending',
    language: 'en',
    i18n_key: 'whatsapp.templates.rxPending.body',
    transactional: true,
    body_preview_en: '{{shop_name}}: a prescription has been waiting more than 2 hours.',
  },
  {
    template_key: 'kiosk_token',
    meta_template_name: 'namma_kiosk_token',
    language: 'en',
    i18n_key: 'whatsapp.templates.kioskToken.body',
    transactional: true,
    body_preview_en: '{{shop_name}}: your pickup token is {{token}}. Pay cash at the counter.',
  },
  {
    template_key: 'bill_share',
    meta_template_name: 'namma_bill_share',
    language: 'en',
    i18n_key: 'whatsapp.templates.billShare.body',
    transactional: true,
    body_preview_en: '{{shop_name}}: bill {{bill_no}} total {{amount}}.',
  },
];

const MANDATORY_KEYS = new Set<WhatsAppTemplateKey>(['irn_fail', 'gstn_fail', 'licence_expiry']);

const PURPOSE_BY_TEMPLATE: Record<WhatsAppTemplateKey, WhatsAppPurpose> = {
  login_otp: 'otp',
  khata_remind: 'khata_remind',
  refill: 'refill',
  low_stock: 'low_stock',
  licence_expiry: 'licence',
  irn_fail: 'irn_fail',
  gstn_fail: 'gstn_fail',
  subscription_dunning: 'dunning',
  rx_pending: 'rx_pending',
  kiosk_token: 'kiosk_token',
  bill_share: 'bill_share',
};

export function getTemplate(key: string): TemplateCatalogueEntry | undefined {
  return TEMPLATE_CATALOGUE.find((entry) => entry.template_key === key);
}

export function isMandatoryTemplate(key: WhatsAppTemplateKey): boolean {
  return MANDATORY_KEYS.has(key);
}

export function purposeForTemplate(
  key: WhatsAppTemplateKey,
  campaignId: string | null,
): WhatsAppPurpose {
  if (campaignId) {
    return 'campaign';
  }
  return PURPOSE_BY_TEMPLATE[key];
}

export function inboxPreview(key: WhatsAppTemplateKey, shopName: string): string {
  if (key === 'login_otp') {
    return 'Login code sent.';
  }
  return (
    TEMPLATE_CATALOGUE.find((entry) => entry.template_key === key)
      ?.body_preview_en.replace('{{shop_name}}', shopName)
      .replace(/\{\{[^}]+\}\}/g, '…') ?? `${shopName}: WhatsApp sent.`
  );
}

export function bodyParamsForMeta(
  key: WhatsAppTemplateKey,
  shopName: string,
  params: Record<string, unknown>,
): string[] {
  const placeholders = [...(getTemplate(key)?.body_preview_en.matchAll(/\{\{([^}]+)\}\}/g) ?? [])]
    .map((match) => match[1])
    .filter((name): name is string => typeof name === 'string' && name.length > 0);
  return placeholders.map((name) => {
    if (name === 'shop_name') {
      return shopName;
    }
    if (name === 'otp') {
      return String(params.otp ?? '');
    }
    const value = params[name];
    return typeof value === 'string' ? value : '';
  });
}
