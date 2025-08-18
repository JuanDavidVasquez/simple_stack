import { Container } from 'typedi';
import { NotificationClientService } from '../../adapters/notifications/notification-client.service';
import { UserRepository } from './user.repository';
import { UserController } from './user.controller';
import { AppModule } from '../../modules';
import { createUserRouter } from './user.routes';
import { Router } from 'express';

export class UserModule {
  private static router: Router;

  static register() {
    console.log('[UserModule] Registrando dependencias...');
    Container.set('UserRepository', UserRepository);

    if (!Container.has(NotificationClientService)) {
      Container.set(NotificationClientService, new NotificationClientService());
    }
  }

  static controller(): UserController {
    AppModule.assertModule('UserModule');
    return Container.get(UserController);
  }

  static routes(): Router {
    AppModule.assertModule('UserModule');

    if (!this.router) {
      this.router = createUserRouter(this.controller());
    }
    return this.router;
  }
}
