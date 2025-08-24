// =====================================================
// scripts/encrypt-for-testing.ts - VERSIÓN COMPLETA CORREGIDA
// Script para generar payloads encriptados para TODOS los usuarios
// Uso: npx ts-node scripts/encrypt-for-testing.ts [all|índice]
// =====================================================

// ✅ CONFIGURACIÓN SSL PARA DESARROLLO - DEBE IR PRIMERO
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// ✅ CONFIGURACIÓN CORREGIDA PARA HTTPS
const USERS = [
  { email: "juan@gmail.com", password: "&*Gabriel1223*" },
  { email: "maria@gmail.com", password: "maria456" },
  { email: "admin@example.com", password: "admin789" },
  { email: "test@test.com", password: "test123" },
  { email: "doctor@clinic.com", password: "doctor123" },
  { email: "paciente@email.com", password: "paciente456" },
  // 👇 AGREGA MÁS USUARIOS AQUÍ
  // { email: "nuevo@email.com", password: "suPassword" },
];

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "9m8qV+7Yy2pLz4gH3tR0bF6uK1wN0sQvZxY4a1B7cR=";
// ✅ CAMBIADO A HTTPS
const API_BASE_URL = "https://localhost:4000/api/v1";

// ✅ CONFIGURAR AXIOS PARA HTTPS CON CERTIFICADOS AUTO-FIRMADOS
const axios = require('axios');
const https = require('https');

const httpsAgent = new https.Agent({  
  rejectUnauthorized: false,
  secureOptions: require('constants').SSL_OP_LEGACY_SERVER_CONNECT
});

axios.defaults.httpsAgent = httpsAgent;
axios.defaults.timeout = 15000; // 15 segundos timeout

class SimpleEncrypt {
  private encryptionKey: Buffer;
  
  constructor() {
    const key = ENCRYPTION_KEY || "dev-key-32-chars-minimum-required!!-change-in-production";
    const finalKey = key.padEnd(32, 'x');
    this.encryptionKey = crypto.createHash('sha256').update(finalKey, 'utf8').digest();
  }
  
  generateIV(email: string): string {
    const data = `${email}-${Date.now()}-${Math.random()}`;
    return crypto.createHash('md5').update(data).digest().toString('hex');
  }
  
  encryptPassword(password: string, iv: string) {
    const ivBuffer = Buffer.from(iv, 'hex');
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, ivBuffer);
    
    const payload = JSON.stringify({
      data: password,
      timestamp: Date.now()
    });
    
    let encrypted = cipher.update(payload, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = (cipher as any).getAuthTag().toString('hex');
    
    return { encrypted, authTag };
  }
}

// ============= FUNCIONES ORIGINALES =============

function generatePayloadForUser(user: { email: string, password: string }, encryptor: SimpleEncrypt) {
  const iv = encryptor.generateIV(user.email);
  const { encrypted, authTag } = encryptor.encryptPassword(user.password, iv);
  
  return {
    email: user.email,
    encryptedPassword: encrypted,
    iv: iv,
    authTag: authTag,
    deviceName: "Insomnia Test"
  };
}

function generateAllPayloads() {
  console.log('\n🔐 GENERANDO PAYLOADS PARA TODOS LOS USUARIOS\n');
  console.log('='.repeat(60));
  
  const encryptor = new SimpleEncrypt();
  const allPayloads: any = {};
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  USERS.forEach((user, index) => {
    console.log(`\n🔐 Usuario ${index + 1}/${USERS.length}: ${user.email}`);
    
    const payload = generatePayloadForUser(user, encryptor);
    
    // Guardar en objeto
    allPayloads[user.email] = payload;
    
    // Mostrar payload
    console.log('   ✅ Payload generado');
    console.log(`   IV: ${payload.iv}`);
    console.log(`   AuthTag: ${payload.authTag}`);
  });
  
  // Crear directorio si no existe
  const dir = path.join(process.cwd(), 'test-payloads');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  const filename = `all-users-${timestamp}.json`;
  const filepath = path.join(dir, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(allPayloads, null, 2));
  
  console.log('\n' + '='.repeat(60));
  console.log(`\n💾 TODOS LOS PAYLOADS GUARDADOS EN:`);
  console.log(`   ${filepath}`);
  
  // Mostrar resumen
  console.log('\n📊 RESUMEN:');
  console.log(`   • Total usuarios: ${USERS.length}`);
  console.log(`   • Payloads generados: ${Object.keys(allPayloads).length}`);
  console.log(`   • Algoritmo: AES-256-GCM`);
  
  // Mostrar ejemplo de uso
  console.log('\n💡 CÓMO USAR EN INSOMNIA:');
  console.log('   1. Abre el archivo JSON generado');
  console.log('   2. Copia el payload del usuario que quieras');
  console.log('   3. Pégalo en el body de la request');
  console.log(`   4. POST ${API_BASE_URL}/auth/login`);
  
  // También mostrar en consola para copiar rápido
  console.log('\n📋 PAYLOADS PARA COPIAR RÁPIDO:');
  console.log('-'.repeat(60));
  
  Object.entries(allPayloads).forEach(([email, payload]) => {
    console.log(`\n${email}:`);
    console.log(JSON.stringify(payload));
  });
  
  return allPayloads;
}

