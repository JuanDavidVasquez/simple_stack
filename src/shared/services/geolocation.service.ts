import setupLogger from '../utils/logger';
import { config } from '../../core/config/env';

const logger = setupLogger({
  ...config.logging,
  dir: `${config.logging.dir}/services/geolocation`,
});

export interface LocationInfo {
  country?: string;
  countryCode?: string;
  region?: string;
  regionCode?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  isp?: string;
  organization?: string;
  mobile?: boolean;
  proxy?: boolean;
  hosting?: boolean;
}

export interface GeolocationProvider {
  name: string;
  getLocation(ipAddress: string): Promise<LocationInfo | null>;
}

/**
 * Proveedor usando ipapi.co (gratuito, 1000 requests/día)
 */
class IpapiCoProvider implements GeolocationProvider {
  name = 'ipapi.co';
  private baseUrl = 'https://ipapi.co';

  async getLocation(ipAddress: string): Promise<LocationInfo | null> {
    try {
      const response = await fetch(`${this.baseUrl}/${ipAddress}/json/`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as Record<string, any>;

      // Verificar si hay error en la respuesta
      if (data.error) {
        throw new Error(data.reason || 'Unknown error from ipapi.co');
      }

      return {
        country: data.country_name,
        countryCode: data.country_code,
        region: data.region,
        regionCode: data.region_code,
        city: data.city,
        latitude: data.latitude,
        longitude: data.longitude,
        timezone: data.timezone,
        isp: data.org,
        organization: data.org,
      };

    } catch (error) {
      logger.error(`Error getting location from ${this.name}:`, error);
      return null;
    }
  }
}

/**
 * Proveedor usando ip-api.com (gratuito, 1000 requests/minuto)
 */
class IpApiComProvider implements GeolocationProvider {
  name = 'ip-api.com';
  private baseUrl = 'http://ip-api.com/json';

