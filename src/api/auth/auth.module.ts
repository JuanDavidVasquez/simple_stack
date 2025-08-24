// src/api/auth/auth.module.ts
import { Container } from 'typedi';
import { AuthController } from './auth.controller';
import { NotificationClientService } from '../../adapters/notifications/notification-client.service';
import { AppModule } from '../../modules';
import { createAuthRouter } from './auth.routes'; // 👈 tu archivo de rutas
import { Router } from 'express';

export class AuthModule {
  private static router: Router;

  static register() {
    console.log('[AuthModule] Registrando dependencias...');
    if (!Container.has(NotificationClientService)) {
      Container.set(NotificationClientService, new NotificationClientService());
    }
  }

  static controller(): AuthController {
    AppModule.assertModule('AuthModule'); 
    return Container.get(AuthController);
  }

  static async routes(): Promise<Router> {
    AppModule.assertModule('AuthModule'); 

    if (!this.router) {
      const authController = this.controller();
      this.router = await createAuthRouter(authController);
    }
    return this.router;
  }
}
