# 🚀 Node.js TypeScript Backend Stack

Backend robusto, seguro y escalable construido con **Node.js**, **TypeScript**, **Express**, **TypeORM**, y arquitectura **Clean/Hexagonal**. Ideal para sistemas empresariales con alta demanda de mantenibilidad, seguridad y rendimiento.

---

## 📋 Tabla de Contenidos

* [🔧 Resumen del Stack](#-resumen-del-stack)
* [🏗️ Arquitectura y Organización](#-arquitectura-y-organización)
* [✨ Características Principales](#-características-principales)
* [📦 Requisitos Previos](#-requisitos-previos)
* [🚀 Instalación](#-instalación)
* [⚙️ Configuración](#-configuración)
* [🧪 Testing](#-testing)
* [📡 API Endpoints](#-api-endpoints)
* [📦 Comandos Disponibles](#-comandos-disponibles)
* [📚 Patrones y Principios](#-patrones-y-principios)
* [📤 Despliegue](#-despliegue)

---

## 🔧 Resumen del Stack

### Tecnologías Principales

* **Runtime**: Node.js 18+
* **Lenguaje**: TypeScript
* **Framework**: Express.js + HTTP/2
* **ORM**: TypeORM
* **Base de datos**: MySQL (extensible a PostgreSQL/MariaDB)
* **Autenticación**: JWT (access + refresh tokens)
* **Validación**: Zod
* **Logger**: Winston
* **Testing**: Jest + Supertest

### Seguridad y Rendimiento

* **HTTP/2 + TLS**
* **Helmet, CORS, Rate Limiting**
* **gzip/brotli compression**
* **Connection Pooling**
* **SSL configurable**

---

## 🏗️ Arquitectura y Organización

```bash
📦 PROJECT_ROOT
├── 📁 src/
│   ├── 📁 adapters/               # Integraciones externas
│   ├── 📁 api/                    # Capa de aplicación (routes/controllers/services)
│   │   ├── 📁 auth/
│   │   ├── 📁 session/
│   │   └── 📁 users/
│   ├── 📁 core/
│   │   ├── 📁 config/            # Configuración global y del entorno
│   │   ├── 📁 database/
│   │   │   ├── 📁 entities/      # Entidades TypeORM (submódulo Git)
│   │   │   ├── 📁 migrations/
│   │   │   ├── 📁 seeds/
│   │   │   └── connection.ts
│   │   └── 📁 middlewares/       # Middlewares Express
│   ├── 📁 factories/             # Factories para DI manual
│   ├── 📁 i18n/                  # Traducciones (es/en)
│   ├── 📁 routes/                # Definición de rutas
│   ├── 📁 shared/
│   │   ├── 📁 constants/         # Constantes globales (roles, status)
│   │   ├── 📁 errors/            # Clases de error personalizadas
│   │   ├── 📁 helpers/           # Funciones auxiliares reutilizables
│   │   ├── 📁 interfaces/        # Interfaces para tipado
│   │   ├── 📁 schemas/           # Esquemas Zod
│   │   ├── 📁 services/          # Servicios comunes
│   │   └── 📁 utils/             # Utilidades (logger, token, etc.)
│   ├── 📁 templates/             # Templates para emails (handlebars)
│   │   ├── 📁 layouts/
│   │   ├── 📁 pages/
│   │   └── 📁 partials/
│   ├── 📁 emails/                # Servicio de envío de correos
│   ├── 📁 test/
│   │   ├── 📁 fixtures/
│   │   ├── 📁 integration/
│   │   └── 📁 unit/
│   └── index.ts                 # Punto de entrada de la app
├── 📁 environments/             # Archivos .env por entorno
├── 📁 cert/                     # Certificados TLS (dev)
├── 📁 logs/                     # Logs generados
├── 📁 public/                   # Archivos públicos
├── .env*, Dockerfile, docker-compose.yml
├── tsconfig.json, jest.config.js, etc.
└── README.md
```

---

## ✨ Características Principales

### 🔐 Seguridad

* Autenticación JWT (access + refresh)
* Rate Limiting por IP
* Protección con Helmet.js
* Hasheo con Bcrypt
* Validación estricta con Zod

### ⚡ Rendimiento

* HTTP/2 con TLS (OpenSSL)
* Conexiones DB con pooling
* Lazy loading en servicios
* Compresión gzip/brotli

### 🧠 Arquitectura Limpia

* Clean Architecture + Hexagonal
* Patrones: Repository, Factory, Singleton
* Inversión de dependencias (manual)
* Alta cohesión y bajo acoplamiento

### 🛠️ Developer Experience

* TypeScript con soporte completo de tipos
* Logger con Winston configurable por entorno
* Manejo centralizado de errores
* ESLint, Prettier y Husky preconfigurados

---

## 📦 Requisitos Previos

* Node.js v18+
* MySQL 8+
* OpenSSL
* Git
* Docker (opcional)

---

## 🚀 Instalación

```bash
# 1. Clonar repositorio
$ git clone --recurse-submodules https://github.com/tu-org/tu-repo.git

# 2. Instalar dependencias
$ npm install

# 3. Copiar variables de entorno
$ cp environments/.env.example environments/.env

# 4. Generar certificados (solo dev)
$ npm run generate:certs

# 5. Migraciones iniciales
$ npm run migration:run

# 6. Iniciar el servidor
$ npm run dev
```

---

## ⚙️ Configuración

```env
# App
APP_NAME=Simple API
NODE_ENV=development
PORT=4000

# DB
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=secret
DB_NAME=simple_stack
DB_SYNCHRONIZE=false
DB_LOGGING=true

# JWT
JWT_AUTH_SECRET=secret
JWT_EXPIRES_IN=1d
JWT_REFRESH_EXPIRES_IN=7d

# Email
EMAIL_HOST=smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_USER=xxxxx
EMAIL_PASS=xxxxx

# CORS
CORS_ORIGIN=http://localhost:3000
```

---

## 📡 API Endpoints

### Auth

```http
POST   /api/v1/auth/login
POST   /api/v1/auth/register
POST   /api/v1/auth/logout
POST   /api/v1/auth/refresh
POST   /api/v1/auth/forgot
POST   /api/v1/auth/reset
```

### Users

```http
GET    /api/v1/users
GET    /api/v1/users/:id
POST   /api/v1/users
PUT    /api/v1/users/:id
DELETE /api/v1/users/:id
```

### Salud

```http
GET    /api/v1/health
GET    /api/v1/health/db
```

---

## 🧪 Testing

```bash
npm run test              # Todos los tests
npm run test:unit         # Unitarios
npm run test:integration  # Integración
npm run test:e2e          # End-to-End
npm run test:coverage     # Reporte de cobertura
```

---

## 📦 Comandos Disponibles

```bash
npm run dev               # Modo desarrollo
npm run build             # Build TS
npm run start             # Producción

# DB
npm run migration:create
npm run migration:run
npm run migration:revert
npm run seed:run

# Lint / Format
npm run lint
npm run lint:fix
npm run format

# Certificados
npm run generate:certs
```

---

## 📚 Patrones y Principios

* **Clean Architecture**
* **SOLID**
* **Repository Pattern**
* **Factory Pattern**
* **Singleton Pattern**
* **Submódulos Git para entidades compartidas**

---

## 📤 Despliegue

### Docker

```bash
docker-compose up -d --build
```

### PM2

```bash
pm run build
pm run start
pm install -g pm2
pm2 start dist/index.js --name api --env production
```

---

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Ver el archivo [LICENSE](./LICENSE) para más detalles.
