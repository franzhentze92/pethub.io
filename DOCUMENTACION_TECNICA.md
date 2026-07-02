# **Documentación Técnica de la Plataforma**

## **PetHub SaaS – Plataforma Integral para el Cuidado de Mascotas**

PetHub SaaS es una plataforma integral diseñada para centralizar la gestión del cuidado de mascotas, conectando dueños, veterinarios, proveedores de servicios, refugios y repartidores en un ecosistema completo. La plataforma integra múltiples módulos especializados bajo una arquitectura moderna, modular y escalable.

---

## **Arquitectura del Sistema**

### **Modelo de Aplicación**

* **Frontend/Backend desacoplado** mediante Supabase como Backend-as-a-Service (BaaS)
* Cliente web tipo **SPA (Single Page Application)** con React
* **Arquitectura serverless** con Supabase como backend completo
* **API automática** generada por Supabase desde el esquema PostgreSQL
* Comunicación en tiempo real mediante **Supabase Realtime** para notificaciones y actualizaciones
* Arquitectura modular preparada para evolución a microservicios

### **Patrón de Datos**

* **Multi-tenant** con aislamiento de datos por usuario mediante Row Level Security (RLS)
* **Base de datos relacional PostgreSQL** gestionada por Supabase
* **Storage tipo S3** (Supabase Storage) para archivos de mascotas, productos, servicios y avatares
* **Triggers y funciones** en PostgreSQL para automatización de procesos (actualización de timestamps, generación de números de factura, verificación automática)

---

## **Stack Tecnológico**

### **Frontend**

#### **Core Framework**

* **React 18.3.1** con TypeScript 5.5.3
* **Vite 5.4.1** como build tool
* **React Router DOM 6.26.2** para enrutamiento
* **React Hook Form 7.53.0** para formularios
* **Zod 3.23.8** para validación de esquemas

#### **UI/UX**

* **TailwindCSS 3.4.11** para diseño UI
* **Radix UI** (componentes accesibles):
  - Accordion, Alert Dialog, Avatar, Checkbox, Dialog, Dropdown Menu
  - Hover Card, Label, Popover, Progress, Radio Group, Select
  - Separator, Slider, Switch, Tabs, Toast, Tooltip, Context Menu
  - Navigation Menu, Menubar, Scroll Area, Resizable Panels
* **shadcn/ui** como sistema de componentes
* **Lucide React 0.462.0** para iconos
* **next-themes 0.3.0** para gestión de temas (soporte dark mode)
* **Sonner 1.5.0** para notificaciones toast

#### **Visualización de Datos**

* **Recharts 2.15.4** para gráficos y dashboards interactivos
* **Chart.js 4.5.0** y **react-chartjs-2 5.3.0** para visualizaciones adicionales
* **Leaflet 1.9.4** y **react-leaflet 4.2.1** para mapas interactivos

#### **Gestión de Estado y Datos**

* **TanStack React Query 5.84.1** para gestión de estado del servidor y caché
* **React Context API** para estado global:
  - `AuthContext` - Autenticación y sesión de usuario
  - `CartContext` - Carrito de compras del marketplace
  - `AppContext` - Estado general de la aplicación
  - `NavigationContext` - Estado de navegación

#### **Otras Librerías**

* **date-fns 3.6.0** para manejo de fechas
* **uuid 11.1.0** para generación de IDs únicos
* **marked 12.0.1** para renderizado de markdown
* **react-day-picker 8.10.1** para selección de fechas
* **react-dropzone 14.3.8** para carga de archivos
* **embla-carousel-react 8.3.0** para carruseles
* **highlight.js 11.9.0** para resaltado de código
* **input-otp 1.2.4** para códigos OTP
* **cmdk 1.0.0** para comandos tipo Spotlight
* **vaul 0.9.3** para drawers móviles
* **react-resizable-panels 2.1.3** para paneles redimensionables

### **Backend (Supabase)**

#### **Base de Datos**

