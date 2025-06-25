const es = {
  emailVerification: {
    subject: "Verify your email address",
    title: "Account Verification",
    subtitle: "Confirm your email to activate your {{appName}} account",
    greeting: "Hi {{name}},",
    message: "To complete your veterinary account registration, we need to verify your email address. Use the verification code you'll find below.",
    button: "Verify Email",
    
  },
  passwordResetCode: {
    subject: "Código para restablecer tu contraseña",
    greeting: "Hola {{name}},",
    message: "Usa el siguiente código para restablecer tu contraseña:",
    expiration: "Este código expirará en 10 minutos."
  },
  passwordResetLink: {
    subject: "Restablece tu contraseña",
    greeting: "Hola {{name}},",
    message: "Haz clic en el botón de abajo para restablecer tu contraseña:",
    button: "Restablecer contraseña",
    expiration: "Este enlace expirará en 30 minutos."
  },
  welcome: {
    subject: "¡Bienvenido a {{appName}}! Verifica tu cuenta",
    title: "¡Bienvenido {{firstName}}!",
    subtitle: "Tu cuenta en {{appName}} está lista",
    greeting: "¡Bienvenido, {{firstName}}!",
    thankYou: "Gracias por unirte a nuestra comunidad. Estamos emocionados de tenerte como parte de {{appName}} y queremos asegurarnos de que tengas la mejor experiencia posible desde el primer día.",
    accountVerified: "Tu cuenta ha sido verificada exitosamente y ya puedes comenzar a explorar todas nuestras funcionalidades.",
    accountInfo: {
      title: "Información de tu cuenta",
      email: "Email:",
      name: "Nombre:",
      accountType: "Tipo de cuenta:",
      registrationDate: "Fecha de registro:"
    },
    getStarted: {
      title: "¿Por dónde empezar?",
      step1: {
        title: "Explora tu dashboard",
        description: "Familiarízate con la interfaz y descubre todas las funcionalidades disponibles."
      },
      step2: {
        title: "Personaliza tu perfil",
        description: "Agrega tu foto, completa tu información y configura tus preferencias."
      },
      step3: {
        title: "Comienza a usar la plataforma",
        description: "Empieza a aprovechar todas las herramientas y servicios que tenemos para ti."
      }
    },
    resources: {
      title: "Recursos útiles"
    },
    support: {
      title: "¿Necesitas ayuda?",
      message: "Nuestro equipo de soporte está aquí para ayudarte. Si tienes preguntas o necesitas asistencia,",
      contactUs: "contáctanos en",
      orContact: "no dudes en contactarnos"
    },
    closing: "Una vez más, ¡bienvenido a {{appName}}! Estamos emocionados de acompañarte en este viaje.",
    signature: "Con mucho entusiasmo,",
    teamSignature: "El equipo de {{appName}} 🎉",
    primaryButton: "Ir a mi cuenta"
  },
  passwordReset: {
    code: {
      title: "Código de recuperación",
      subtitle: "Código para restablecer tu contraseña en {{appName}}",
      greeting: "Hola {{firstName}},",
      message1: "Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en {{appName}}.",
      message2: "Si fuiste tú quien solicitó este cambio, puedes usar el código de seguridad que encontrarás más abajo.",
      requestDetails: {
        title: "Detalles de la solicitud",
        account: "Cuenta:",
        dateTime: "Fecha y hora:",
        ipAddress: "Dirección IP:"
      },
      codeLabel: "Tu código de recuperación es:",
      instructions: "Ingresa este código en la aplicación para restablecer tu contraseña.",
      howToUse: {
        title: "Cómo usar el código:",
        step1: "Ve a la página de recuperación de contraseña",
        step2: "Ingresa este código en el campo correspondiente",
        step3: "Crea tu nueva contraseña segura",
        step4: "¡Listo! Ya puedes acceder con tu nueva contraseña"
      },
      expiration: "Importante: Este código expirará en {{expirationTime}}. Si no restableces tu contraseña dentro de este tiempo, tendrás que solicitar un nuevo código.",
      security: {
        title: "Consejos de seguridad",
        tip1: "No compartas este código con nadie, ni siquiera con nuestro equipo de soporte",
        tip2: "Úsalo solo en el sitio oficial de {{appName}}",
        tip3: "Crea una contraseña fuerte con al menos 8 caracteres",
        tip4: "Incluye mayúsculas, minúsculas, números y símbolos",
        tip5: "No uses la misma contraseña en otras cuentas"
      },
      notRequested: {
        title: "¿No solicitaste este código?",
        message1: "Si no solicitaste restablecer tu contraseña, ignora este email. Tu contraseña actual permanecerá sin cambios y el código expirará automáticamente.",
        message2: "Si recibes múltiples códigos sin haberlos solicitado, contacta inmediatamente a nuestro equipo de soporte, ya que podría indicar que alguien está intentando acceder a tu cuenta."
      },
      didYouKnow: {
        title: "¿Sabías que...?",
        message: "Cada código es único y solo puede ser usado una vez. Una vez que restablezas tu contraseña exitosamente, este código quedará inválido automáticamente, incluso si no ha expirado."
      },
      closing: "Gracias por mantener tu cuenta segura. Recuerda que la seguridad de tu cuenta es muy importante para nosotros, y por eso implementamos estas medidas de protección.",
      signature: "Saludos cordiales,",
      teamSignature: "El equipo de seguridad de {{appName}} 🔐",
      supportButton: "Contactar soporte"
    },
    link: {
      title: "Recuperación de contraseña",
      subtitle: "Solicitud para restablecer tu contraseña en {{appName}}",
      greeting: "Hola {{firstName}},",
      message1: "Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en {{appName}}.",
      message2: "Si fuiste tú quien solicitó este cambio, puedes restablecer tu contraseña usando el enlace que encontrarás más abajo.",
      requestDetails: {
        title: "Detalles de la solicitud",
        account: "Cuenta:",
        dateTime: "Fecha y hora:",
        ipAddress: "Dirección IP:",
        browser: "Navegador:"
      },
      buttonText: "Restablecer contraseña",
      instructions: "Haz clic en el siguiente botón para crear tu nueva contraseña:",
      alternativeText: "Si no puedes hacer clic en el botón, copia y pega este enlace en tu navegador:",
      expiration: "Importante: Este enlace de restablecimiento expirará en {{expirationTime}}. Si no restableces tu contraseña dentro de este tiempo, tendrás que solicitar un nuevo enlace.",
      security: {
        title: "Consejos de seguridad",
        tip1: "Crea una contraseña fuerte con al menos 8 caracteres",
        tip2: "Incluye mayúsculas, minúsculas, números y símbolos",
        tip3: "No uses la misma contraseña en otras cuentas",
        tip4: "Considera usar un gestor de contraseñas"
      },
      notRequested: {
        title: "¿No solicitaste este cambio?",
        message1: "Si no solicitaste restablecer tu contraseña, ignora este email. Tu contraseña actual permanecerá sin cambios.",
        message2: "Sin embargo, te recomendamos que revises la seguridad de tu cuenta y contactes a nuestro equipo de soporte si sospechas actividad no autorizada."
      },
      closing: "Gracias por mantener tu cuenta segura. Si tienes alguna pregunta o inquietud sobre este proceso, no dudes en contactarnos.",
      signature: "Saludos cordiales,",
      teamSignature: "El equipo de seguridad de {{appName}} 🔐",
      supportButton: "Contactar soporte",
      supportMessage: "¿Tienes problemas o necesitas ayuda?"
    }
  },
  partials: {
    button: {
      clickHere: "Haz clic aquí"
    },
    header: {
      title: "One Lesson Per Day",
      subtitle: "Cuidando a tu mascota con amor y profesionalismo",
      slogan: "Un día, una lección, una vida mejor para tu mascota",
      emailTypes: {
        verification: "VERIFICACIÓN DE CUENTA",
        welcome: "BIENVENIDA",
        passwordReset: "RECUPERACIÓN DE CONTRASEÑA",
        notification: "NOTIFICACIÓN",
        admin: "ADMINISTRACIÓN",
        appointment: "CITA VETERINARIA",
        adoption: "ADOPCIÓN",
        ethology: "ETOLOGÍA"
      },
      services: {
        veterinaryMedicine: "Medicina Veterinaria",
        ethology: "Etología",
        adoptions: "Adopciones"
      }
    },
    footer: {
      veterinary: {
        title: "Servicios Veterinarios",
        generalConsultation: "Consulta General",
        emergency: "Emergencias 24h",
        surgery: "Cirugías",
        vaccination: "Vacunación",
        laboratory: "Laboratorio",
        xrays: "Rayos X"
      },
      ethology: {
        title: "Servicios de Etología",
        behaviorConsultation: "Consulta Comportamental",
        training: "Entrenamiento",
        socialization: "Socialización",
        anxietyTreatment: "Tratamiento de Ansiedad",
        aggressionTreatment: "Tratamiento de Agresividad"
      },
      adoptions: {
        title: "Adopciones",
        availablePets: "Mascotas Disponibles",
        adoptionProcess: "Proceso de Adopción",
        postAdoptionSupport: "Seguimiento Post-Adopción",
        volunteerProgram: "Programa de Voluntarios"
      },
      contact: {
        title: "Contáctanos",
        address: "Dirección",
        phone: "Teléfono",
        whatsapp: "WhatsApp",
        emergencyPhone: "Emergencias",
        hours: "Horarios de Atención",
        mondayToFriday: "Lunes a Viernes: 8:00 AM - 6:00 PM",
        saturday: "Sábados: 8:00 AM - 4:00 PM",
        sunday: "Domingos: Solo Emergencias",
        emergency24h: "Emergencias: 24 horas"
      },
      social: {
        title: "Síguenos",
        facebook: "Facebook",
        instagram: "Instagram",
        youtube: "YouTube",
        tiktok: "TikTok",
        followUs: "Síguenos para consejos diarios sobre el cuidado de mascotas"
      },
      legal: {
        title: "Información Legal",
        privacy: "Política de Privacidad",
        terms: "Términos y Condiciones",
        cookies: "Política de Cookies",
        medicalDisclaimer: "Aviso Médico",
        license: "Licencia Veterinaria: #VET-2024-001"
      },
      help: {
        title: "¿Necesitas ayuda?",
        message: "Nuestro equipo veterinario está aquí para ayudarte y cuidar de tu mascota.",
        supportEmail: "Soporte",
        emergencyContact: "Contacto de Emergencia"
      },
      newsletter: {
        title: "Boletín Veterinario",
        subscribe: "Suscríbete",
        description: "Recibe consejos semanales sobre el cuidado de tu mascota, promociones especiales y recordatorios de vacunación.",
        emailPlaceholder: "Tu email para consejos veterinarios"
      },
      company: {
        allRightsReserved: "Todos los derechos reservados.",
        description: "One Lesson Per Day es una clínica veterinaria integral especializada en medicina veterinaria, etología y programas de adopción responsable.",
        mission: "Nuestra misión es brindar atención médica de calidad, promover el bienestar animal y facilitar adopciones responsables."
      },
      disclaimer: {
        title: "Importante:",
        message: "Este email fue enviado desde una dirección de solo envío.",
        contact: "Para consultas veterinarias urgentes, contacta:",
        emergencyNote: "En caso de emergencia veterinaria, llama inmediatamente al:",
        medicalAdvice: "Este email no reemplaza la consulta veterinaria profesional."
      },
      unsubscribe: {
        message: "¿No deseas recibir estos emails veterinarios?",
        link: "Cancelar suscripción"
      },
      poweredBy: "Powered by {{appName}} Veterinary System"
    }
  },
};

export default es;