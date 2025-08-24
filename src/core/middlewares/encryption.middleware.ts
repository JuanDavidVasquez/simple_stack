// src/core/middlewares/encryption.middleware.ts - CORREGIDO

import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';
import { ResponseUtil } from '../../shared/utils/response.util';
import setupLogger from '../../shared/utils/logger';
import { config } from '../config/env';

// ✅ Extender Request para incluir datos desencriptados
declare global {
  namespace Express {
    interface Request {
      decrypted?: any;
      encryptionMetadata?: {
        iv: string;
        timestamp: number;
        method: 'aes-256-gcm';
        wasEncrypted: boolean;
      };
    }
  }
}

class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly encryptionKey: Buffer;
  private readonly payloadTTL = config.app.env === 'production' 
    ? 5 * 60 * 1000        // 5 minutos en producción
    : 30 * 60 * 1000;      // 30 minutos en desarrollo/testing
    
  private readonly logger = setupLogger({
    ...config.logging,
    dir: `${config.logging.dir}/services/encryption`,
  });
  
  constructor() {
    const defaultKey = 'dev-key-32-chars-minimum-required!!-change-in-production';
    const key = process.env.ENCRYPTION_KEY || config.security?.encryptionKey || defaultKey;
    
    if ((!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY.length < 32) && 
        config.app.env !== 'production') {
      this.logger.warn('⚠️ ENCRYPTION_KEY not set or too short. Using default key for DEVELOPMENT ONLY!');
    }
    
    if (config.app.env === 'production' && !process.env.ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY environment variable is required in production');
    }
    
    const finalKey = key.padEnd(32, 'x');
    this.encryptionKey = crypto.createHash('sha256').update(finalKey).digest();
    
    this.logger.info('🔐 EncryptionService initialized', {
      ttlMinutes: this.payloadTTL / 60000,
      environment: config.app.env
    });
  }

  decrypt(encryptedData: string, iv: string, authTag?: string): any {
    const ivBuffer = Buffer.from(iv, 'hex');
    
    if (ivBuffer.length !== 16) {
      throw new Error('Invalid IV length');
    }
    
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.encryptionKey,
      ivBuffer
    );
    
    if (authTag) {
      (decipher as any).setAuthTag(Buffer.from(authTag, 'hex'));
    }
    
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    const payload = JSON.parse(decrypted);
    
    // Validar timestamp para prevenir replay attacks
    const currentTime = Date.now();
    const ageMs = currentTime - payload.timestamp;
    
    this.logger.debug('Payload age check', {
      currentTime,
      payloadTime: payload.timestamp,
      ageMs,
      ageMinutes: ageMs / 60000,
      ttlMs: this.payloadTTL,
      ttlMinutes: this.payloadTTL / 60000,
      isExpired: ageMs > this.payloadTTL
    });
    
    if (ageMs > this.payloadTTL) {
      throw new Error(`Payload expired: ${Math.round(ageMs/60000)} minutes old, max ${Math.round(this.payloadTTL/60000)} minutes allowed`);
    }
    
    return payload;
  }

  generateIV(seed?: string): string {
    const timestamp = Date.now().toString();
    const randomBytes = crypto.randomBytes(8).toString('hex');
    const data = seed ? `${seed}-${timestamp}-${randomBytes}` : `${timestamp}-${randomBytes}`;
    
    return crypto.createHash('md5').update(data).digest().toString('hex');
  }
}

// Singleton
let encryptionService: EncryptionService | null = null;

const getOrCreateEncryptionService = (): EncryptionService => {
  if (!encryptionService) {
    encryptionService = new EncryptionService();
  }
  return encryptionService;
};

const logger = setupLogger({
  ...config.logging,
  dir: `${config.logging.dir}/middlewares/encryption`,
});

/**
 * ✅ MIDDLEWARE PRINCIPAL - CORREGIDO PARA TU CASO
 * Detecta y procesa automáticamente passwords encriptados
 */
