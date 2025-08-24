// src/services/notification-client.service.ts

import { Service } from "typedi";
import { config } from "../../core/config/env";
import jwtUtil from "../../shared/utils/jwt.util";
import axios, { AxiosInstance } from "axios";
import { NotificationPayload } from "../../shared/interfaces/notification.interface";


@Service()
export class NotificationClientService {
  private client: AxiosInstance;
  private serviceToken: string | null = null;
  private tokenExpiresAt: Date | null = null;

  constructor() {
    if (process.env.NODE_ENV === 'local') {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }

    this.client = axios.create({
      baseURL: config.notificationApi.url,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    });
    this.client.interceptors.request.use(
      async (config) => {
        const token = await this.getValidToken();
        config.headers.Authorization = `Bearer ${token}`;
        return config;
      },
      (error) => Promise.reject(error)
    );
  }

  /**
   * Genera token de servicio (válido por 5 mins)
   */
  private async getValidToken(): Promise<string> {
    if (!this.serviceToken || !this.tokenExpiresAt || this.tokenExpiresAt.getTime() - Date.now() < 30_000) {
      this.serviceToken = jwtUtil.generateServiceToken(
        'main-api',
        ['notification:send', 'notification:bulk']
      );
      this.tokenExpiresAt = new Date(Date.now() + 4 * 60 * 1000);
    }
    return this.serviceToken;
  }

  /**
   * Envía una notificación única
   */
  async send(payload: NotificationPayload): Promise<any> {
    try {
      const response = await this.client.post(`${payload.url}`, payload);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Notification service error:', {
          message: error.message,
          code: error.code,
          config: error.config,
          response: error.response?.data
        });
        throw new Error(error.response?.data?.message || error.message || 'Failed to send notification');
      }
      throw error;
    }
  }

  /**
   * Envía notificaciones en lote
   */
  async sendBulk(notifications: NotificationPayload[]): Promise<any> {
    try {
      const response = await this.client.post('/notify/bulk', { notifications });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Notification service error:', error.response?.data);
        throw new Error(error.response?.data?.message || 'Failed to send bulk notifications');
      }
      throw error;
    }
  }

  /**
   * Verifica estado del servicio de notificaciones
   */
  async getStatus(): Promise<any> {
    try {
      const response = await this.client.get('/status');
      return response.data;
    } catch (error) {
      console.error('Failed to get notification service status:', error);
      return { status: 'unknown', error: 'Could not reach notification service' };
    }
  }
}