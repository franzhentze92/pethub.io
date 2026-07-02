import {
  PawPrint, User, Shield, Heart, ShoppingBag, Stethoscope,
  Store, Home, Settings, MessageCircle, HelpCircle,
  CreditCard, Bell, Users, MapPin, BarChart3, type LucideIcon,
} from 'lucide-react';

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  icon: LucideIcon;
}

export interface FaqCategory {
  id: string;
  label: string;
  icon: LucideIcon;
  gradient: string;
  description: string;
}

export const faqCategories: FaqCategory[] = [
  { id: 'all', label: 'Todas', icon: HelpCircle, gradient: 'from-landing-aqua to-landing-mango', description: 'Todas las preguntas' },
  { id: 'general', label: 'General', icon: PawPrint, gradient: 'from-landing-aqua to-landing-mint', description: 'Qué es PetHub y cómo empezar' },
  { id: 'cuenta', label: 'Cuenta & Roles', icon: User, gradient: 'from-landing-mint to-landing-aqua', description: 'Registro, perfiles y tipos de usuario' },
  { id: 'cuidado', label: 'Cuidado & Salud', icon: Stethoscope, gradient: 'from-landing-mango to-landing-tropical', description: 'Mascotas, ejercicio, nutrición y veterinaria' },
  { id: 'marketplace', label: 'Marketplace', icon: ShoppingBag, gradient: 'from-landing-mango to-landing-aqua', description: 'Compras, pagos y órdenes' },
  { id: 'comunidad', label: 'Comunidad', icon: Heart, gradient: 'from-landing-mango to-landing-tropical', description: 'Adopción, cría y mascotas perdidas' },
  { id: 'negocios', label: 'Proveedores', icon: Store, gradient: 'from-landing-aqua to-landing-mango', description: 'Vender productos y servicios' },
  { id: 'refugios', label: 'Refugios', icon: Home, gradient: 'from-landing-mint to-landing-aqua', description: 'Gestión de adopciones' },
  { id: 'seguridad', label: 'Seguridad', icon: Shield, gradient: 'from-gray-600 to-gray-800', description: 'Privacidad y protección de datos' },
  { id: 'soporte', label: 'Soporte', icon: MessageCircle, gradient: 'from-landing-aqua to-landing-mango', description: 'Ayuda y contacto' },
];

