import { Response } from 'express';
import { config } from '../../core/config/env';
import { LocalizedRequest } from '../../i18n/middleware';
import { 
  SuccessResponse, 
  ErrorResponse, 
  PaginatedResponse,
  BulkOperationResponse,
  ValidationError,
  ResponseBuilder,
  PaginationMetadata,
  ResponseMetadata,
  TypedResponse
} from '../interfaces/response.interface';
import { ErrorCode } from '../enums/ErrorCode.enum';

/**
 * Utilidad para manejo consistente de respuestas HTTP
 * Integra i18n y mantiene un formato estándar en toda la API
 */
export class ResponseUtil {
  /**
   * Respuesta exitosa con i18n
   */
  static success<T>(
    req: LocalizedRequest,
    res: Response,
    messageKey: string,
    data?: T,
    statusCode: number = 200,
    interpolations?: Record<string, any>
  ): Response<SuccessResponse<T>> {
    const message = req.t(messageKey, interpolations);
    
    const response: SuccessResponse<T> = {
      status: 'success',
      message,
      ...(data !== undefined && { data }),
      ...(interpolations && { 
        metadata: {
          ...interpolations,
          timestamp: new Date().toISOString(),
          language: req.language
        }
      })
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Respuesta de error con i18n
   */
  static error(
    req: LocalizedRequest,
    res: Response,
    messageKey: string,
    statusCode: number = 500,
    interpolations?: Record<string, any>,
    code?: ErrorCode | string,
    errors?: ValidationError[]
  ): Response<ErrorResponse> {
    const message = req.t(messageKey, interpolations);
    
    const response: ErrorResponse = {
      status: 'error',
      message,
      ...(code && { code }),
      ...(errors && { errors }),
      ...(config.app.env === 'local' && statusCode >= 500 && {
        stack: new Error().stack
      })
    };

    // Log error in local
    if (config.app.env === 'local' && statusCode >= 500) {
      console.error('Error response:', response);
    }

    return res.status(statusCode).json(response);
  }

  /**
   * Respuesta paginada con i18n
   */
  static paginated<T>(
    req: LocalizedRequest,
    res: Response,
    messageKey: string,
    items: T[],
    pagination: PaginationMetadata,
    statusCode: number = 200,
    interpolations?: Record<string, any>
  ): Response<PaginatedResponse<T>> {
    const message = req.t(messageKey, interpolations);
    
    const response: PaginatedResponse<T> = {
      status: 'success',
      ...(message && { message }),
      data: {
        items,
        pagination
      },
      metadata: {
        timestamp: new Date().toISOString(),
        language: req.language,
        ...interpolations
      }
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Respuesta de operación bulk con i18n
   */
  static bulk<T>(
    req: LocalizedRequest,
    res: Response,
    messageKey: string,
    successful: T[],
    failed: Array<{ item: any; error: string; code?: string }>,
    statusCode: number = 200
  ): Response<BulkOperationResponse<T>> {
    const message = req.t(messageKey);
    const total = successful.length + failed.length;
    
    const response: BulkOperationResponse<T> = {
      status: failed.length === 0 ? 'success' : 'partial',
      message,
      data: {
        successful,
        failed,
        summary: {
          total,
          succeeded: successful.length,
          failed: failed.length
        }
      }
    };

    return res.status(statusCode).json(response);
  }

  // =====================================================
  // Métodos sin i18n (para middleware o casos especiales)
  // =====================================================

  /**
   * Respuesta exitosa directa (sin i18n)
   */
  static successDirect<T>(
    res: Response,
    data?: T,
    message?: string,
    statusCode: number = 200,
    metadata?: ResponseMetadata
  ): Response<SuccessResponse<T>> {
    const response = ResponseBuilder.success(data, message, {
      ...metadata,
      timestamp: new Date().toISOString()
    });

    return res.status(statusCode).json(response);
  }

  /**
   * Respuesta de error directa (sin i18n)
   */
  static errorDirect(
    res: Response,
    message: string,
    statusCode: number = 500,
    code?: ErrorCode | string,
    errors?: ValidationError[]
  ): Response<ErrorResponse> {
    const response = ResponseBuilder.error(message, code, errors);

    // En desarrollo, agregar stack trace
    if (config.app.env === 'local' && statusCode >= 500) {
      response.stack = new Error().stack;
      console.error('Error response:', response);
    }

    return res.status(statusCode).json(response);
  }

  /**
   * Respuesta paginada directa (sin i18n)
   */
  static paginatedDirect<T>(
    res: Response,
    items: T[],
    pagination: PaginationMetadata,
    message?: string,
    statusCode: number = 200
  ): Response<PaginatedResponse<T>> {
    const response = ResponseBuilder.paginated(items, pagination, message);
    return res.status(statusCode).json(response);
  }

  // =====================================================
  // Métodos de conveniencia para respuestas comunes
  // =====================================================

  /**
   * 201 Created
   */
  static created<T>(
    req: LocalizedRequest, 
    res: Response, 
    messageKey: string, 
    data: T,
    interpolations?: Record<string, any>
  ): Response<SuccessResponse<T>> {
    return ResponseUtil.success(req, res, messageKey, data, 201, interpolations);
  }

  /**
   * 204 No Content
   */
  static noContent(res: Response): Response {
    return res.status(204).send();
  }

  /**
   * 400 Bad Request
   */
  static badRequest(
    req: LocalizedRequest, 
    res: Response, 
    messageKey: string, 
    errors?: ValidationError[],
    interpolations?: Record<string, any>
  ): Response<ErrorResponse> {
    return ResponseUtil.error(
      req, 
      res, 
      messageKey, 
      400, 
      interpolations, 
      ErrorCode.BAD_REQUEST, 
      errors
    );
  }

  /**
   * 401 Unauthorized
   */
  static unauthorized(
    req: LocalizedRequest, 
    res: Response, 
    messageKey: string,
    interpolations?: Record<string, any>
  ): Response<ErrorResponse> {
    return ResponseUtil.error(
      req, 
      res, 
      messageKey, 
      401, 
      interpolations, 
      ErrorCode.UNAUTHORIZED
    );
  }

  /**
   * 403 Forbidden
   */
  static forbidden(
    req: LocalizedRequest, 
    res: Response, 
    messageKey: string,
    interpolations?: Record<string, any>
  ): Response<ErrorResponse> {
    return ResponseUtil.error(
      req, 
      res, 
      messageKey, 
      403, 
      interpolations, 
      ErrorCode.FORBIDDEN
    );
  }

  /**
   * 404 Not Found
   */
  static notFound(
    req: LocalizedRequest, 
    res: Response, 
    messageKey: string,
    interpolations?: Record<string, any>
  ): Response<ErrorResponse> {
    return ResponseUtil.error(
      req, 
      res, 
      messageKey, 
      404, 
      interpolations, 
      ErrorCode.NOT_FOUND
    );
  }

  /**
   * 409 Conflict
   */
  static conflict(
    req: LocalizedRequest, 
    res: Response, 
    messageKey: string,
    interpolations?: Record<string, any>
  ): Response<ErrorResponse> {
    return ResponseUtil.error(
      req, 
      res, 
      messageKey, 
      409, 
      interpolations, 
      ErrorCode.CONFLICT
    );
  }

  /**
   * 422 Unprocessable Entity (para errores de validación complejos)
   */
  static unprocessableEntity(
    req: LocalizedRequest,
    res: Response,
    messageKey: string,
    errors: ValidationError[],
    interpolations?: Record<string, any>
  ): Response<ErrorResponse> {
    return ResponseUtil.error(
      req,
      res,
      messageKey,
      422,
      interpolations,
      ErrorCode.VALIDATION_ERROR,
      errors
    );
  }

  /**
   * 423 Locked
   */
  static locked(
    req: LocalizedRequest,
    res: Response,
    messageKey: string,
    interpolations?: Record<string, any>
  ): Response<ErrorResponse> {
    return ResponseUtil.error(
      req,
      res,
      messageKey,
      423,
      interpolations,
      ErrorCode.RESOURCE_LOCKED
    );
  }

  /**
   * 429 Too Many Requests
   */
  static tooManyRequests(
    req: LocalizedRequest, 
    res: Response, 
    messageKey: string,
    retryAfter?: number,
    interpolations?: Record<string, any>
  ): Response<ErrorResponse> {
    if (retryAfter) {
      res.setHeader('Retry-After', retryAfter);
    }
    
    return ResponseUtil.error(
      req, 
      res, 
      messageKey, 
      429, 
      { ...interpolations, retryAfter }, 
      ErrorCode.RATE_LIMIT_EXCEEDED
    );
  }

  /**
   * 500 Internal Server Error
   */
  static internalError(
    req: LocalizedRequest, 
    res: Response, 
    messageKey: string, 
    error?: any,
    interpolations?: Record<string, any>
  ): Response<ErrorResponse> {
    // En producción, usar mensaje genérico
    if (config.app.env === 'production') {
      return ResponseUtil.error(
        req, 
        res, 
        messageKey, 
        500, 
        interpolations, 
        ErrorCode.INTERNAL_ERROR
      );
    }
    
    // En desarrollo, incluir detalles del error
    return ResponseUtil.error(
      req, 
      res, 
      messageKey, 
      500, 
      { 
        ...interpolations,
        errorDetail: error?.message || 'Unknown error',
        errorName: error?.name,
        errorStack: error?.stack
      }, 
      ErrorCode.INTERNAL_ERROR
    );
  }

  /**
   * 503 Service Unavailable
   */
  static serviceUnavailable(
    req: LocalizedRequest,
    res: Response,
    messageKey: string,
    retryAfter?: number,
    interpolations?: Record<string, any>
  ): Response<ErrorResponse> {
    if (retryAfter) {
      res.setHeader('Retry-After', retryAfter);
    }
    
    return ResponseUtil.error(
      req,
      res,
      messageKey,
      503,
      { ...interpolations, retryAfter },
      'SERVICE_UNAVAILABLE'
    );
  }

  // =====================================================
  // Métodos auxiliares
  // =====================================================

  /**
   * Construye errores de validación desde Zod o similares
   */
  static buildValidationErrors(zodErrors: any[]): ValidationError[] {
    return zodErrors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
      value: err.received
    }));
  }

  /**
   * Envuelve un handler async para manejo automático de errores
   */
  static asyncHandler<T extends LocalizedRequest>(
    handler: (req: T, res: Response) => Promise<void>
  ) {
    return async (req: T, res: Response, next: any) => {
      try {
        await handler(req, res);
      } catch (error) {
        console.error('Unhandled error in async handler:', error);
        
        if (!res.headersSent) {
          ResponseUtil.internalError(
            req,
            res,
            'errors.general.internal_server',
            error
          );
        }
      }
    };
  }

  /**
   * Método helper para extraer metadata de paginación desde PaginatedResponse
   */
  static extractPaginationMetadata(paginatedData: any): PaginationMetadata {
    return {
      total: paginatedData.total,
      page: paginatedData.page,
      limit: paginatedData.limit,
      totalPages: paginatedData.totalPages,
      hasNextPage: paginatedData.hasNextPage,
      hasPreviousPage: paginatedData.hasPreviousPage
    };
  }
}