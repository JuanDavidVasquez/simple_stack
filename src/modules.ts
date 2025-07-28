// src/modules.ts 
import { UserModule } from './api/users/user.module';
// ⚙️ Si tienes otros módulos, los importas igual:
// import { NotificationModule } from './api/notifications/notification.module';
// import { AuthModule } from './api/auth/auth.module';

export class AppModule {
  static register() {
    console.log('[AppModule] Registrando módulos...');

    // ✅ Cada módulo se encarga de registrar sus dependencias
    UserModule.register();
    // NotificationModule.register();
    // AuthModule.register();
    // Otros módulos...

    console.log('[AppModule] Todos los módulos registrados.');
  }
}
