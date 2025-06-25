import { Request, Response, NextFunction } from 'express';
import i18next, { TFunction } from 'i18next';
import Backend from 'i18next-fs-backend';
import middleware from 'i18next-http-middleware';
import path from 'path';
import { config } from '../core/config/env';

// Extender el tipo Request para incluir la función t
export interface LocalizedRequest extends Request {
  t: TFunction;
  language: string;
  languages: string[];
  i18n: any;
}

// Configurar i18next
export const initI18n = async () => {
  await i18next
    .use(Backend)
    .use(middleware.LanguageDetector)
    .init({
      fallbackLng: 'en',
      supportedLngs: ['en', 'es', 'pt'],
      preload: ['en', 'es', 'pt'],
      ns: ['common', 'auth', 'users', 'errors', 'emails', 'responses', 'validation'],
      defaultNS: 'common',
      backend: {
        loadPath: path.join(process.cwd(), 'src/i18n/locales/{{lng}}/{{ns}}.json'),
      },
      detection: {
        order: ['header', 'querystring', 'cookie'],
        lookupHeader: 'accept-language',
        lookupQuerystring: 'lang',
        lookupCookie: 'i18next',
        caches: ['cookie'],
      },
      interpolation: {
        escapeValue: false, // React ya escapa los valores
      },
      debug: config.app.env === 'development',
    });
};

// Middleware personalizado para i18n
export const i18nMiddleware = middleware.handle(i18next);

// Middleware para establecer el idioma del usuario autenticado
export const setUserLanguageMiddleware = (req: LocalizedRequest, res: Response, next: NextFunction) => {
  // Si hay un usuario autenticado y tiene un idioma preferido
  if ((req as any).user?.language) {
    req.i18n.changeLanguage((req as any).user.language);
  }
  next();
};

// Helper para obtener todos los idiomas soportados
export const getSupportedLanguages = () => {
  return i18next.languages;
};

// Helper para cambiar el idioma actual
export const changeLanguage = async (language: string) => {
  return i18next.changeLanguage(language);
};