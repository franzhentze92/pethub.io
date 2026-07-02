export type OwnerColumn = 'owner_id' | 'user_id' | 'client_id';

export interface PetHubTableDef {
  description: string;
  columns: string[];
  ownerColumn?: OwnerColumn;
  readable: boolean;
  writable: boolean;
  notes?: string;
}

/** Curated PetHub / Supabase tables the agent can query (RLS applies via user JWT). */
export const PET_HUB_TABLES: Record<string, PetHubTableDef> = {
  pets: {
    description: 'Mascotas del usuario',
    columns: ['id', 'owner_id', 'name', 'species', 'breed', 'age', 'weight', 'gender', 'image_url', 'created_at'],
    ownerColumn: 'owner_id',
    readable: true,
    writable: true,
  },
  user_profiles: {
    description: 'Perfil del usuario (preferir profile_update tool para cambios)',
    columns: ['id', 'user_id', 'full_name', 'email', 'phone', 'role', 'avatar_url', 'address', 'city'],
    ownerColumn: 'user_id',
    readable: true,
    writable: false,
    notes: 'Lectura OK; escritura vía profile_update.',
  },
  pet_foods: {
    description: 'Catálogo de alimentos con perfil completo por 100g (macros, vitaminas, minerales)',
    columns: [
      'id', 'name', 'brand', 'food_type', 'species', 'life_stage', 'is_available', 'is_reference', 'data_source',
      'calories_per_100g', 'protein_per_100g', 'fat_per_100g', 'carbs_per_100g', 'fiber_per_100g',
      'moisture_per_100g', 'ash_per_100g',
      'vitamin_a_per_100g', 'vitamin_d_per_100g', 'vitamin_e_per_100g', 'vitamin_k_per_100g',
      'vitamin_b1_per_100g', 'vitamin_b2_per_100g', 'vitamin_b3_per_100g', 'vitamin_b6_per_100g',
      'vitamin_b12_per_100g', 'vitamin_c_per_100g',
      'calcium_per_100g', 'phosphorus_per_100g', 'magnesium_per_100g', 'iron_per_100g', 'zinc_per_100g',
      'copper_per_100g', 'manganese_per_100g', 'selenium_per_100g', 'sodium_per_100g', 'potassium_per_100g',
      'iodine_per_100g',
    ],
    readable: true,
    writable: false,
    notes: 'Preferir nutrition_get_food_profile; data_read_rows con search para búsqueda parcial.',
  },
  nutrition_sessions: {
    description: 'Comidas registradas (historial)',
    columns: [
      'id', 'pet_id', 'owner_id', 'date', 'feeding_time', 'meal_type', 'food_name',
      'quantity_grams', 'total_calories', 'total_protein', 'total_fat', 'total_carbs', 'notes',
    ],
    ownerColumn: 'owner_id',
    readable: true,
    writable: true,
    notes: 'Preferir nutrition_register_meal si está disponible.',
  },
  pet_feeding_schedules: {
    description: 'Horarios recurrentes de alimentación',
    columns: ['id', 'owner_id', 'pet_id', 'schedule_name', 'is_active', 'feeding_times', 'days_of_week', 'start_date'],
    ownerColumn: 'owner_id',
    readable: true,
    writable: true,
  },
  automated_meals: {
    description: 'Comidas programadas en calendario',
    columns: ['id', 'owner_id', 'pet_id', 'food_id', 'scheduled_date', 'scheduled_time', 'meal_type', 'quantity_grams', 'status'],
    ownerColumn: 'owner_id',
    readable: true,
    writable: true,
  },
  exercise_sessions: {
    description: 'Sesiones de ejercicio',
    columns: ['id', 'owner_id', 'pet_id', 'date', 'exercise_type', 'duration_minutes', 'intensity', 'calories_burned', 'notes'],
    ownerColumn: 'owner_id',
    readable: true,
    writable: true,
  },
  veterinary_sessions: {
    description: 'Visitas veterinarias',
    columns: [
      'id', 'owner_id', 'pet_id', 'date', 'appointment_type', 'diagnosis', 'treatment',
      'prescription', 'veterinarian_name', 'veterinary_clinic', 'cost', 'follow_up_date',
    ],
    ownerColumn: 'owner_id',
    readable: true,
    writable: true,
  },
  pet_vaccinations: {
    description: 'Vacunas aplicadas',
    columns: ['id', 'owner_id', 'pet_id', 'vaccine_name', 'vaccine_slug', 'administered_at', 'next_due_date'],
    ownerColumn: 'owner_id',
    readable: true,
    writable: true,
  },
  pet_reminders: {
    description: 'Recordatorios',
    columns: ['id', 'owner_id', 'pet_id', 'title', 'reminder_type', 'scheduled_date', 'scheduled_time', 'is_completed', 'is_active'],
    ownerColumn: 'owner_id',
    readable: true,
    writable: true,
  },
  provider_products: {
    description: 'Productos del marketplace (incluye ingredientes y análisis garantizado en alimentos/medicamentos)',
    columns: [
      'id', 'provider_id', 'product_name', 'brand', 'product_category', 'price', 'currency',
      'stock_quantity', 'is_active', 'description', 'ingredients',
      'nutrition_protein_pct', 'nutrition_fat_pct', 'nutrition_fiber_pct', 'nutrition_moisture_pct',
      'nutrition_calories_per_100g',
    ],
    readable: true,
    writable: false,
    notes: 'Creación vía catalog_create_product (proveedor).',
  },
  provider_services: {
    description: 'Servicios del marketplace',
    columns: ['id', 'provider_id', 'name', 'category', 'price', 'duration_minutes', 'is_active', 'description'],
    readable: true,
    writable: false,
  },
  providers: {
    description: 'Perfiles de proveedor',
    columns: ['id', 'user_id', 'business_name', 'description', 'phone', 'email', 'is_active'],
    ownerColumn: 'user_id',
    readable: true,
    writable: false,
  },
  marketplace_favorites: {
    description: 'Favoritos del usuario',
    columns: ['id', 'user_id', 'item_type', 'item_id', 'created_at'],
    ownerColumn: 'user_id',
    readable: true,
    writable: true,
  },
  orders: {
    description: 'Pedidos del cliente',
    columns: ['id', 'client_id', 'order_number', 'status', 'grand_total', 'currency', 'created_at', 'updated_at'],
    ownerColumn: 'client_id',
    readable: true,
    writable: false,
    notes: 'Solo lectura; checkout vía flujo de tienda / cart_add_item.',
  },
  order_items: {
    description: 'Líneas de pedido',
    columns: ['id', 'order_id', 'item_name', 'item_type', 'quantity', 'unit_price', 'total_price'],
    readable: true,
    writable: false,
  },
  service_appointments: {
    description: 'Citas de servicios reservados',
    columns: ['id', 'client_id', 'provider_id', 'service_id', 'appointment_date', 'appointment_time', 'status', 'order_id'],
    ownerColumn: 'client_id',
    readable: true,
    writable: false,
  },
  lost_pets: {
    description: 'Mascotas perdidas reportadas',
    columns: ['id', 'owner_id', 'pet_name', 'species', 'breed', 'status', 'location', 'description', 'contact_phone'],
    ownerColumn: 'owner_id',
    readable: true,
    writable: true,
  },
  adoption_pets: {
    description: 'Mascotas en adopción (albergues)',
    columns: ['id', 'shelter_id', 'name', 'species', 'breed', 'age', 'sex', 'status', 'description'],
    readable: true,
    writable: false,
  },
  shelters: {
    description: 'Albergues / refugios',
    columns: ['id', 'name', 'location', 'phone', 'email', 'description'],
    readable: true,
    writable: false,
  },
  vaccine_catalog: {
    description: 'Catálogo de vacunas',
    columns: ['slug', 'name', 'species', 'interval_days', 'description'],
    readable: true,
    writable: false,
  },
  pet_buddy_facts: {
    description: 'Hechos guardados del asistente',
    columns: ['id', 'user_id', 'pet_id', 'fact_text', 'category', 'updated_at'],
    ownerColumn: 'user_id',
    readable: true,
    writable: true,
  },
  vet_document_extractions: {
    description: 'PDFs veterinarios analizados',
    columns: ['id', 'owner_id', 'session_id', 'document_type', 'summary', 'parse_status', 'structured_data'],
    ownerColumn: 'owner_id',
    readable: true,
    writable: false,
  },
  breeding_matches: {
    description: 'Solicitudes de cruza / parejas',
    columns: ['id', 'requester_pet_id', 'target_pet_id', 'status', 'message', 'created_at'],
    readable: true,
    writable: true,
  },
};

