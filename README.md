# 🚀 Node.js TypeScript Backend Stack

Backend robusto y escalable construido con TypeScript, Express, TypeORM y arquitectura limpia. Diseñado para aplicaciones empresariales con alta demanda de seguridad, rendimiento y mantenibilidad.

## 📋 Tabla de Contenidos

- [Resumen del Stack](#-resumen-del-stack)
- [Arquitectura y Organización](#-arquitectura-y-organización)
- [Características Principales](#-características-principales)
- [Requisitos Previos](#-requisitos-previos)
- [Instalación](#-instalación)
- [Configuración](#-configuración)
- [Comandos Disponibles](#-comandos-disponibles)
- [Estructura de Carpetas](#-estructura-de-carpetas)
- [Patrones y Principios](#-patrones-y-principios)
- [API Endpoints](#-api-endpoints)
- [Guías de Desarrollo](#-guías-de-desarrollo)
- [Testing](#-testing)
- [Despliegue](#-despliegue)

## 🔧 Resumen del Stack

### Core Technologies
- **Runtime**: Node.js v18+
- **Language**: TypeScript 5.x
- **Framework**: Express.js con HTTP/2
- **ORM**: TypeORM
- **Database**: MySQL (configurable para PostgreSQL, MariaDB, etc.)
- **Authentication**: JWT (HS256/RS256)
- **Validation**: Joi/Yup
- **Documentation**: Swagger/OpenAPI
- **Testing**: Jest, Supertest

### Security & Performance
- **Protocol**: HTTP/2 con SSL/TLS
- **Security**: Helmet, CORS, Rate Limiting
- **Compression**: gzip/brotli
- **Monitoring**: Winston Logger
- **Process Manager**: PM2

### Architecture Features
- **Pattern**: Clean Architecture / Hexagonal
- **Design Patterns**: Repository, Factory, Singleton
- **SOLID Principles**: Aplicados en todo el código
- **Dependency Injection**: Manual con factories
- **Database Migrations**: TypeORM migrations
- **Multi-tenancy Ready**: Estructura preparada

## 🏗️ Arquitectura y Organización

```
📦 PROJECT_ROOT
├── 📁 src/
│   ├── 📁 api/                      # Capa de Aplicación (Controllers)
│   │   ├── 📁 auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.routes.ts
│   │   │   └── auth.validator.ts
│   │   ├── 📁 users/
│   │   │   ├── user.controller.ts
│   │   │   ├── user.repository.ts   # Repository Pattern
│   │   │   ├── user.routes.ts
│   │   │   └── user.service.ts
│   │   └── 📁 [otros módulos]/
│   │
│   ├── 📁 core/                     # Núcleo del Sistema
│   │   ├── 📁 config/
│   │   │   ├── database-manager.ts  # Singleton para DB
│   │   │   ├── env.ts              # Configuración central
│   │   │   └── index.ts
│   │   ├── 📁 database/
│   │   │   ├── 📁 entities/        # Entidades TypeORM
│   │   │   │   ├── user.entity.ts
│   │   │   │   └── base.entity.ts
│   │   │   ├── 📁 migrations/
│   │   │   └── 📁 seeds/
│   │   └── 📁 middlewares/
│   │       ├── auth.middleware.ts
│   │       ├── error.middleware.ts
│   │       └── validation.middleware.ts
│   │
│   ├── 📁 infrastructure/           # Capa de Infraestructura
│   │   ├── 📁 database/
│   │   │   └── 📁 config/
│   │   │       ├── database.config.ts
│   │   │       └── typeorm.config.ts
│   │   ├── 📁 services/            # Servicios de dominio
│   │   │   └── user.service.ts
│   │   ├── 📁 utils/
│   │   │   └── logger.ts
│   │   ├── 📁 routes/
│   │   │   └── index.ts            # Router principal
│   │   └── server.ts               # Servidor HTTP/2
│   │
│   ├── 📁 shared/                  # Código Compartido
│   │   ├── 📁 constants/
│   │   │   ├── roles.ts
│   │   │   └── http-status.ts
│   │   ├── 📁 errors/
│   │   │   ├── application.error.ts
│   │   │   ├── domain.error.ts
│   │   │   └── infrastructure.error.ts
│   │   ├── 📁 interfaces/
│   │   │   ├── pagination.interface.ts
│   │   │   ├── repository.interface.ts
│   │   │   └── user.interface.ts
│   │   └── 📁 utils/
│   │       ├── bcrypt.util.ts
│   │       ├── jwt.util.ts
│   │       └── response.util.ts
│   │
│   ├── 📁 adapters/                # Adaptadores para servicios externos
│   │   ├── 📁 email/
│   │   ├── 📁 storage/
│   │   ├── 📁 cache/
│   │   └── 📁 payment/
│   │
│   ├── 📁 factories/               # Factory Pattern
│   │   └── user.factory.ts
│   │
│   ├── 📁 templates/               # Templates (email, etc)
│   │   └── 📁 emails/
│   │
│   └── index.ts                    # Entry Point
│
├── 📁 environments/                # Variables de entorno
│   ├── .env
│   ├── .env.local
│   ├── .env.development
│   └── .env.production
│
├── 📁 cert/                        # Certificados SSL
│   └── 📁 development/
│       ├── private.key
│       └── certificate.pem
│
├── 📁 logs/                        # Archivos de log
├── 📁 public/                      # Archivos estáticos
├── 📁 test/                        # Tests
│   ├── 📁 unit/
│   ├── 📁 integration/
│   └── 📁 e2e/
│
├── .dockerignore
├── .eslintrc.js
├── .gitignore
├── .prettierrc
├── docker-compose.yml
├── Dockerfile
├── jest.config.js
├── package.json
├── tsconfig.json
└── README.md
```

## ✨ Características Principales

### 🛡️ Seguridad
- **HTTP/2 + SSL/TLS**: Comunicación segura y eficiente
- **JWT Authentication**: Tokens de acceso y refresh
- **Helmet.js**: Headers de seguridad HTTP
- **Rate Limiting**: Protección contra ataques de fuerza bruta
- **CORS configurado**: Control de origen cruzado
- **Bcrypt**: Hasheo seguro de contraseñas
- **Input Validation**: Validación con Joi/Yup

### 🚀 Performance
- **HTTP/2**: Multiplexación y server push
- **Compression**: Respuestas comprimidas
- **Connection Pooling**: Pool de conexiones DB optimizado
- **Lazy Loading**: Carga diferida de módulos
- **Clustering**: Soporte para múltiples workers
- **Caching**: Sistema de caché configurable

### 🏗️ Arquitectura
- **Clean Architecture**: Separación clara de responsabilidades
- **Repository Pattern**: Abstracción de acceso a datos
- **Factory Pattern**: Creación de instancias desacoplada
- **Singleton Pattern**: Gestión única de recursos
- **Dependency Injection**: Inyección manual con factories
- **SOLID Principles**: Código mantenible y extensible

### 🔧 Developer Experience
- **TypeScript**: Type safety y mejor IDE support
- **Hot Reload**: Recarga automática en desarrollo
- **Logging estructurado**: Winston con niveles configurables
- **Error Handling**: Manejo centralizado de errores
- **API Documentation**: Swagger/OpenAPI autogenerado
- **Code Quality**: ESLint + Prettier configurados

## 📋 Requisitos Previos

- Node.js v18+ 
- npm/yarn/pnpm
- MySQL 8.0+
- OpenSSL (para generar certificados)
- Git

## 🚀 Instalación

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/tu-proyecto.git
cd tu-proyecto

# Instalar dependencias
npm install

# Copiar archivo de configuración
cp environments/.env.example environments/.env

# Generar certificados SSL para desarrollo
npm run generate:certs

# Ejecutar migraciones
npm run migration:run

# Iniciar en modo desarrollo
npm run dev
```

## ⚙️ Configuración

### Variables de Entorno

El proyecto utiliza archivos `.env` en la carpeta `environments/`:

```env
# App Configuration
APP_NAME="My API"
APP_VERSION="1.0.0"
NODE_ENV="development"
PORT=4000

# Database
DB_TYPE="mysql"
DB_HOST="localhost"
DB_PORT=3306
DB_USER="root"
DB_PASSWORD="password"
DB_NAME="my_database"
DB_SYNCHRONIZE=false
DB_LOGGING=true

# JWT
JWT_AUTH_SECRET="your-secret-key"
JWT_EXPIRES_IN="24h"
JWT_REFRESH_EXPIRES_IN="7d"

# Email
EMAIL_HOST="smtp.mailtrap.io"
EMAIL_PORT=2525
EMAIL_USER="user"
EMAIL_PASS="pass"

# CORS
CORS_ORIGIN="http://localhost:3000"
CORS_METHODS="GET,HEAD,PUT,PATCH,POST,DELETE"
```

## 📜 Comandos Disponibles

```bash
# Desarrollo
npm run dev                 # Iniciar con hot-reload
npm run build              # Compilar TypeScript
npm start                  # Iniciar producción

# Base de datos
npm run migration:create   # Crear nueva migración
npm run migration:run      # Ejecutar migraciones
npm run migration:revert   # Revertir última migración
npm run seed:run          # Ejecutar seeders

# Testing
npm test                   # Ejecutar todos los tests
npm run test:unit         # Tests unitarios
npm run test:integration  # Tests de integración
npm run test:e2e          # Tests end-to-end
npm run test:coverage     # Reporte de cobertura

# Calidad de código
npm run lint              # Ejecutar ESLint
npm run lint:fix          # Corregir problemas de lint
npm run format            # Formatear con Prettier

# Utilidades
npm run generate:certs    # Generar certificados SSL
npm run docs:generate     # Generar documentación API
```

## 🎯 Patrones y Principios

### Clean Architecture
- **Domain Layer**: Entidades y lógica de negocio
- **Application Layer**: Casos de uso y servicios
- **Infrastructure Layer**: Implementaciones concretas
- **Presentation Layer**: Controllers y rutas

### SOLID Principles
- **S**ingle Responsibility: Cada clase tiene una única responsabilidad
- **O**pen/Closed: Abierto para extensión, cerrado para modificación
- **L**iskov Substitution: Las subclases deben ser sustituibles
- **I**nterface Segregation: Interfaces específicas y cohesivas
- **D**ependency Inversion: Depender de abstracciones

### Design Patterns Implementados
1. **Repository Pattern**: Abstracción del acceso a datos
2. **Factory Pattern**: Creación de objetos complejos
3. **Singleton Pattern**: Una única instancia (DatabaseManager)
4. **Strategy Pattern**: En adaptadores (email, storage, etc.)
5. **Observer Pattern**: Event emitters para eventos del sistema

## 📡 API Endpoints

### Authentication
```
POST   /api/v1/auth/login         # Login de usuario
POST   /api/v1/auth/register      # Registro de usuario
POST   /api/v1/auth/refresh       # Refrescar token
POST   /api/v1/auth/logout        # Cerrar sesión
POST   /api/v1/auth/forgot        # Recuperar contraseña
POST   /api/v1/auth/reset         # Resetear contraseña
```

### Users
```
GET    /api/v1/users              # Listar usuarios (paginado)
POST   /api/v1/users              # Crear usuario
GET    /api/v1/users/:id          # Obtener usuario
PUT    /api/v1/users/:id          # Actualizar usuario
DELETE /api/v1/users/:id          # Eliminar usuario
PATCH  /api/v1/users/:id/status   # Cambiar estado
```

### Health Check
```
GET    /api/v1/health             # Estado del servidor
GET    /api/v1/health/db          # Estado de la BD
```

## 🧪 Testing

### Estructura de Tests
```typescript
// user.service.spec.ts
describe('UserService', () => {
  let service: UserService;
  let repository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    repository = createMockRepository();
    service = new UserService(repository);
  });

  it('should create a user', async () => {
    // Arrange
    const userData = { email: 'test@test.com' };
    repository.create.mockResolvedValue(userData);

    // Act
    const result = await service.create(userData);

    // Assert
    expect(result).toEqual(userData);
  });
});
```

## 🚀 Despliegue

### Docker
```bash
# Build
docker build -t my-api .

# Run
docker-compose up -d
```

### PM2
```bash
# Producción
pm2 start ecosystem.config.js --env production

# Monitoreo
pm2 monit
```

## 📚 Documentación Adicional

- [Guía de Contribución](./docs/CONTRIBUTING.md)
- [Arquitectura Detallada](./docs/ARCHITECTURE.md)
- [API Documentation](./docs/API.md)
- [Security Guidelines](./docs/SECURITY.md)

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Ver archivo [LICENSE](./LICENSE) para más detalles.