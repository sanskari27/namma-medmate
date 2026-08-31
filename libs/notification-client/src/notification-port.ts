export type NotificationChannel = 'email' | 'sms' | 'push';

export interface Notification {
  channel: NotificationChannel;
  to: string;
  body: string;
}

export interface NotificationClient {
  send(notification: Notification): Promise<void>;
}

export class MemoryNotificationClient implements NotificationClient {
  readonly sent: Notification[] = [];

  async send(notification: Notification): Promise<void> {
    this.sent.push(notification);
  }
}