* **PostgreSQL** (gestionado por Supabase)
* **Row Level Security (RLS)** para control de acceso multi-tenant
* **Funciones almacenadas (RPC)** para lógica de negocio compleja
* **Triggers** para automatización:
  - Creación automática de perfiles de usuario
  - Actualización de timestamps (`updated_at`)
  - Generación automática de números de factura
  - Verificación automática de proveedores al confirmar email

#### **Autenticación**

* **Supabase Auth** con JWT
* **Gestión de sesiones** automática con persistencia
* **Políticas de seguridad** basadas en roles
* **Auto-verificación** de proveedores al confirmar email

#### **Storage**

* **Supabase Storage** (compatible con S3) para archivos
* Buckets configurados:
  - `avatars` - Imágenes de perfil de usuarios
  - Almacenamiento de imágenes de mascotas
  - Imágenes de productos y servicios
  - Documentos y recibos

#### **APIs**

* **REST API automática** generada desde el esquema PostgreSQL
* **Realtime API** para actualizaciones en tiempo real

---

## **Estructura de Base de Datos**

### **Tablas Principales**

#### **Autenticación y Usuarios**

* `auth.users` (tabla nativa de Supabase)
* `user_profiles` - Perfiles de usuario extendidos
  - Roles: `admin`, `client`, `provider`, `shelter`, `delivery`
  - Información personal: nombre completo, teléfono, dirección, avatar
  - Vinculación con usuarios de Supabase Auth

#### **Mascotas**

* `pets` - Mascotas registradas por usuarios
  - Información básica: nombre, especie, raza, edad, peso
  - Microchip, disponibilidad para cría
  - Imágenes y propietario
* `adoption_pets` - Mascotas disponibles para adopción
  - Información detallada: sexo, tamaño, nivel de energía
  - Compatibilidad: niños, perros, gatos
  - Estado de adiestramiento, esterilización
  - Necesidades especiales y notas médicas
  - Tarifa de adopción y ubicación
* `adoption_applications` - Solicitudes de adopción
* `adoption_favorites` - Mascotas favoritas de usuarios
* `adoption_swipes` - Sistema de swipe para adopción

#### **Refugios**

* `shelters` - Información de refugios de animales
  - Descripción, ubicación, contacto
  - Misión, años de experiencia
  - Estadísticas: mascotas rescatadas, adopciones exitosas, voluntarios
* `shelter_images` - Galería de imágenes de refugios
* `shelter_videos` - Videos de YouTube de refugios
* `shelter_favorites` - Refugios favoritos de usuarios

#### **Marketplace y E-commerce**

* `products` - Catálogo de productos
  - Categorías: alimentos, juguetes, accesorios, higiene, medicamentos, ropa, camas, equipamiento, transporte
  - Sistema de precios por tamaño (pequeño, mediano, grande, extra grande) o talla de ropa (XS, S, M, L, XL, XXL)
  - Imágenes múltiples, descripción, stock
* `services` - Catálogo de servicios
  - Categorías: veterinaria, grooming, entrenamiento, alojamiento, transporte, fisioterapia, nutrición
  - Sistema de precios por tamaño de perro
  - Disponibilidad, horarios, slots de tiempo
* `providers` - Proveedores de productos y servicios
  - Información de negocio, verificación
  - Calificaciones y reseñas
* `orders` - Órdenes de compra
  - Estados: pending, confirmed, processing, shipped, delivered, cancelled
  - Información de entrega, repartidor asignado
  - Totales, descuentos, costos de envío
* `order_items` - Items de cada orden
  - Productos o servicios
  - Cantidad, precio, subtotal
* `order_item_pets` - Vinculación de items de orden con mascotas
  - Permite rastrear qué productos/servicios son para qué mascota
* `client_addresses` - Direcciones de entrega de clientes
  - Múltiples direcciones por cliente
  - Dirección por defecto
  - Coordenadas geográficas
