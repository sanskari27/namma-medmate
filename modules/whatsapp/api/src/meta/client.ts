export const META_MESSAGING_PRODUCT = 'whatsapp' as const;

export interface MetaSendInput {
  to: string;
  templateName: string;
  language: string;
  bodyParams: string[];
}

export interface MetaSendResult {
  ok: boolean;
  retryable: boolean;
  metaMessageId?: string;
  errorCode?: string;
}

export interface MetaClient {
  sendTemplate(input: MetaSendInput): Promise<MetaSendResult>;
}
