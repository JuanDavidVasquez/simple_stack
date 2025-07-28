import { Request } from 'express';
import { UserRole } from '../constants/roles';
import { TFunction } from 'i18next';
import { ParsedQs } from 'qs';
import { ParamsDictionary } from 'express-serve-static-core';

/**
 * Usuario autenticado en el sistema
 */
export interface AuthenticatedUser {
  userId: string;
  email?: string;
  role?: UserRole;
  sessionId: string;
}

/**
 * Información de la sesión actual
 */
export interface SessionInfo {
  id: number;
  sessionId: string;
  deviceName: string;
  ipAddress: string;
  lastActivity: Date;
}

/**
 * Request con funcionalidad de internacionalización (i18n)
 */
export interface LocalizedRequest extends Request {
  t: TFunction;
  language: string;
  languages: string[];
  i18n: any;
}

/**
 * Request autenticado con usuario y sesión
 */
export interface AuthenticatedRequest extends LocalizedRequest {
  user: AuthenticatedUser;
  sessionId?: string;
  session?: SessionInfo;
}

/**
 * Request tipado con body específico
 */
export interface TypedRequestBody<T> extends LocalizedRequest {
  body: T;
}

/**
 * Request tipado con query parameters específicos
 */

export interface TypedRequestQuery<T> extends LocalizedRequest {
  query: T & ParsedQs;
}

/**
 * Request tipado con params específicos
 */

export interface TypedRequestParams<T extends ParamsDictionary = ParamsDictionary> extends LocalizedRequest {
  params: T;
}

/**
 * Request completamente tipado (body, params, query)
 */
export interface TypedRequest<
  TBody = any,
  TParams extends ParamsDictionary = ParamsDictionary,
  TQuery extends ParsedQs = ParsedQs
> extends LocalizedRequest {
  body: TBody;
  params: TParams;
  query: TQuery;
}

/**
 * Request autenticado y completamente tipado
 */
export interface AuthenticatedTypedRequest<TBody = any, TParams extends ParamsDictionary = ParamsDictionary, TQuery = any> 
  extends AuthenticatedRequest {
  body: TBody;
  params: TParams;
  query: TQuery & ParsedQs;
}

/**
 * Tipos de respuesta para paginación
 */
export interface PaginatedRequestBody {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, any>;
}

/**
 * Request para endpoints paginados
 */
export interface PaginatedRequest extends TypedRequestBody<PaginatedRequestBody> {}

/**
 * Tipos comunes para params
 */
export interface IdParams {
  id: string;
}

export interface EmailParams {
  email: string;
}

export interface RoleParams {
  role: string;
}

export interface SessionIdParams {
  sessionId: string;
}

/**
 * Tipos comunes para query
 */
export interface SearchQuery {
  search?: string;
  page?: number;
  limit?: number;
}

export interface FilterQuery {
  role?: UserRole;
  isActive?: boolean;
  isVerified?: boolean;
  createdFrom?: string;
  createdTo?: string;
}

/**
 * Tipos comunes para body de auth
 */
export interface LoginBody {
  email: string;
  password: string;
  deviceName?: string;
}

export interface RefreshTokenBody {
  refreshToken: string;
}

export interface ChangePasswordBody {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  logoutOtherDevices?: boolean;
}

export interface ResetPasswordBody {
  email: string;
}

/**
 * Tipos comunes para body de usuario
 */
export interface CreateUserBody {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  username?: string;
  role?: UserRole;
  isActive?: boolean;
  isVerified?: boolean;
  lenguaje?: string;
}

export interface UpdateUserBody {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  role?: UserRole;
  isActive?: boolean;
  isVerified?: boolean;
  lenguaje?: string;
}

export interface UpdateRoleBody {
  role: UserRole;
}

export interface ActivateUserBody {
  id: string;
}



/**
 * Ejemplo de uso en controllers:
 * 
 * // Login endpoint
 * public login = async (req: TypedRequestBody<LoginBody>, res: Response) => {
 *   const { email, password, deviceName } = req.body; // Tipado!
 * }
 * 
 * // Get user by ID
 * public getUserById = async (req: TypedRequestParams<IdParams>, res: Response) => {
 *   const { id } = req.params; // Tipado!
 * }
 * 
 * // Search users
 * public searchUsers = async (req: TypedRequestQuery<SearchQuery>, res: Response) => {
 *   const { search, page, limit } = req.query; // Tipado!
 * }
 * 
 * // Update user (autenticado + tipado)
 * public updateUser = async (
 *   req: AuthenticatedTypedRequest<UpdateUserBody, IdParams>,
 *   res: Response
 * ) => {
 *   const userId = req.user.userId; // Usuario autenticado
 *   const { id } = req.params; // ID del usuario a actualizar
 *   const updateData = req.body; // Datos de actualización
 * }
 */
