export interface SessionConfig {
  maxConcurrentSessions?: number; // Máximo de sesiones concurrentes por usuario
  sessionTimeout?: number; // Tiempo en minutos de inactividad antes de cerrar sesión
  allowMultipleDevices?: boolean; // Permitir múltiples dispositivos
  requireDeviceVerification?: boolean; // Requerir verificación para nuevos dispositivos
  enableGeolocation?: boolean; // Habilitar geolocalización por IP
}

export interface CreateSessionData {
  userId: string;
  email: string;
  role: string;
  userAgent?: string;
  ipAddress?: string;
  deviceName?: string;
  sourceTable?: string; // Tabla de origen del usuario
}

export interface SessionInfo {
  sessionId: string;
  deviceName?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  location?: string;
  lastActivity?: Date;
  createdAt: Date;
  isActive: boolean;
  isCurrent: boolean;
  sourceTable?: string;
}