* `payment_cards` - Tarjetas de pago guardadas
  - Últimos 4 dígitos, tipo de tarjeta
  - Fecha de expiración, tarjeta por defecto

#### **Sistemas de Cuidado**

* `exercise_sessions` - Sesiones de ejercicio de mascotas
* `nutrition_sessions` - Sesiones de nutrición
* `veterinary_sessions` - Registros veterinarios
* `feeding_schedules` - Horarios de alimentación
* `service_appointments` - Citas de servicios
* `service_availability` - Disponibilidad de servicios
* `service_time_slots` - Slots de tiempo para servicios

#### **Sistema de Cría y Parejas**

* `breeding_matches` - Emparejamientos para cría
* `adoption_chat_rooms` - Salas de chat para adopción

#### **Mascotas Perdidas**

* `lost_pets` - Registro de mascotas perdidas
  - Información de la mascota
  - Ubicación donde se perdió
  - Estado: perdida, encontrada
  - Fechas y detalles de contacto

#### **Sistema de Entrega**

* `delivery_expenses` - Gastos de repartidores
  - Combustible, mantenimiento, otros gastos
  - Vinculación con repartidor y admin
  - Fecha y monto

#### **Facturación y Finanzas**

* `invoices` - Facturas generadas
  - Número de factura único (INV-YYYY-XXXXXX)
  - Información del cliente
  - Totales: subtotal, envío, impuestos, descuentos
  - Estado: issued, paid, cancelled
  - Método de pago y estado de pago
* `admin_costs` - Costos administrativos mensuales
  - Categorías: hosting, marketing, delivery, income, salarios, renta, servicios_publicos, tecnologia, seguros, impuestos, equipamiento, capacitacion, consultoria, transporte, almacenamiento, otros
  - Monto, fecha, mes, año
  - Recibos y notas

#### **Reseñas y Calificaciones**

* `provider_reviews` - Reseñas de proveedores
  - Calificación, comentario
  - Cliente y proveedor

#### **Otros**

* `team_members` - Miembros del equipo (si aplica)

### **Funciones RPC Principales**

* Funciones de verificación de roles (ej: `is_admin_user()`)
* Funciones de generación de números de factura (`generate_invoice_number()`)
* Funciones de actualización de timestamps (`update_updated_at_column()`)

---

## **Motor de Gestión de la Plataforma**

### **Funcionalidades Principales**

#### **1. Gestión de Usuarios Multi-rol**

* Sistema de roles: `admin`, `client`, `provider`, `shelter`, `delivery`
* Creación automática de perfiles al registrarse
* Auto-verificación de proveedores al confirmar email
* Aislamiento de datos mediante RLS
* Gestión de avatares y perfiles

#### **2. Gestión de Mascotas**

* Registro completo de mascotas con información detallada
* Sistema de imágenes múltiples
* Vinculación con propietarios
* Disponibilidad para cría
* Sistema de microchip

#### **3. Sistema de Adopción**

* Publicación de mascotas para adopción
* Información detallada de compatibilidad
* Sistema de swipe (like/dislike)
* Favoritos
* Solicitudes de adopción
* Chat entre adoptantes y refugios/propietarios
* Gestión de refugios con galerías y videos

#### **4. Marketplace Integral**

* **Productos**:
  - Catálogo completo con múltiples categorías
  - Sistema de precios por tamaño/talla
  - Imágenes múltiples
  - Gestión de stock
* **Servicios**:
  - Catálogo de servicios profesionales
  - Precios por tamaño de perro
  - Sistema de disponibilidad y citas
  - Slots de tiempo
* **Proveedores**:
  - Registro y verificación
  - Sistema de reseñas y calificaciones
  - Dashboards para proveedores
* **Carrito y Checkout**:
  - Carrito persistente
  - Múltiples direcciones de entrega
  - Tarjetas de pago guardadas
  - Cálculo de costos de envío
  - Vinculación de productos/servicios con mascotas