export const faqItems: FaqItem[] = [
  // General
  {
    id: 'what-is-pethub',
    category: 'general',
    icon: PawPrint,
    question: '¿Qué es PetHub?',
    answer: 'PetHub es una plataforma pet-tech latinoamericana que conecta dueños de mascotas, proveedores y refugios en un ecosistema integrado. Permite gestionar la salud, nutrición y actividad de tus mascotas, comprar productos y servicios, adoptar y mucho más — todo desde una experiencia especializada según tu perfil.',
  },
  {
    id: 'how-start',
    category: 'general',
    icon: PawPrint,
    question: '¿Cómo empiezo a usar PetHub?',
    answer: 'Regístrate gratis en pethub.gt, elige tu perfil (dueño de mascota, proveedor o refugio) y completa tu registro. En menos de 2 minutos tendrás acceso a tu panel personalizado. No necesitas tarjeta de crédito para el plan gratuito.',
  },
  {
    id: 'free-plan',
    category: 'general',
    icon: PawPrint,
    question: '¿PetHub es gratuito?',
    answer: 'Sí, ofrecemos un plan gratuito con acceso a funcionalidades básicas de todos los módulos. Los planes premium desbloquean analytics avanzados, más mascotas, soporte prioritario y funciones adicionales. Consulta la página de precios para comparar planes.',
  },
  {
    id: 'mobile',
    category: 'general',
    icon: PawPrint,
    question: '¿Funciona en móvil?',
    answer: 'Sí. PetHub es completamente responsivo y funciona en cualquier navegador de smartphone o tablet. Todas las funcionalidades están disponibles en móvil con una interfaz adaptada a pantallas pequeñas.',
  },

  // Cuenta & Roles
  {
    id: 'roles',
    category: 'cuenta',
    icon: Users,
    question: '¿Qué perfiles de usuario existen?',
    answer: 'PetHub tiene 3 perfiles públicos: Dueño de mascota (cuidado, compras y adopción), Proveedor (vender productos y servicios) y Refugio/Albergue (gestionar adopciones). Cada perfil accede a una experiencia diferente dentro de la plataforma.',
  },
  {
    id: 'register-pet',
    category: 'cuenta',
    icon: User,
    question: '¿Cómo registro a mis mascotas?',
    answer: 'Desde tu dashboard, ve a "Agregar Mascota" e ingresa nombre, especie, raza, edad, peso y fotos. Puedes registrar microchip, configurar disponibilidad para cría y acceder al Pet Room — la vista individual de cada mascota con todos sus módulos de salud.',
  },
  {
    id: 'change-role',
    category: 'cuenta',
    icon: User,
    question: '¿Puedo cambiar mi rol después de registrarme?',
    answer: 'Tu rol principal se define al registrarte. Si necesitas acceso como proveedor o refugio además de dueño, contacta a soporte para evaluar tu caso. Cada rol requiere verificación específica.',
  },
  {
    id: 'settings',
    category: 'cuenta',
    icon: Settings,
    question: '¿Cómo gestiono mi perfil y preferencias?',
    answer: 'En Ajustes puedes editar tu información personal, cambiar avatar, gestionar direcciones de entrega con coordenadas, guardar tarjetas de pago y configurar preferencias de notificaciones y privacidad.',
  },

  // Cuidado & Salud
  {
    id: 'exercise',
    category: 'cuidado',
    icon: Stethoscope,
    question: '¿Cómo registro el ejercicio de mi mascota?',
    answer: 'En el módulo de Ejercicio y Trazabilidad puedes registrar sesiones diarias, ver calorías quemadas, establecer metas personalizadas y consultar gráficos de rendimiento. También existe el Adventure Log para registrar aventuras y actividades especiales.',
  },
  {
    id: 'nutrition',
    category: 'cuidado',
    icon: Stethoscope,
    question: '¿Cómo funcionan los horarios de alimentación?',
    answer: 'En Nutrición Inteligente configuras horarios automáticos con porciones precisas. El sistema envía recordatorios, registra cada comida en el Meal Journal y te permite hacer seguimiento nutricional completo por mascota.',
  },
  {
    id: 'vet-records',
    category: 'cuidado',
    icon: Stethoscope,
    question: '¿Puedo guardar el historial veterinario?',
    answer: 'Sí. Veterinaria Digital permite registrar visitas, vacunas, tratamientos, documentos médicos y notas. El Health Journal centraliza toda la información de salud y puedes compartirla con tu veterinario.',
  },
  {
    id: 'reminders',
    category: 'cuidado',
    icon: Bell,
    question: '¿Qué recordatorios puedo configurar?',
    answer: 'Puedes crear recordatorios para vacunas, medicamentos, citas veterinarias, alimentación y eventos personalizados. Las notificaciones push te alertan a tiempo para el cuidado preventivo de cada mascota.',
  },

  // Marketplace
  {
    id: 'buy-products',
    category: 'marketplace',
    icon: ShoppingBag,
    question: '¿Cómo compro productos o servicios?',
    answer: 'Explora el Marketplace, filtra por categoría (alimentos, juguetes, servicios vet, grooming, etc.), agrega al carrito y procede al checkout. Puedes vincular productos a mascotas específicas, elegir dirección de entrega y pagar con tarjeta guardada.',
  },
  {
    id: 'order-tracking',
    category: 'marketplace',
    icon: ShoppingBag,
    question: '¿Cómo sigo mis pedidos?',
    answer: 'En Mis Órdenes ves el estado en tiempo real: pending, confirmed, processing, shipped, delivered o cancelled. Recibes notificaciones en cada cambio de estado y puedes ver el detalle de productos y servicios adquiridos.',
  },
  {
    id: 'payment-methods',
    category: 'marketplace',
    icon: CreditCard,
    question: '¿Qué métodos de pago aceptan?',
    answer: 'Puedes guardar tarjetas de crédito/débito en tu perfil para pagos rápidos. El checkout también soporta selección de método de pago y cálculo automático de costos de envío según tu dirección.',
  },
  {
    id: 'delivery-cost',
    category: 'marketplace',
    icon: ShoppingBag,
    question: '¿Cómo se calcula el costo de envío?',
    answer: 'El costo de envío se calcula automáticamente en el checkout según tu dirección de entrega y las coordenadas geográficas registradas. Puedes seguir el estado de tu pedido en Mis Órdenes.',
  },

  // Comunidad
  {
    id: 'adoption-process',
    category: 'comunidad',
    icon: Heart,
    question: '¿Cómo funciona la adopción?',
    answer: 'Explora el catálogo de mascotas disponibles con swipe (like/dislike), guarda favoritos y envía solicitudes de adopción. Los refugios revisan tu solicitud y pueden chatear contigo. Tras la aprobación, hay seguimiento post-adopción.',
  },
  {
    id: 'breeding',
    category: 'comunidad',
    icon: Heart,
    question: '¿Qué es el sistema de cría / parejas?',
    answer: 'En Parejas puedes buscar mascotas compatibles para reproducción responsable. Crea un perfil de cría, explora matches, chatea con otros dueños y coordina encuentros de forma segura.',
  },
  {
    id: 'lost-pets',
    category: 'comunidad',
    icon: MapPin,
    question: '¿Cómo reporto una mascota perdida?',
    answer: 'En Mascotas Perdidas registras el reporte con fotos, descripción y ubicación en un mapa interactivo. La comunidad puede ver los reportes y contactarte. Puedes actualizar el estado cuando la encuentres.',
  },
  {
    id: 'social-hub',
    category: 'comunidad',
    icon: Users,
    question: '¿Qué es el Social Hub?',
    answer: 'Es la red social de PetHub donde dueños descubren mascotas, siguen perfiles, envían mensajes y comparten experiencias con la comunidad pet-friendly.',
  },

  // Proveedores
  {
    id: 'become-provider',
    category: 'negocios',
    icon: Store,
    question: '¿Cómo me registro como proveedor?',
    answer: 'Regístrate seleccionando el rol "Proveedor", completa tu perfil de negocio con ubicación (Google Places), descripción y foto. Tras verificar tu email, accedes al dashboard para publicar productos y servicios.',
  },
  {
    id: 'manage-products',
    category: 'negocios',
    icon: Store,
    question: '¿Cómo gestiono mi catálogo de productos?',
    answer: 'Desde tu dashboard puedes crear, editar y eliminar productos con categorías, stock, precios por talla/tamaño, múltiples imágenes y alertas de stock bajo. Los productos activos aparecen en el marketplace.',
  },
  {
    id: 'manage-services',
    category: 'negocios',
    icon: Store,
    question: '¿Puedo ofrecer servicios con citas?',
    answer: 'Sí. Configura servicios (veterinaria, grooming, entrenamiento, etc.) con precios por tamaño de perro, disponibilidad, slots de tiempo y calendario de citas. Los clientes reservan directamente desde el marketplace.',
  },
  {
    id: 'provider-analytics',
    category: 'negocios',
    icon: BarChart3,
    question: '¿Qué analytics tiene el proveedor?',
    answer: 'Tu dashboard muestra ingresos mensuales, órdenes por estado, productos más vendidos, citas pendientes y calificación promedio con reseñas de clientes.',
  },

  // Refugios
  {
    id: 'shelter-register',
    category: 'refugios',
    icon: Home,
    question: '¿Cómo registro mi refugio?',
    answer: 'Regístrate como rol "Refugio/Albergue", completa el perfil con nombre, ubicación, descripción, galería de fotos y videos de YouTube. Tu refugio será visible para adoptantes en la plataforma.',
  },
  {
    id: 'publish-adoption',
    category: 'refugios',
    icon: Home,
    question: '¿Cómo publico mascotas en adopción?',
    answer: 'Crea perfiles detallados con especie, raza, edad, compatibilidad (niños, perros, gatos), estado de salud, esterilización, fotos y tarifa de adopción. Puedes gestionar todo desde vista de tarjetas o lista.',
  },
  {
    id: 'adoption-requests',
    category: 'refugios',
    icon: Home,
    question: '¿Cómo gestiono solicitudes de adopción?',
    answer: 'Recibes solicitudes con información del adoptante y su mensaje. Puedes aprobar, rechazar o chatear en tiempo real. El sistema registra estadísticas de solicitudes pendientes, aprobadas y rechazadas.',
  },

  // Seguridad
  {
    id: 'data-security',
    category: 'seguridad',
    icon: Shield,
    question: '¿Mis datos están seguros?',
    answer: 'PetHub utiliza encriptación de datos, Row Level Security (RLS) en la base de datos y cumplimiento GDPR. Solo tú y los profesionales que autorices pueden acceder a la información médica de tus mascotas.',
  },
  {
    id: 'privacy',
    category: 'seguridad',
    icon: Shield,
    question: '¿Quién puede ver la información de mis mascotas?',
    answer: 'Por defecto, solo tú. Puedes compartir historial médico con veterinarios específicos. Los perfiles públicos (adopción, cría) muestran solo la información que tú o el refugio decidan publicar.',
  },
  {
    id: 'delete-account',
    category: 'seguridad',
    icon: Shield,
    question: '¿Puedo eliminar mi cuenta y datos?',
    answer: 'Sí. Puedes solicitar la eliminación de tu cuenta y datos personales en cualquier momento desde Ajustes o contactando a soporte. Procesamos las solicitudes conforme a nuestra política de privacidad.',
  },

  // Soporte
  {
    id: 'contact-support',
    category: 'soporte',
    icon: MessageCircle,
    question: '¿Cómo contacto a soporte?',
    answer: 'Escríbenos en info@pethub.gt, usa el formulario en la página de Contacto, o llama al +502 1234-5678 en horario laboral. Tiempo de respuesta promedio: menos de 24 horas.',
  },
  {
    id: 'report-bug',
    category: 'soporte',
    icon: MessageCircle,
    question: '¿Cómo reporto un error o problema?',
    answer: 'Usa la página de Contacto describiendo el problema con el mayor detalle posible (qué hiciste, qué esperabas, qué pasó). Incluye capturas de pantalla si es posible. Nuestro equipo técnico lo revisará prioritariamente.',
  },
  {
    id: 'feature-request',
    category: 'soporte',
    icon: MessageCircle,
    question: '¿Puedo sugerir nuevas funcionalidades?',
    answer: '¡Nos encanta escuchar a la comunidad! Envía tus sugerencias por Contacto o correo. Muchas de nuestras funcionalidades actuales nacieron de feedback de usuarios.',
  },
];

export const getFaqsByCategory = (categoryId: string): FaqItem[] =>
  categoryId === 'all' ? faqItems : faqItems.filter((f) => f.category === categoryId);

export const searchFaqs = (query: string, categoryId = 'all'): FaqItem[] => {
  const base = getFaqsByCategory(categoryId);
  if (!query.trim()) return base;
  const q = query.toLowerCase();
  return base.filter(
    (f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)
  );
};
