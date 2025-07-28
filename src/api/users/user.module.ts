// src/api/users/user.module.ts

import { Container } from 'typedi';
import { NotificationClientService } from '../notifications/notification-client.service';
import { UserRepository } from './user.repository';
import { UserController } from './user.controller';

export class UserModule {
    static register() {
        Container.set('UserRepository', UserRepository);

        // ✅ Registra el servicio de notificaciones como singleton
        if (!Container.has(NotificationClientService)) {
            Container.set(NotificationClientService, new NotificationClientService());
        }

    }

    static controller(): UserController {
        return Container.get(UserController);
    }
}
