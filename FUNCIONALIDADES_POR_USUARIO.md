# Funcionalidades por Tipo de Usuario - PetHub SaaS

Este documento detalla todas las funcionalidades disponibles para cada tipo de usuario en la plataforma PetHub SaaS.

---

## 📱 **USUARIO CLIENTE (Client)**

### **Dashboard Principal**
- Vista general con estadísticas de mascotas
- Accesos rápidos a todos los módulos
- Resumen de actividad reciente
- Contador de mascotas registradas
- Estadísticas de órdenes y compras

### **Gestión de Mascotas**
- **Registro de Mascotas**: Crear y gestionar perfiles completos de mascotas
  - Información básica: nombre, especie, raza, edad, peso
  - Sistema de microchip
  - Múltiples imágenes por mascota
  - Disponibilidad para cría
- **Pet Room (Habitación de Mascota)**: Vista individual de cada mascota
  - Información completa de la mascota
  - Accesos a módulos específicos por mascota
  - Historial de actividades
- **Pet Journey**: Historial completo y trazabilidad de cada mascota

### **Módulos de Cuidado**

#### **1. Ejercicio y Trazabilidad** (`/trazabilidad`)
- Registro de sesiones de ejercicio diarias
- Cálculo de calorías quemadas
- Historial completo de actividades
- Metas personalizadas
- Análisis de rendimiento con gráficos
- Seguimiento de actividad física
- Adventure Log: Registro de aventuras y actividades

#### **2. Nutrición Inteligente** (`/feeding-schedules`)
- Gestión de horarios de alimentación automática
- Registro de comidas diarias
- Cálculo nutricional
- Recordatorios automáticos de alimentación
- Historial alimenticio completo
- Control de porciones
- Meal Journal: Diario de comidas

#### **3. Veterinaria Digital** (`/veterinaria`)
- Registro de visitas veterinarias
- Historial médico completo
- Documentos y notas médicas
- Seguimiento de vacunas y tratamientos
- Health Journal: Diario de salud

#### **4. Recordatorios** (`/recordatorios`)
- Sistema de recordatorios personalizados
- Notificaciones de eventos importantes
- Recordatorios de vacunas, citas, medicamentos
- Pet Reminders: Recordatorios específicos por mascota

### **Marketplace y E-commerce**

#### **5. Tienda/Marketplace** (`/marketplace`)
- **Catálogo de Productos**:
  - Alimentos, juguetes, accesorios, higiene
  - Medicamentos, ropa, camas, equipamiento, transporte
  - Sistema de precios por tamaño/talla
  - Múltiples imágenes por producto
  - Búsqueda y filtros avanzados
- **Catálogo de Servicios**:
  - Veterinaria, grooming, entrenamiento
  - Alojamiento, transporte, fisioterapia, nutrición
  - Precios por tamaño de perro
  - Sistema de disponibilidad y citas
  - Slots de tiempo para servicios
- **Carrito de Compras**:
  - Carrito persistente
  - Vinculación de productos/servicios con mascotas específicas
- **Checkout Completo**:
  - Múltiples direcciones de entrega
  - Tarjetas de pago guardadas
  - Cálculo automático de costos de envío
  - Selección de método de pago

#### **6. Mis Órdenes** (`/client-orders`)
- Seguimiento completo de órdenes
- Estados detallados: pending, confirmed, processing, shipped, delivered, cancelled
- Historial de compras
- Detalles de productos y servicios adquiridos
- Vinculación con mascotas

### **Social Hub y Comunidad**

#### **7. Social Hub** (`/social-hub`)
- Red social para dueños de mascotas
- Búsqueda y descubrimiento de mascotas
- Sistema de mensajería
- Favoritos y seguimiento

#### **8. Adopción Responsable** (`/adopcion`)
- Búsqueda de mascotas disponibles para adopción
- Sistema de swipe (like/dislike)
- Favoritos de mascotas
- Solicitudes de adopción
- Chat con refugios/propietarios
- Visualización de refugios
- Información detallada de compatibilidad

#### **9. Sistema de Cría** (`/parejas`)
- Búsqueda de parejas para cría
- Emparejamientos de mascotas
- Chat de coordinación
- Gestión de parejas

#### **10. Mascotas Perdidas** (`/mascotas-perdidas`)
- Registro de mascotas perdidas
- Búsqueda con mapas interactivos (Leaflet)
- Sistema de reportes
- Estado de búsqueda (perdida, encontrada)
- Información de contacto y ubicación