  async getLocation(ipAddress: string): Promise<LocationInfo | null> {
    try {
      const response = await fetch(`${this.baseUrl}/${ipAddress}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as Record<string, any>;

      // Verificar si la respuesta fue exitosa
      if (data.status !== 'success') {
        throw new Error(data.message || 'Unknown error from ip-api.com');
      }

      return {
        country: data.country,
        countryCode: data.countryCode,
        region: data.regionName,
        regionCode: data.region,
        city: data.city,
        latitude: data.lat,
        longitude: data.lon,
        timezone: data.timezone,
        isp: data.isp,
        organization: data.org,
        mobile: data.mobile,
        proxy: data.proxy,
        hosting: data.hosting,
      };

    } catch (error) {
      logger.error(`Error getting location from ${this.name}:`, error);
      return null;
    }
  }
}

/**
 * Proveedor usando ipinfo.io (requiere API key para más requests)
 */
class IpinfoProvider implements GeolocationProvider {
  name = 'ipinfo.io';
  private baseUrl = 'https://ipinfo.io';
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  async getLocation(ipAddress: string): Promise<LocationInfo | null> {
    try {
      let url = `${this.baseUrl}/${ipAddress}/json`;
      
      if (this.apiKey) {
        url += `?token=${this.apiKey}`;
      }

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as Record<string, any>;

      // Verificar si hay error
      if (data.error) {
        throw new Error(data.error.title || 'Unknown error from ipinfo.io');
      }

      // Parsear ubicación (formato: "lat,lng")
      const [latitude, longitude] = data.loc ? data.loc.split(',').map(Number) : [undefined, undefined];

      return {
        country: data.country,
        countryCode: data.country,
        region: data.region,
        city: data.city,
        latitude,
        longitude,
        timezone: data.timezone,
        organization: data.org,
      };

    } catch (error) {
      logger.error(`Error getting location from ${this.name}:`, error);
      return null;
    }
  }
}

/**
 * Servicio principal de geolocalización con fallback entre proveedores
 */
export class GeolocationService {
  private providers: GeolocationProvider[];
  private cache: Map<string, { location: LocationInfo | null; timestamp: number }> = new Map();
  private cacheTimeout = 24 * 60 * 60 * 1000; // 24 horas

  constructor() {
    // Inicializar proveedores en orden de preferencia
    this.providers = [
      new IpapiCoProvider(),
      new IpApiComProvider(),
      // Agregar ipinfo.io si tienes API key
      ...(process.env.IPINFO_API_KEY ? [new IpinfoProvider(process.env.IPINFO_API_KEY)] : []),
    ];

    logger.info(`GeolocationService initialized with ${this.providers.length} providers: ${this.providers.map(p => p.name).join(', ')}`);
  }

  /**
   * Obtiene la ubicación de una IP con caché y fallback
   */
  async getLocationFromIP(ipAddress?: string): Promise<string | undefined> {
    if (!ipAddress) {
      return undefined;
    }

    // Filtrar IPs locales/privadas
    if (this.isPrivateIP(ipAddress)) {
      logger.debug(`Skipping geolocation for private IP: ${ipAddress}`);
      return 'Local Network';
    }

    // Verificar caché
    const cached = this.cache.get(ipAddress);
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      logger.debug(`Using cached location for IP: ${ipAddress}`);
      return this.formatLocation(cached.location);
    }

    // Intentar con cada proveedor hasta que uno funcione
    for (const provider of this.providers) {
      try {
        logger.debug(`Trying ${provider.name} for IP: ${ipAddress}`);
        
        const location = await provider.getLocation(ipAddress);
        
        if (location) {
          // Guardar en caché
          this.cache.set(ipAddress, {
            location,
            timestamp: Date.now()
          });

          logger.info(`Location found using ${provider.name} for IP ${ipAddress}: ${this.formatLocation(location)}`);
          return this.formatLocation(location);
        }

      } catch (error) {
        logger.warn(`Provider ${provider.name} failed for IP ${ipAddress}:`, error);
        continue;
      }
    }

    // Si todos fallan, guardar null en caché por un tiempo más corto
    this.cache.set(ipAddress, {
      location: null,
      timestamp: Date.now()
    });

    logger.warn(`Could not determine location for IP: ${ipAddress}`);
    return undefined;
  }

  /**
   * Obtiene información detallada de ubicación
   */
  async getDetailedLocationFromIP(ipAddress?: string): Promise<LocationInfo | null> {
    if (!ipAddress || this.isPrivateIP(ipAddress)) {
      return null;
    }

    // Verificar caché
    const cached = this.cache.get(ipAddress);
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.location;
    }

    // Intentar con cada proveedor
    for (const provider of this.providers) {
      try {
        const location = await provider.getLocation(ipAddress);
        
        if (location) {
          // Guardar en caché
          this.cache.set(ipAddress, {
            location,
            timestamp: Date.now()
          });

          return location;
        }

      } catch (error) {
        continue;
      }
    }

    return null;
  }

  /**
   * Formatea la información de ubicación en string legible
   */
  private formatLocation(location: LocationInfo | null): string | undefined {
    if (!location) {
      return undefined;
    }

    const parts: string[] = [];

    if (location.city) {
      parts.push(location.city);
    }

    if (location.region && location.region !== location.city) {
      parts.push(location.region);
    }

    if (location.country) {
      parts.push(location.country);
    }

    return parts.length > 0 ? parts.join(', ') : undefined;
  }

  /**
   * Verifica si una IP es privada/local
   */
  private isPrivateIP(ip: string): boolean {
    const privateRanges = [
      /^127\./, // Localhost
      /^10\./, // Private Class A
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Private Class B
      /^192\.168\./, // Private Class C
      /^169\.254\./, // Link-local
      /^::1$/, // IPv6 localhost
      /^fc00:/, // IPv6 private
      /^fe80:/, // IPv6 link-local
    ];

    return privateRanges.some(range => range.test(ip));
  }

  /**
   * Limpia la caché de ubicaciones
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('Geolocation cache cleared');
  }

  /**
   * Obtiene estadísticas de la caché
   */
  getCacheStats(): { size: number; oldestEntry: number; newestEntry: number } {
    if (this.cache.size === 0) {
      return { size: 0, oldestEntry: 0, newestEntry: 0 };
    }

    const timestamps = Array.from(this.cache.values()).map(entry => entry.timestamp);
    
    return {
      size: this.cache.size,
      oldestEntry: Math.min(...timestamps),
      newestEntry: Math.max(...timestamps),
    };
  }
}

// Exportar instancia singleton
export const geolocationService = new GeolocationService();