* **Órdenes**:
  - Seguimiento completo de órdenes
  - Estados detallados
  - Asignación de repartidores
  - Facturación automática

#### **5. Módulos de Cuidado**

* **Ejercicio y Trazabilidad**:
  - Registro de sesiones de ejercicio
  - Seguimiento de actividad
  - Gráficos de progreso
* **Nutrición Inteligente**:
  - Horarios de alimentación automáticos
  - Registro de comidas
  - Análisis nutricional
  - Notificaciones de alimentación
* **Veterinaria Digital**:
  - Registro de visitas veterinarias
  - Historial médico
  - Notas y documentos
* **Recordatorios Inteligentes**:
  - Sistema de recordatorios personalizados
  - Notificaciones de eventos importantes

#### **6. Sistema de Cría**

* Emparejamientos de mascotas
* Chat para coordinación
* Gestión de parejas

#### **7. Mascotas Perdidas**

* Registro de mascotas perdidas
* Sistema de búsqueda
* Mapas interactivos con Leaflet
* Estado de búsqueda

#### **8. Sistema de Entrega**

* Dashboard para repartidores
* Gestión de órdenes asignadas
* Registro de gastos
* Seguimiento de entregas

#### **9. Panel Administrativo**

* Gestión de usuarios
* Gestión de mascotas
* Gestión de órdenes
* Gestión de productos y servicios
* Gestión de proveedores y refugios
* Análisis operacional
* Análisis financiero
* Gestión de costos administrativos
* Gestión de gastos de entrega
* Registros de ejercicio, nutrición y veterinaria
* Gestión de adopciones
* Gestión de emparejamientos
* Gestión de mascotas perdidas

#### **10. Sistema de Facturación**

* Generación automática de facturas
* Números de factura únicos
* Información completa de cliente
* Cálculo de totales
* Estados de pago

---

## **Seguridad y Gobernanza de Datos**

### **Autenticación y Autorización**

* **Supabase Auth** con JWT tokens
* **Gestión de sesiones** automática con persistencia
* **Row Level Security (RLS)** en todas las tablas
* **Políticas de acceso** basadas en roles:
  - `admin`: Acceso completo a todas las tablas
  - `client`: Acceso a sus propios datos y órdenes
  - `provider`: Acceso a sus productos, servicios y órdenes
  - `shelter`: Acceso a sus refugios y mascotas en adopción
  - `delivery`: Acceso a órdenes asignadas y gastos

### **Control de Acceso**

* **Aislamiento de datos por usuario** mediante RLS
* **Funciones RPC** para operaciones que requieren bypass de RLS (solo admin)
* **Validación de permisos** en frontend y backend
* **Rutas protegidas** con componentes de autenticación

### **Seguridad de Datos**

* **HTTPS obligatorio** (gestionado por Supabase)
* **Validación de datos** con Zod en frontend
* **Protección contra inyección SQL** mediante queries parametrizadas de Supabase
* **Gestión segura de tarjetas de pago** (solo últimos 4 dígitos almacenados)
* **Encriptación de datos sensibles** en tránsito y reposo

### **Cumplimiento**

* **GDPR ready**: Capacidad de exportar/eliminar datos de usuarios
* **Auditoría**: Timestamps de creación y actualización en todas las tablas
* **Logs de actividad**: Disponibles en Supabase Dashboard

---

## **Infraestructura**

### **Hosting y Deployment**

* **Frontend**: Desplegado como SPA estática (Vite build)
* **Backend**: Supabase (PostgreSQL + APIs + Auth + Storage)
* **CDN**: Assets estáticos servidos por Supabase/Vite
* **Servidor de desarrollo**: Vite dev server en puerto 8080

### **Escalabilidad**

* **Arquitectura serverless** con Supabase
* **Escalado automático** de base de datos
* **Caché de queries** mediante React Query
* **Code splitting** automático con Vite
* **Lazy loading** de rutas y componentes

### **Monitoreo y Logging**