function generateSinglePayload(index: number) {
  const user = USERS[index];
  
  if (!user) {
    console.error(`❌ No existe usuario en índice ${index}`);
    console.log(`   Usuarios disponibles: 0 a ${USERS.length - 1}`);
    process.exit(1);
  }
  
  console.log('\n🔐 GENERANDO PAYLOAD INDIVIDUAL\n');
  console.log(`Usuario: ${user.email}`);
  console.log('-'.repeat(50));
  
  const encryptor = new SimpleEncrypt();
  const payload = generatePayloadForUser(user, encryptor);
  
  console.log('\n✅ PAYLOAD PARA INSOMNIA:\n');
  console.log(JSON.stringify(payload, null, 2));
  
  console.log('\n📋 COPIA ESTO (una línea):\n');
  console.log(JSON.stringify(payload));
  
  return payload;
}

function showOnlyIVs() {
  console.log('\n🔑 GENERANDO SOLO IVs PARA TODOS LOS USUARIOS\n');
  console.log('='.repeat(60));
  
  const encryptor = new SimpleEncrypt();
  const ivs: Record<string, string> = {};
  
  USERS.forEach((user, index) => {
    const iv = encryptor.generateIV(user.email);
    ivs[user.email] = iv;
    console.log(`${index}: ${user.email}`);
    console.log(`   IV: ${iv}`);
  });
  
  console.log('\n' + '='.repeat(60));
  return ivs;
}

function showPlainPayloads() {
  console.log('\n🔓 PAYLOADS SIN ENCRIPTAR (para testing rápido)\n');
  console.log('='.repeat(60));
  
  USERS.forEach((user, index) => {
    const plainPayload = {
      email: user.email,
      password: user.password,
      deviceName: "Insomnia Test"
    };
    
    console.log(`\n${index}: ${user.email}`);
    console.log(JSON.stringify(plainPayload));
  });
  
  console.log('\n' + '='.repeat(60));
}

// ============= NUEVAS FUNCIONES PARA TESTING DEL API =============

async function checkApiStatus() {
  console.log('🔍 Verificando estado del API...');
  try {
    const response = await axios.get(`${API_BASE_URL}/health`);
    console.log('✅ API está corriendo');
    console.log(`   Status: ${response.data.status}`);
    console.log(`   Message: ${response.data.message}`);
    return true;
  } catch (error: any) {
    console.log('❌ API no está corriendo o no es accesible');
    console.log('   Asegúrate de que tu servidor esté corriendo con: npm run dev');
    console.log(`   URL esperada: ${API_BASE_URL}/health`);
    if (error.code) {
      console.log(`   Código de error: ${error.code}`);
    }
    return false;
  }
}

async function testAPIWithEncryption() {
  console.log('\n🧪 PROBANDO API CON ENCRIPTACIÓN\n');
  console.log('='.repeat(60));
  
  // Verificar que el API esté corriendo
  const apiRunning = await checkApiStatus();
  if (!apiRunning) {
    console.log('\n💡 Para iniciar el API ejecuta: npm run dev');
    return;
  }
  
  const encryptor = new SimpleEncrypt();
  
  // Probar con los primeros 2 usuarios para no hacer demasiadas requests
  const usersToTest = USERS.slice(0, 2);
  
  for (const user of usersToTest) {
    console.log(`\n📧 Probando usuario: ${user.email}`);
    console.log('-'.repeat(40));
    
    try {
      // 1. Generar payload encriptado
      const iv = encryptor.generateIV(user.email);
      const { encrypted, authTag } = encryptor.encryptPassword(user.password, iv);
      
      const payload = {
        email: user.email,
        encryptedPassword: encrypted,
        iv: iv,
        authTag: authTag,
        deviceName: "Test Device API"
      };
      
      console.log(`🔑 IV generado: ${iv}`);
      console.log(`🔐 Password encriptado: ${encrypted.substring(0, 20)}...`);
      console.log(`🏷️  AuthTag: ${authTag}`);
      
      // 2. Hacer request al API
      console.log(`🚀 Haciendo request a ${API_BASE_URL}/auth/login...`);
      
      const response = await axios.post(`${API_BASE_URL}/auth/login`, payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 200) {
        console.log(`✅ ¡Login exitoso! El middleware está funcionando!`);
        console.log(`   User ID: ${response.data.data?.user?.id || 'N/A'}`);
        console.log(`   Session ID: ${response.data.data?.sessionId || 'N/A'}`);
        console.log(`   Access Token: ${response.data.data?.accessToken?.substring(0, 20) || 'N/A'}...`);
        console.log(`   Source Table: ${response.data.data?.user?.sourceTable || 'N/A'}`);
      }
      
    } catch (error: any) {
      console.log(`❌ Error para ${user.email}:`);
      
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Message: ${error.response.data?.message || 'Error desconocido'}`);
        
        if (error.response.status === 401) {
          console.log('   🔍 Posibles problemas:');
          console.log('     - Middleware no aplicado a la ruta /auth/login');
          console.log('     - Usuario no existe en la base de datos');
          console.log('     - Error en encriptación/desencriptación');
        } else if (error.response.status === 500) {
          console.log('   🔍 Error del servidor. Verifica los logs del servidor.');
        }
        
      } else if (error.request) {
        console.log(`   Error de red: No se pudo alcanzar el API`);
        console.log(`   URL: ${API_BASE_URL}/auth/login`);
        console.log('   🔍 Asegúrate de que tu servidor esté corriendo: npm run dev');
      } else {
        console.log(`   Error: ${error.message}`);
      }
    }
    
    // Esperar un poco entre requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

async function testPlainLogin() {
  console.log('\n🔓 PROBANDO LOGIN SIN ENCRIPTACIÓN\n');
  console.log('='.repeat(60));
  
  const user = USERS[0];
  
  try {
    const payload = {
      email: user.email,
      password: user.password,
      deviceName: "Plain Test Device"
    };
    
    console.log(`📧 Probando login plano para: ${user.email}`);
    console.log(`🚀 Haciendo request a ${API_BASE_URL}/auth/login...`);
    
    const response = await axios.post(`${API_BASE_URL}/auth/login`, payload);
    
    if (response.status === 200) {
      console.log(`✅ ¡Login plano exitoso!`);
      console.log(`   El middleware permite tanto encriptado como plano`);
      console.log(`   User ID: ${response.data.data?.user?.id || 'N/A'}`);
    }
    
  } catch (error: any) {
    console.log(`❌ Error en login plano:`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Message: ${error.response.data?.message || 'Error desconocido'}`);
      
      if (error.response.status === 401) {
        console.log('   ✅ Login plano rechazado (el middleware requiere encriptación)');
      }
    } else {
      console.log(`   Error: ${error.message}`);
    }
  }
}

