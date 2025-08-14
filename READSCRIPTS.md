# Estructura de scripts para tu proyecto

Necesitas crear la carpeta `scripts/` en la raíz de tu proyecto con los siguientes archivos:

## 📁 Estructura requerida:
```
proyecto/
├── scripts/
│   ├── encrypt-for-testing.ts          # Tu script actual movido aquí
│   ├── test-encryption-improved.ts     # Nuevo script de testing
│   ├── generate-key.js                 # Script para generar keys JWT
│   └── test-api.ts                     # Script para testing general del API
├── test-payloads/                      # Carpeta para payloads generados
├── src/
│   └── index.ts                        # Tu archivo principal
└── package.json
```

## 🔧 Scripts a crear:

### 1. **scripts/generate-key.js** (nuevo)
```javascript
const crypto = require('crypto');

function generateKey(expiresIn = '24h') {
  const key = crypto.randomBytes(64).toString('hex');
  
  console.log('\n🔑 JWT Key Generated');
  console.log('==================');
  console.log(`Key: ${key}`);
  console.log(`Length: ${key.length} characters`);
  console.log(`Expires: ${expiresIn}`);
  console.log('\n📋 Add to your .env file:');
  console.log(`JWT_SECRET=${key}`);
  console.log(`JWT_EXPIRES_IN=${expiresIn}`);
  
  return key;
}

const expiresIn = process.argv[2] || '24h';
generateKey(expiresIn);
```

### 2. **Mover tu script actual**
Mueve `src/scripts/encrypt-for-testing.ts` a `scripts/encrypt-for-testing.ts`

### 3. **Agregar el script de testing del middleware**
Usa el `scripts/test-encryption-improved.ts` del artifact anterior.

## 🚀 Comandos actualizados:

### Para desarrollo:
```bash
npm run dev              # Desarrollo local
npm run dev:local        # Explícitamente local
npm run build            # Compilar TypeScript
npm run start            # Ejecutar compilado
```

### Para testing de encriptación:
```bash
npm run encrypt:help     # Ver ayuda
npm run encrypt:all      # Generar todos los payloads
npm run encrypt:0        # Usuario específico por índice
npm run encrypt:plain    # Ver payloads sin encriptar

npm run test:encryption  # Probar el middleware
npm run test:encryption:plain  # Probar login sin encriptación
npm run test:encryption:debug  # Solo generar payloads
```

### Para base de datos:
```bash
npm run docker:up        # Levantar MySQL
npm run migration:generate # Generar migración
npm run migration:run    # Ejecutar migraciones
```

## ⚠️ Pasos para corregir:

1. **Crear carpeta scripts:**
   ```bash
   mkdir scripts
   mkdir test-payloads
   ```

2. **Mover archivo actual:**
   ```bash
   mv src/scripts/encrypt-for-testing.ts scripts/
   ```

3. **Crear generate-key.js:**
   ```bash
   # Crear el archivo con el contenido de arriba
   ```

4. **Actualizar package.json:**
   - Reemplaza con el artifact anterior

5. **Verificar archivo principal:**
   ```bash
   # Asegúrate de que existe src/index.ts
   # Si tienes src/main.ts, renómbralo a src/index.ts
   ```

## 🧪 Testing rápido:

```bash
# 1. Generar key JWT
npm run generate-key

# 2. Levantar base de datos
npm run docker:up

# 3. Ejecutar en desarrollo
npm run dev

# 4. En otra terminal, probar encriptación
npm run test:encryption:debug
npm run test:encryption
```

Esta estructura es más organizada y sigue las mejores prácticas para proyectos Node.js con TypeScript.