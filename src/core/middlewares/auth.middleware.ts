import { Request, Response, NextFunction } from 'express';
import { SessionService } from '../../api/session/session.service';
import JwtUtil from '../../shared/utils/jwt.util';

// Extiende la interfaz Request para incluir 'user'
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const authMiddleware = (sessionService: SessionService) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = JwtUtil.extractTokenFromHeader(req.headers.authorization);

      if (!token) {
        return res.status(401).json({ status: 'error', message: 'Missing token' });
      }

      const decoded = JwtUtil.verifyAccessToken(token);

      const isValid = await sessionService.validateSession(decoded.sessionId);
      if (!isValid) {
        return res.status(401).json({ status: 'error', message: 'Session expired or invalid' });
      }

      req.user = decoded; // para usar en el controller
      next();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return res.status(401).json({ status: 'error', message });
    }
  };