// ============= EJECUTAR =============
const args = process.argv.slice(2);
const command = args[0]?.toLowerCase();

console.log(`🎯 Encryption Middleware Tester`);
console.log(`API Base URL: ${API_BASE_URL}`);
console.log(`Environment: ${process.env.NODE_ENV || 'local'}`);
console.log(`Time: ${new Date().toLocaleString()}`);

switch (command) {
  case 'all':
  case undefined:
    // Generar todos los payloads Y probar API
    generateAllPayloads();
    setTimeout(async () => {
      await testPlainLogin();
      await testAPIWithEncryption();
    }, 2000);
    break;
    
  case 'payloads':
    // Solo generar payloads
    generateAllPayloads();
    break;
    
  case 'test':
  case 'api':
    // Solo probar API
    checkApiStatus().then(async (isRunning) => {
      if (isRunning) {
        await testPlainLogin();
        await testAPIWithEncryption();
      }
    });
    break;
    
  case 'status':
    // Solo verificar estado del API
    checkApiStatus();
    break;
    
  case 'iv':
  case 'ivs':
    showOnlyIVs();
    break;
    
  case 'plain':
    showPlainPayloads();
    break;
    
  case 'help':
    console.log(`
🔐 Herramienta de Encriptación para Testing

USO:
  npm run encrypt [comando]
  npm run test:encryption

COMANDOS:
  all      - Genera payloads Y prueba API (default)
  payloads - Solo genera payloads encriptados
  test     - Solo prueba el API con encriptación  
  status   - Verifica si el API está corriendo
  iv       - Muestra solo los IVs de todos los usuarios
  plain    - Muestra payloads sin encriptar
  help     - Muestra esta ayuda

EJEMPLOS:
  npm run encrypt              # Genera payloads y prueba API
  npm run encrypt payloads     # Solo generar payloads
  npm run encrypt test         # Solo probar API
  npm run encrypt status       # Verificar API
  npm run test:encryption      # Alias para generar y probar

USUARIOS CONFIGURADOS: ${USERS.length}
${USERS.map((u, i) => `  ${i}: ${u.email}`).join('\n')}

🚀 SETUP COMPLETO:
  1. npm run docker:up        # Levantar MySQL
  2. npm run dev              # Iniciar API  
  3. npm run test:encryption  # Probar encriptación

🔧 URLs:
  • API Health: ${API_BASE_URL}/health
  • Login: ${API_BASE_URL}/auth/login
  • Users: ${API_BASE_URL}/users

🐛 DEBUGGING:
  • Verifica que el middleware esté aplicado en auth.routes.ts
  • Revisa los logs del servidor para ver actividad del middleware
  • Verifica que ENCRYPTION_KEY coincida entre cliente y servidor
    `);
    break;
    
  default:
    // Si es un número, generar individual
    const index = parseInt(command);
    if (!isNaN(index)) {
      generateSinglePayload(index);
    } else {
      console.error(`❌ Comando desconocido: ${command}`);
      console.log('   Usa "help" para ver opciones');
    }
    break;
  }