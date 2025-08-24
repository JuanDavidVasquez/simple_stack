export interface NotificationPayload {
  type: 'email' | 'sms' | 'push';
  to: string | string[];
  data: Record<string, any>;
  language?: string;
  priority?: 'low' | 'normal' | 'high';
  url: string;
}
