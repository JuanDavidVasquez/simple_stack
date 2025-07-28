// src/api/auth/auth.module.ts

import { Container } from 'typedi';
import { AuthController } from './auth.controller';
import { NotificationClientService } from '../notifications/notification-client.service';

export class AuthModule {
  static register() {
    // ✅ Registra el servicio de notificaciones como singleton
    if (!Container.has(NotificationClientService)) {
      Container.set(NotificationClientService, new NotificationClientService());
    }
  }

  static controller(): AuthController {
    return Container.get(AuthController);
  }
}