export const passwordEncryptionMiddleware = () => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const service = getOrCreateEncryptionService();
      
      logger.info('🔍 Processing request through encryption middleware', {
        path: req.path,
        method: req.method,
        bodyKeys: Object.keys(req.body || {}),
        hasEncryptedPassword: !!req.body.encryptedPassword,
        hasIV: !!req.body.iv,
        hasAuthTag: !!req.body.authTag
      });
      
      // 🔍 DETECTAR FORMATO DE TU PAYLOAD
      // Tu formato: { email, encryptedPassword, iv, authTag, deviceName }
      const hasEncryptedPassword = !!(
        req.body.encryptedPassword && 
        req.body.iv && 
        req.body.authTag
      );
      
      // También soportar cambio de contraseña
      const hasEncryptedPasswordChange = !!(
        req.body.encryptedCurrentPassword && 
        req.body.encryptedNewPassword &&
        req.body.iv
      );
      
      // Si no hay encriptación, continuar con datos planos
      if (!hasEncryptedPassword && !hasEncryptedPasswordChange) {
        logger.debug('No encryption detected, using plain data', {
          path: req.path,
          hasPlainPassword: !!req.body.password
        });
        
        // Marcar que no estaba encriptado
        req.encryptionMetadata = {
          iv: '',
          timestamp: Date.now(),
          method: 'aes-256-gcm',
          wasEncrypted: false
        };
        
        next();
        return;
      }
      
      // ✅ PROCESAR LOGIN ENCRIPTADO
      if (hasEncryptedPassword) {
        logger.info('🔐 Processing encrypted login', {
          email: req.body.email,
          ivPrefix: req.body.iv.substring(0, 8) + '...'
        });
        
        try {
          // Desencriptar password
          const decrypted = service.decrypt(
            req.body.encryptedPassword,
            req.body.iv,
            req.body.authTag
          );
          
          // Guardar el IV antes de borrarlo
          const originalIv = req.body.iv;
          
          // Reemplazar encryptedPassword con password plano
          req.body.password = decrypted.data;
          
          // ⚠️ IMPORTANTE: Limpiar campos de encriptación DESPUÉS de usarlos
          delete req.body.encryptedPassword;
          delete req.body.iv;
          delete req.body.authTag;
          
          // Guardar metadata
          req.encryptionMetadata = {
            iv: originalIv,
            timestamp: decrypted.timestamp,
            method: 'aes-256-gcm',
            wasEncrypted: true
          };
          
          logger.info('✅ Password decrypted successfully', {
            email: req.body.email,
            timestampAge: (Date.now() - decrypted.timestamp) + 'ms',
            bodyKeys: Object.keys(req.body) // Para debug: verificar qué queda en el body
          });
          
        } catch (error: any) {
          logger.error('❌ Decryption failed:', {
            error: error.message,
            email: req.body.email
          });
          
          // Mensaje claro del error
          if (error.message.includes('expired')) {
            res.status(401).json({
              status: 'error',
              message: error.message
            });
          } else if (error.message.includes('auth tag')) {
            res.status(401).json({
              status: 'error',
              message: 'Invalid encryption signature'
            });
          } else {
            res.status(401).json({
              status: 'error',
              message: 'Invalid encrypted credentials'
            });
          }
          return;
        }
      }
      
      // ✅ PROCESAR CAMBIO DE CONTRASEÑA ENCRIPTADO
      if (hasEncryptedPasswordChange) {
        logger.info('🔐 Processing encrypted password change');
        
        try {
          // Desencriptar contraseña actual
          const decryptedCurrent = service.decrypt(
            req.body.encryptedCurrentPassword,
            req.body.iv,
            req.body.authTag
          );
          
          // Desencriptar contraseña nueva
          const decryptedNew = service.decrypt(
            req.body.encryptedNewPassword,
            req.body.iv,
            req.body.authTag
          );
          
          // Reemplazar con valores planos
          req.body.currentPassword = decryptedCurrent.data;
          req.body.newPassword = decryptedNew.data;
          req.body.confirmPassword = decryptedNew.data; // Auto-confirmar
          
          // Limpiar campos encriptados
          delete req.body.encryptedCurrentPassword;
          delete req.body.encryptedNewPassword;
          delete req.body.iv;
          delete req.body.authTag;
          
          req.encryptionMetadata = {
            iv: req.body.iv,
            timestamp: decryptedCurrent.timestamp,
            method: 'aes-256-gcm',
            wasEncrypted: true
          };
          
          logger.info('✅ Passwords decrypted successfully');
          
        } catch (error: any) {
          logger.error('❌ Password change decryption failed:', error.message);
          res.status(401).json({
            status: 'error',
            message: 'Invalid encrypted passwords'
          });
          return;
        }
      }
      
      // Continuar al siguiente middleware/controlador
      next();
      
    } catch (error) {
      logger.error('Encryption middleware error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Encryption processing failed'
      });
    }
  };
};

/**
 * MIDDLEWARE: Requiere encriptación obligatoria
 */
export const requireEncryption = () => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Verificar que haya metadata de encriptación y que fue encriptado
    if (!req.encryptionMetadata || !req.encryptionMetadata.wasEncrypted) {
      logger.warn('⚠️ Encryption required but not provided', {
        path: req.path,
        ip: req.ip
      });
      
      res.status(400).json({
        status: 'error',
        message: 'This endpoint requires encrypted data'
      });
      return;
    }
    
    next();
  };
};

// Exportar el servicio por si se necesita
export const getEncryptionService = () => getOrCreateEncryptionService();