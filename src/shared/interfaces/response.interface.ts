import { Response } from 'express';
import { ErrorCode } from '../enums/ErrorCode.enum';

/**
 * Respuesta exitosa estándar
 */
export interface SuccessResponse<T = any> {
  status: 'success';
  message?: string;
  data?: T;
  metadata?: ResponseMetadata;
}

/**
 * Respuesta de error estándar
 */
export interface ErrorResponse {
  status: 'error';
  message: string;
  code?: ErrorCode | string;
  errors?: ValidationError[];
  stack?: string; // Solo en desarrollo
}

/**
 * Metadata adicional para respuestas
 */
export interface ResponseMetadata {
  timestamp?: string;
  version?: string;
  requestId?: string;
  [key: string]: any;
}

/**
 * Error de validación individual
 */
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
  value?: any;
}

/**
 * Respuesta paginada
 */
export interface PaginatedResponse<T> {
  status: 'success';
  message?: string;
  data: {
    items: T[];
    pagination: PaginationMetadata;
  };
  metadata?: ResponseMetadata;
}

/**
 * Metadata de paginación
 */
export interface PaginationMetadata {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Respuesta de autenticación
 */
export interface AuthResponse {
  status: 'success';
  message: string;
  data: {
    user: UserData;
    tokens: TokenData;
    session?: SessionData;
  };
}

/**
 * Datos de usuario en respuesta
 */
export interface UserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  username?: string;
  role: string;
  isActive: boolean;
  isVerified: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Datos de tokens
 */
export interface TokenData {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: Date;
  refreshExpiresAt: Date;
}

/**
 * Datos de sesión
 */
export interface SessionData {
  sessionId: string;
  deviceName?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  location?: string;
  createdAt: Date;
}

/**
 * Respuesta de operación bulk/batch
 */
export interface BulkOperationResponse<T = any> {
  status: 'success' | 'partial';
  message: string;
  data: {
    successful: T[];
    failed: BulkOperationError[];
    summary: {
      total: number;
      succeeded: number;
      failed: number;
    };
  };
}

/**
 * Error en operación bulk
 */
export interface BulkOperationError {
  item: any;
  error: string;
  code?: string;
}

/**
 * Respuesta de salud/health check
 */
export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  message: string;
  data: {
    uptime: number;
    timestamp: string;
    environment: string;
    version: string;
    services: {
      [serviceName: string]: ServiceStatus;
    };
  };
}

/**
 * Estado de un servicio
 */
export interface ServiceStatus {
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  message?: string;
  lastCheck?: string;
}

/**
 * Respuesta de archivo/download
 */
export interface FileResponse {
  status: 'success';
  message: string;
  data: {
    filename: string;
    size: number;
    mimeType: string;
    url?: string;
    expiresAt?: Date;
  };
}

/**
 * Respuesta de progreso (para operaciones largas)
 */
export interface ProgressResponse {
  status: 'in_progress';
  message: string;
  data: {
    taskId: string;
    progress: number; // 0-100
    currentStep?: string;
    estimatedTimeRemaining?: number; // segundos
  };
}

/**
 * Tipos de respuesta para WebSocket/SSE
 */
export interface RealtimeResponse<T = any> {
  event: string;
  data: T;
  timestamp: string;
  id?: string;
}

/**
 * Response tipado para Express
 */
export interface TypedResponse<T = any> extends Response {
  json(data: T): this;
}

/**
 * Helpers para construir respuestas consistentes
 */
export class ResponseBuilder {
  /**
   * Construye una respuesta exitosa
   */
  static success<T>(data?: T, message?: string, metadata?: ResponseMetadata): SuccessResponse<T> {
    return {
      status: 'success',
      ...(message && { message }),
      ...(data !== undefined && { data }),
      ...(metadata && { metadata })
    };
  }

  /**
   * Construye una respuesta de error
   */
  static error(message: string, code?: string, errors?: ValidationError[]): ErrorResponse {
    return {
      status: 'error',
      message,
      ...(code && { code }),
      ...(errors && { errors })
    };
  }

  /**
   * Construye una respuesta paginada
   */
  static paginated<T>(
    items: T[],
    pagination: PaginationMetadata,
    message?: string
  ): PaginatedResponse<T> {
    return {
      status: 'success',
      ...(message && { message }),
      data: {
        items,
        pagination
      }
    };
  }

  /**
   * Construye una respuesta de autenticación
   */
  static auth(user: UserData, tokens: TokenData, session?: SessionData): AuthResponse {
    return {
      status: 'success',
      message: 'Authentication successful',
      data: {
        user,
        tokens,
        ...(session && { session })
      }
    };
  }
}

/**
 * Tipo para respuestas asíncronas de Express
 */
export type AsyncResponse = Promise<Response | void>;

/**
 * Tipo para handlers de Express con respuestas tipadas
 */
export type TypedRequestHandler<
  TReq extends Request = Request,
  TRes = any
> = (req: TReq, res: TypedResponse<TRes>) => AsyncResponse;

/**
 * Ejemplo de uso en controllers:
 * 
 * // Respuesta exitosa simple
 * const response: SuccessResponse<User> = ResponseBuilder.success(user, 'User created');
 * res.status(201).json(response);
 * 
 * // Respuesta paginada
 * const response: PaginatedResponse<User> = ResponseBuilder.paginated(
 *   users,
 *   { total: 100, page: 1, limit: 10, totalPages: 10, hasNextPage: true, hasPreviousPage: false }
 * );
 * res.json(response);
 * 
 * // Respuesta de error con validación
 * const response: ErrorResponse = ResponseBuilder.error(
 *   'Validation failed',
 *   ErrorCode.VALIDATION_ERROR,
 *   [
 *     { field: 'email', message: 'Invalid email format' },
 *     { field: 'password', message: 'Password too short' }
 *   ]
 * );
 * res.status(400).json(response);
 * 
 * // Con TypedResponse
 * public getUser = async (req: Request, res: TypedResponse<SuccessResponse<User>>): Promise<void> => {
 *   const user = await this.userService.getUser(req.params.id);
 *   res.json(ResponseBuilder.success(user)); // Tipado!
 * }
 * 
 * // Con handler completamente tipado
 * const getUserHandler: TypedRequestHandler<
 *   TypedRequestParams<IdParams>,
 *   SuccessResponse<User>
 * > = async (req, res) => {
 *   const user = await userService.getUser(req.params.id);
 *   res.json(ResponseBuilder.success(user));
 * };
 */