### **Configuración y Ajustes**

#### **11. Ajustes** (`/ajustes`)
- **Perfil de Usuario**:
  - Edición de información personal
  - Cambio de avatar
  - Actualización de datos de contacto
- **Gestión de Direcciones**:
  - Múltiples direcciones de entrega
  - Dirección por defecto
  - Coordenadas geográficas
- **Gestión de Tarjetas de Pago**:
  - Agregar/eliminar tarjetas
  - Tarjeta por defecto
  - Últimos 4 dígitos visibles
- **Preferencias**:
  - Configuración de notificaciones
  - Preferencias de privacidad

### **Deliveries** (`/deliveries`)
- Seguimiento de entregas
- Estado de paquetes en tránsito

---

## 🏪 **USUARIO PROVEEDOR (Provider)**

### **Dashboard Principal**
- Vista general con estadísticas de negocio
- Métricas de ingresos y órdenes
- Resumen de productos y servicios
- Calificaciones y reseñas
- Estado de verificación

### **Gestión de Perfil**
- **Información del Negocio**:
  - Nombre del negocio
  - Tipo de negocio
  - Descripción
  - Teléfono y dirección
  - Ubicación con mapa (Google Places)
  - Foto de perfil
- **Verificación Automática**: Auto-verificación al confirmar email
- **Estadísticas del Negocio**:
  - Años de experiencia
  - Total de clientes
  - Calificación promedio
  - Total de reseñas

### **Gestión de Productos**
- **Catálogo de Productos**:
  - Crear, editar y eliminar productos
  - Categorías: alimentos, juguetes, accesorios, higiene, medicamentos, ropa, camas, equipamiento, transporte
  - Sistema de precios por tamaño (pequeño, mediano, grande, extra grande) o talla de ropa (XS, S, M, L, XL, XXL)
  - Múltiples imágenes por producto
  - Descripción detallada
  - Gestión de stock
  - Alertas de stock bajo
  - Estado activo/inactivo
- **Estadísticas de Productos**:
  - Total de productos activos/inactivos
  - Productos con stock bajo
  - Productos más vendidos

### **Gestión de Servicios**
- **Catálogo de Servicios**:
  - Crear, editar y eliminar servicios
  - Categorías: veterinaria, grooming, entrenamiento, alojamiento, transporte, fisioterapia, nutrición
  - Sistema de precios por tamaño de perro
  - Descripción detallada
  - Estado activo/inactivo
- **Disponibilidad y Citas**:
  - Configuración de disponibilidad
  - Gestión de horarios
  - Slots de tiempo para servicios
  - Calendario de citas
- **Estadísticas de Servicios**:
  - Total de servicios activos/inactivos
  - Citas pendientes, confirmadas, completadas, canceladas
  - Próximas citas

### **Gestión de Órdenes**
- **Dashboard de Órdenes**:
  - Vista de todas las órdenes
  - Estados: pending, confirmed, processing, shipped, delivered, cancelled
  - Filtros por estado y fecha
  - Detalles completos de cada orden
- **Estadísticas de Órdenes**:
  - Total de órdenes
  - Órdenes completadas
  - Órdenes pendientes
  - Órdenes en proceso
  - Órdenes enviadas
  - Órdenes canceladas
  - Productos vendidos
  - Servicios reservados

### **Análisis y Reportes**
- **Ingresos**:
  - Ingresos totales
  - Ingresos mensuales
  - Gráficos de ingresos por mes
  - Tendencias de ventas
- **Gráficos y Visualizaciones**:
  - Gráfico de ingresos mensuales
  - Gráfico de órdenes por mes
  - Análisis de productos más vendidos
  - Análisis de servicios más solicitados

### **Reseñas y Calificaciones**
- Visualización de reseñas de clientes
- Calificación promedio
- Total de reseñas recibidas
- Respuestas a reseñas (si está implementado)

### **Citas y Appointments**
- Gestión de citas de servicios
- Actualización de estado de citas
- Calendario de disponibilidad
- Notificaciones de nuevas citas

---

## 🏠 **USUARIO ALBERGUE (Shelter)**

### **Dashboard Principal**
- Vista general con estadísticas del refugio
- Métricas de adopciones
- Resumen de mascotas disponibles
- Solicitudes de adopción pendientes
- Estadísticas de refugio