* **Supabase Dashboard** para monitoreo de base de datos
* **Console logging** en desarrollo
* **Error boundaries** en React para captura de errores

---

## **Desarrollo y DevOps**

### **Configuración del Proyecto**

* **TypeScript** para type safety
* **ESLint 9.9.0** para linting de código
* **Path aliases** (`@/` para `src/`)
* **Environment variables** para configuración:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

### **Scripts Disponibles**

```json
{
  "dev": "vite",                    // Servidor de desarrollo (puerto 8080)
  "build": "vite build",            // Build de producción
  "build:dev": "vite build --mode development",
  "lint": "eslint .",               // Linting
  "preview": "vite preview"          // Preview del build
}
```

### **Estructura de Carpetas**

```
src/
├── components/          # Componentes React reutilizables
│   ├── layout/         # Layouts (AppLayout, Admin, Provider, Delivery)
│   ├── landing/        # Componentes de landing page
│   └── ui/             # Componentes UI (shadcn/ui)
├── contexts/           # React Contexts (Auth, Cart, App, Navigation)
├── hooks/              # Custom hooks
│   ├── useAdoption.ts
│   ├── useProvider.ts
│   ├── useSettings.ts
│   ├── useSupabase.ts
│   ├── use-mobile.tsx
│   └── use-toast.ts
├── lib/                # Utilidades y servicios
│   ├── supabase.ts    # Cliente Supabase y tipos
│   ├── storage.ts     # Utilidades de storage
│   └── utils.ts       # Utilidades generales
├── pages/              # Páginas/Views
│   ├── admin/         # Páginas administrativas
│   ├── landing/       # Páginas de landing (Home, About, Features, etc.)
│   └── [varias].tsx   # Otras páginas
├── services/          # Servicios de negocio
│   ├── AutoCompleteService.ts
│   ├── FeedingScheduleService.ts
│   └── petStatusService.ts
├── types/             # TypeScript types
├── utils/             # Utilidades
│   └── deliveryCost.ts
└── config/            # Configuraciones
    ├── productPricing.ts
    └── servicePricing.ts

supabase/              # Scripts SQL de migración
├── supabase_*.sql     # Scripts de creación de tablas y RLS
```

---

## **Rendimiento y Optimización**

### **Frontend**

* **Code splitting** por rutas con React Router
* **Lazy loading** de componentes pesados
* **React Query** para caché inteligente de datos
* **Optimización de imágenes** (lazy loading)
* **Tree shaking** automático con Vite

### **Base de Datos**

* **Índices** en columnas frecuentemente consultadas:
  - `user_id` en múltiples tablas
  - `order_id`, `client_id` en órdenes y facturas
  - `status` en órdenes y facturas
  - `category` en costos administrativos
  - `year`, `month` en costos administrativos
* **Queries optimizadas** mediante índices
* **Paginación** en listados grandes
* **Caché de queries** en React Query

### **Red**

* **Compresión** de assets (gzip/brotli)
* **CDN** para assets estáticos
* **HTTP/2** y HTTP/3 support
* **Minificación** de código en producción

---

## **Integraciones y APIs**

### **APIs Internas**

* **Supabase REST API**: Acceso directo a tablas mediante cliente JS
* **Supabase Realtime**: Suscripciones en tiempo real a cambios

### **APIs Externas**

* **Leaflet/OpenStreetMap**: Mapas interactivos para ubicaciones
* **Preparado para**:
  - APIs de pago (Stripe, PayPal, etc.)
  - Servicios de email
  - Notificaciones push
  - Analytics externos

---

## **Características Técnicas Avanzadas**

### **Real-time Updates**

* **Supabase Realtime** para actualizaciones en tiempo real
* **Notificaciones** de nuevos mensajes
* **Actualizaciones** de estado de órdenes
* **Sincronización** de datos entre clientes

### **Offline Support**

* **React Query** con persistencia de caché
* Preparado para Service Workers (PWA)

### **Accesibilidad**

