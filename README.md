📦 SIMPLE_STACK
├── 📁 src/
│   ├── 📁 api/                    # Módulos de la API
│   │   ├── 📁 auth/
│   │   │   ├── auth.controller.js
│   │   │   ├── auth.service.js
│   │   │   ├── auth.routes.js
│   │   │   ├── auth.validator.js
│   │   │   └── auth.schema.js
│   │   ├── 📁 users/
│   │   │   ├── user.controller.js
│   │   │   ├── user.service.js
│   │   │   ├── user.routes.js
│   │   │   ├── user.model.js
│   │   │   ├── user.validator.js
│   │   │   └── user.schema.js
│   │   ├── 📁 roles/
│   │   │   ├── role.controller.js
│   │   │   ├── role.service.js
│   │   │   ├── role.routes.js
│   │   │   ├── role.model.js
│   │   │   └── role.schema.js
│   │   └── 📁 permissions/
│   │       └── ... (misma estructura)
│   │
│   ├── 📁 shared/                 # Código compartido
│   │   ├── 📁 constants/
│   │   │   ├── roles.constants.js
│   │   │   ├── permissions.constants.js
│   │   │   ├── messages.constants.js
│   │   │   └── http-status.constants.js
│   │   ├── 📁 errors/
│   │   │   ├── AppError.js
│   │   │   ├── AuthError.js
│   │   │   ├── ValidationError.js
│   │   │   └── index.js
│   │   ├── 📁 interfaces/
│   │   │   ├── pagination.interface.js
│   │   │   ├── response.interface.js
│   │   │   └── request.interface.js
│   │   ├── 📁 schemas/            # Schemas compartidos (Joi/Yup)
│   │   │   ├── pagination.schema.js
│   │   │   ├── id.schema.js
│   │   │   └── common.schema.js
│   │   ├── 📁 utils/
│   │   │   ├── bcrypt.util.js
│   │   │   ├── jwt.util.js
│   │   │   ├── response.util.js
│   │   │   └── validator.util.js
│   │   └── 📁 helpers/
│   │       ├── email.helper.js
│   │       ├── date.helper.js
│   │       └── string.helper.js
│   │
│   ├── 📁 core/                   # Core del sistema
│   │   ├── 📁 config/
│   │   │   ├── app.config.js      # Tu archivo de configuración general
│   │   │   ├── database.config.js # Configuración específica de DB
│   │   │   ├── adapters.config.js # Configuración de adapters
│   │   │   └── index.js           # Exporta toda la config
│   │   ├── 📁 database/
│   │   │   ├── 📁 config/
│   │   │   │   └── typeorm.config.js  # Configuración de TypeORM
│   │   │   ├── 📁 entities/
│   │   │   │   ├── user.entity.js
│   │   │   │   ├── role.entity.js
│   │   │   │   └── permission.entity.js
│   │   │   ├── 📁 migrations/
│   │   │   ├── 📁 seeds/
│   │   │   ├── 📁 subscribers/
│   │   │   └── connection.js     # Inicialización de la DB
│   │   └── 📁 middlewares/
│   │       ├── auth.middleware.js
│   │       ├── permissions.middleware.js
│   │       ├── language.middleware.js
│   │       ├── error.middleware.js
│   │       └── validation.middleware.js
│   │
│   ├── 📁 i18n/                   # Sistema multi-idioma
│   │   ├── 📁 locales/
│   │   │   ├── 📁 en/
│   │   │   │   ├── common.json
│   │   │   │   ├── auth.json
│   │   │   │   ├── users.json
│   │   │   │   ├── errors.json
│   │   │   │   └── emails.json
│   │   │   ├── 📁 es/
│   │   │   │   └── ... (mismos archivos)
│   │   │   └── 📁 pt/
│   │   │       └── ... (mismos archivos)
│   │   └── index.js
│   │
│   ├── 📁 adapters/               # Adaptadores para servicios externos
│   │   ├── 📁 email/
│   │   │   ├── email.adapter.js
│   │   │   ├── 📁 providers/
│   │   │   │   ├── sendgrid.provider.js
│   │   │   │   ├── mailgun.provider.js
│   │   │   │   ├── smtp.provider.js
│   │   │   │   └── console.provider.js
│   │   │   └── index.js
│   │   ├── 📁 storage/
│   │   │   ├── storage.adapter.js
│   │   │   ├── 📁 providers/
│   │   │   │   ├── s3.provider.js
│   │   │   │   ├── cloudinary.provider.js
│   │   │   │   ├── local.provider.js
│   │   │   │   └── gcs.provider.js
│   │   │   └── index.js
│   │   ├── 📁 cache/
│   │   │   ├── cache.adapter.js
│   │   │   ├── 📁 providers/
│   │   │   │   ├── redis.provider.js
│   │   │   │   ├── memcached.provider.js
│   │   │   │   └── memory.provider.js
│   │   │   └── index.js
│   │   ├── 📁 payment/
│   │   │   ├── payment.adapter.js
│   │   │   ├── 📁 providers/
│   │   │   │   ├── stripe.provider.js
│   │   │   │   ├── paypal.provider.js
│   │   │   │   └── mercadopago.provider.js
│   │   │   └── index.js
│   │   ├── 📁 sms/
│   │   │   ├── sms.adapter.js
│   │   │   ├── 📁 providers/
│   │   │   │   ├── twilio.provider.js
│   │   │   │   ├── vonage.provider.js
│   │   │   │   └── console.provider.js
│   │   │   └── index.js
│   │   └── 📁 queue/
│   │       ├── queue.adapter.js
│   │       ├── 📁 providers/
│   │       │   ├── bull.provider.js
│   │       │   ├── rabbitmq.provider.js
│   │       │   └── sqs.provider.js
│   │       └── index.js
│   │
│   ├── 📁 templates/              # Templates para emails
│   │   ├── 📁 emails/
│   │   │   ├── 📁 layouts/
│   │   │   │   └── main.hbs
│   │   │   ├── 📁 partials/
│   │   │   │   ├── header.hbs
│   │   │   │   ├── footer.hbs
│   │   │   │   ├── button.hbs
│   │   │   │   └── social-links.hbs
│   │   │   └── 📁 pages/
│   │   │       ├── welcome.hbs
│   │   │       ├── reset-password.hbs
│   │   │       ├── verify-email.hbs
│   │   │       ├── notification.hbs
│   │   │       └── password-changed.hbs
│   │   └── email.service.js
│   │
│   └── server.js                  # Entry point
│
├── 📁 environments/               # Variables de entorno
│   ├── .env
│   ├── .env.local
│   ├── .env.development
│   ├── .env.production
│   └── .env.example
├── 📁 public/                     # Archivos estáticos
│   ├── 📁 uploads/
│   └── 📁 images/
│       └── 📁 email/              # Imágenes para emails
│           ├── logo.png
│           └── banner.png
├── 📁 logs/
├── 📁 test/
│   ├── 📁 unit/
│   ├── 📁 integration/
│   └── 📁 fixtures/
├── .env.example
├── .gitignore
├── docker-compose.yml
├── package.json
└── README.md