### **Gestión del Refugio**
- **Información del Refugio**:
  - Nombre del refugio
  - Ubicación y dirección
  - Teléfono y email
  - Descripción y misión
  - Años de experiencia
  - Total de voluntarios
  - Estadísticas: mascotas rescatadas, adopciones exitosas
- **Galería de Imágenes**:
  - Subir múltiples imágenes del refugio
  - Gestión de galería
  - Imagen principal
- **Videos de YouTube**:
  - Agregar videos de YouTube
  - Gestión de videos
  - Vista previa de videos

### **Gestión de Mascotas para Adopción**
- **Publicación de Mascotas**:
  - Crear, editar y eliminar mascotas para adopción
  - Información detallada:
    - Nombre, especie, raza, edad, peso
    - Sexo, tamaño, nivel de energía
    - Compatibilidad: niños, perros, gatos
    - Estado de adiestramiento
    - Esterilización
    - Necesidades especiales
    - Notas médicas
  - Tarifa de adopción
  - Ubicación
  - Múltiples imágenes
- **Filtros y Búsqueda**:
  - Búsqueda por nombre
  - Filtros por tamaño, especie, edad, género
  - Filtros por características (adiestrado, esterilizado, etc.)
- **Vista de Mascotas**:
  - Vista de tarjetas (cards)
  - Vista de lista
  - Información completa de cada mascota

### **Gestión de Solicitudes de Adopción**
- **Solicitudes Recibidas**:
  - Vista de todas las solicitudes
  - Estados: pending, approved, rejected
  - Información del solicitante
  - Mascota solicitada
  - Mensaje del solicitante
  - Fecha de solicitud
- **Aprobación/Rechazo**:
  - Aprobar solicitudes de adopción
  - Rechazar solicitudes
  - Cambiar estado de solicitudes
- **Estadísticas de Solicitudes**:
  - Total de solicitudes
  - Solicitudes pendientes
  - Solicitudes aprobadas
  - Solicitudes rechazadas
- **Vista de Solicitudes**:
  - Vista de tarjetas (cards)
  - Vista de lista

### **Chat y Comunicación**
- **Chat con Adoptantes**:
  - Sistema de mensajería integrado
  - Chat en tiempo real
  - Historial de conversaciones
  - Notificaciones de nuevos mensajes

### **Análisis y Estadísticas**
- **Estadísticas del Refugio**:
  - Mascotas rescatadas
  - Adopciones exitosas
  - Total de voluntarios
  - Mascotas disponibles actualmente
- **Gráficos y Visualizaciones**:
  - Gráfico de adopciones por mes
  - Gráfico de solicitudes por mes
  - Tendencias de adopción
  - Análisis de éxito de adopciones

### **Gestión de Favoritos**
- Visualización de usuarios que han marcado el refugio como favorito
- Estadísticas de popularidad

---

## 📊 **Resumen Comparativo**

| Funcionalidad | Cliente | Proveedor | Albergue |
|--------------|---------|-----------|----------|
| **Dashboard** | ✅ | ✅ | ✅ |
| **Gestión de Mascotas** | ✅ | ❌ | ✅ (Adopción) |
| **Ejercicio y Trazabilidad** | ✅ | ❌ | ❌ |
| **Nutrición** | ✅ | ❌ | ❌ |
| **Veterinaria Digital** | ✅ | ❌ | ❌ |
| **Recordatorios** | ✅ | ❌ | ❌ |
| **Marketplace - Comprar** | ✅ | ❌ | ❌ |
| **Marketplace - Vender** | ❌ | ✅ | ❌ |
| **Gestión de Productos** | ❌ | ✅ | ❌ |
| **Gestión de Servicios** | ❌ | ✅ | ❌ |
| **Gestión de Órdenes** | ✅ (Compras) | ✅ (Ventas) | ❌ |
| **Adopción** | ✅ (Solicitar) | ❌ | ✅ (Gestionar) |
| **Sistema de Cría** | ✅ | ❌ | ❌ |
| **Mascotas Perdidas** | ✅ | ❌ | ❌ |
| **Chat** | ✅ | ✅ | ✅ |
| **Reseñas** | ✅ (Escribir) | ✅ (Recibir) | ❌ |
| **Análisis y Reportes** | ✅ (Básico) | ✅ (Avanzado) | ✅ (Adopciones) |
| **Gestión de Refugio** | ❌ | ❌ | ✅ |
| **Gestión de Perfil** | ✅ | ✅ | ✅ |

---

**Última actualización**: Diciembre 2024