const BLOCKED_TABLES = new Set(['app_secrets', 'auth.users']);

export function normalizeTableName(table: string): string {
  return table.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
}

export function getTableDef(table: string): PetHubTableDef | undefined {
  return PET_HUB_TABLES[normalizeTableName(table)];
}

export function isReadableTable(table: string): boolean {
  const key = normalizeTableName(table);
  if (BLOCKED_TABLES.has(key)) return false;
  const def = PET_HUB_TABLES[key];
  return Boolean(def?.readable);
}

export function isWritableTable(table: string): boolean {
  const key = normalizeTableName(table);
  if (BLOCKED_TABLES.has(key)) return false;
  const def = PET_HUB_TABLES[key];
  return Boolean(def?.writable);
}

export function listReadableTables(): string[] {
  return Object.keys(PET_HUB_TABLES).filter((t) => PET_HUB_TABLES[t].readable);
}

export function getPetHubSchemaForAgent(): string {
  const lines = [
    'TABLAS SUPABASE (RLS del usuario autenticado). Usa data_describe_schema, data_read_rows, data_insert_row, data_update_row.',
    'También tienes herramientas de dominio (nutrition_register_meal, cart_add_item, etc.) — úsalas cuando encajen.',
    '',
  ];
  for (const [name, def] of Object.entries(PET_HUB_TABLES)) {
    lines.push(
      `• ${name}: ${def.description}. Columnas: ${def.columns.join(', ')}.` +
        (def.ownerColumn ? ` Dueño: ${def.ownerColumn}.` : '') +
        (def.writable ? ' Escritura: sí.' : ' Escritura: no.') +
        (def.notes ? ` ${def.notes}` : ''),
    );
  }
  return lines.join('\n');
}
