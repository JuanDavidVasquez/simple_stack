import { Router } from 'express';
import { UserModule } from './api/users/user.module';
import { AuthModule } from './api/auth/auth.module';

export class AppModule {
  private static registeredModules: string[] = [];

  static async register(app: Router) {
    console.log('[AppModule] Registrando módulos...');
    this.registeredModules = [];

    UserModule.register();
    this.registeredModules.push('UserModule');
    app.use('/users', UserModule.routes());

    AuthModule.register();
    this.registeredModules.push('AuthModule');
    app.use('/auth', await AuthModule.routes());

    console.log('[AppModule] Todos los módulos registrados:', this.registeredModules);
  }

  static assertModule(moduleName: string) {
    if (!this.registeredModules.includes(moduleName)) {
      throw new Error(`[AppModule] ❌ El módulo ${moduleName} no fue registrado.`);
    }
  }
}