* **Radix UI** componentes accesibles
* **ARIA labels** en componentes personalizados
* **Keyboard navigation** completa
* **Screen reader** compatible

### **Sistema de Precios Dinámico**

* **Productos**: Sistema de precios por tamaño de perro o talla de ropa según categoría
* **Servicios**: Sistema de precios por tamaño de perro
* Configuración centralizada en `productPricing.ts` y `servicePricing.ts`

---

## **Testing y Calidad**

### **Type Safety**

* **TypeScript** estricto en todo el proyecto
* **Tipos generados** desde Supabase schema (parcialmente en `supabase.ts`)
* **Validación** con Zod en runtime

### **Code Quality**

* **ESLint** para detección de errores
* **Convenciones** de código consistentes

---

## **Módulos Principales de la Plataforma**

### **1. Dashboard Principal**
* Vista general para clientes
* Estadísticas de mascotas
* Accesos rápidos a módulos

### **2. Pet Room (Habitación de Mascota)**
* Vista individual de cada mascota
* Información completa
* Accesos a módulos específicos por mascota

### **3. Ejercicio y Trazabilidad**
* Registro de sesiones de ejercicio
* Gráficos de progreso
* Seguimiento de actividad física

### **4. Nutrición Inteligente**
* Horarios de alimentación
* Registro de comidas
* Análisis nutricional
* Notificaciones automáticas

### **5. Veterinaria Digital**
* Historial médico completo
* Registro de visitas
* Documentos y notas

### **6. Adopción Responsable**
* Búsqueda de mascotas
* Sistema de swipe
* Solicitudes de adopción
* Chat con refugios/propietarios
* Gestión de refugios

### **7. Marketplace Integral**
* Catálogo de productos
* Catálogo de servicios
* Carrito de compras
* Checkout completo
* Gestión de órdenes

### **8. Social Hub**
* Red social para dueños de mascotas
* Búsqueda de mascotas para adopción
* Sistema de mensajería
* Favoritos

### **9. Sistema de Cría**
* Emparejamientos
* Chat de coordinación

### **10. Mascotas Perdidas**
* Registro de mascotas perdidas
* Búsqueda con mapas
* Sistema de reportes

### **11. Recordatorios**
* Sistema de recordatorios personalizados
* Notificaciones de eventos

### **12. Ajustes**
* Configuración de perfil
* Gestión de direcciones
* Gestión de tarjetas de pago
* Preferencias

---

## **Roles y Permisos**

### **Admin**
* Acceso completo a todas las funcionalidades
* Gestión de usuarios, productos, servicios
* Análisis operacional y financiero
* Gestión de costos administrativos
* Supervisión de órdenes y entregas

### **Client**
* Gestión de sus mascotas
* Acceso a todos los módulos de cuidado
* Compra en marketplace
* Solicitudes de adopción
* Sistema de cría
* Reporte de mascotas perdidas

### **Provider**
* Gestión de productos y servicios
* Gestión de disponibilidad y citas
* Dashboard de órdenes
* Reseñas y calificaciones
* Verificación automática al confirmar email

### **Shelter**
* Gestión de refugio
* Publicación de mascotas para adopción
* Gestión de solicitudes de adopción
* Chat con adoptantes
* Estadísticas del refugio

### **Delivery**
* Dashboard de órdenes asignadas
* Gestión de entregas
* Registro de gastos
* Perfil y configuración

---

## **Roadmap Técnico**

### **Corto Plazo**
* Completar tipos TypeScript desde Supabase schema
* Mejorar sistema de notificaciones
* Optimización de queries con índices adicionales

### **Mediano Plazo**
* Implementación de PWA
* Sistema de notificaciones push
* Integración con pasarelas de pago
* Mejora del sistema de búsqueda

### **Largo Plazo**
* Migración a microservicios (si es necesario)
* Implementación de colas de procesamiento asíncrono
* Sistema de webhooks para integraciones
* Machine Learning para recomendaciones

---

**Última actualización**: Diciembre 2024

