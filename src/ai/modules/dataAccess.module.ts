import { supabase } from '@/lib/supabase';
import type { AiExecutionContext, AiModuleDefinition } from '../types';
import {
  getPetHubSchemaForAgent,
  getTableDef,
  isReadableTable,
  isWritableTable,
  listReadableTables,
  normalizeTableName,
  type OwnerColumn,
} from '../schema/petHubDataCatalog';

function injectOwnerColumn(
  row: Record<string, unknown>,
  ownerColumn: OwnerColumn | undefined,
  userId: string,
): Record<string, unknown> {
  if (!ownerColumn) return row;
  if (row[ownerColumn] != null && row[ownerColumn] !== '') return row;
  return { ...row, [ownerColumn]: userId };
}

export const dataAccessModule: AiModuleDefinition = {
  id: 'data_access',
  name: 'Acceso a datos',
  description: 'Lectura y escritura directa en tablas Supabase (modo agente)',
  tools: [
    {
      name: 'data_describe_schema',
      description:
        'Lista tablas y columnas disponibles en Supabase para el usuario actual. Usar antes de leer/escribir si no conoces la estructura.',
      keywords: ['esquema', 'tablas', 'columnas', 'schema', 'estructura bd'],
      parameters: {
        type: 'object',
        properties: {
          table: { type: 'string', description: 'Nombre de tabla opcional para detalle' },
        },
        additionalProperties: false,
      },
      execute: async (params: { table?: string }) => {
        if (params.table?.trim()) {
          const def = getTableDef(params.table);
          if (!def) {
            return { error: 'TABLE_UNKNOWN', tables: listReadableTables() };
          }
          return { table: normalizeTableName(params.table), ...def };
        }
        return {
          tables: listReadableTables(),
          summary: getPetHubSchemaForAgent(),
        };
      },
    },
    {
      name: 'data_read_rows',
      description:
        'SELECT en una tabla Supabase. Usa filtros eq exactos. Ej: pet_foods con filters { brand: "Royal Canin" } o nutrition_sessions con pet_id.',
      keywords: ['leer tabla', 'consultar bd', 'select', 'buscar en'],
      parameters: {
        type: 'object',
        properties: {
          table: { type: 'string', description: 'Nombre de tabla' },
          select: { type: 'string', description: 'Columnas CSV o * (default *)' },
          filters: {
            type: 'object',
            description: 'Filtros eq { columna: valor }',
          },
          search: { type: 'string', description: 'Búsqueda parcial en columnas de texto (ilike), ej. "Royal Canin"' },
          limit: { type: 'number', description: 'Máximo filas (default 25, max 100)' },
          order_by: { type: 'string', description: 'Columna para ordenar' },
          ascending: { type: 'boolean', description: 'Orden ascendente (default true)' },
        },
        required: ['table'],
        additionalProperties: false,
      },
      execute: async (
        params: {
          table: string;
          select?: string;
          filters?: Record<string, unknown>;
          search?: string;
          limit?: number;
          order_by?: string;
          ascending?: boolean;
        },
        ctx: AiExecutionContext,
      ) => {
        if (!ctx.userId) {
          return { error: 'AUTH_REQUIRED', message: 'Inicia sesión para consultar datos.' };
        }
        const table = normalizeTableName(params.table);
        if (!isReadableTable(table)) {
          return { error: 'TABLE_NOT_ALLOWED', table, allowed: listReadableTables() };
        }

        const limit = Math.min(Math.max(params.limit ?? 25, 1), 100);
        let query = supabase.from(table).select(params.select?.trim() || '*').limit(limit);

        if (params.filters && typeof params.filters === 'object') {
          for (const [key, value] of Object.entries(params.filters)) {
            if (value === null || value === undefined || value === '') continue;
            query = query.eq(key, value as string | number | boolean);
          }
        }

        if (params.search?.trim() && table === 'pet_foods') {
          const q = params.search.trim();
          query = query.or(`brand.ilike.%${q}%,name.ilike.%${q}%`);
        }

        if (params.order_by?.trim()) {
          query = query.order(params.order_by.trim(), { ascending: params.ascending !== false });
        }

        const { data, error } = await query;
        if (error) {
          return { error: 'QUERY_FAILED', message: error.message, table };
        }

        return {
          table,
          count: data?.length ?? 0,
          rows: data ?? [],
        };
      },
    },
    {
      name: 'data_insert_row',
      description:
        'INSERT en tabla permitida. owner_id/user_id/client_id se rellena automáticamente si aplica. Preferir tools de dominio cuando existan.',
      keywords: ['insertar', 'crear fila', 'agregar registro'],
      parameters: {
        type: 'object',
        properties: {
          table: { type: 'string' },
          row: { type: 'object', description: 'Objeto con columnas a insertar' },
        },
        required: ['table', 'row'],
        additionalProperties: false,
      },
      execute: async (
        params: { table: string; row: Record<string, unknown> },
        ctx: AiExecutionContext,
      ) => {
        if (!ctx.userId) {
          return { error: 'AUTH_REQUIRED', message: 'Inicia sesión.' };
        }
        const table = normalizeTableName(params.table);
        const def = getTableDef(table);
        if (!def?.writable) {
          return { error: 'WRITE_NOT_ALLOWED', table, message: 'Usa la herramienta de dominio correspondiente.' };
        }

        const row = injectOwnerColumn({ ...params.row }, def.ownerColumn, ctx.userId);
        const { data, error } = await supabase.from(table).insert(row).select('*').single();
        if (error) {
          return { error: 'INSERT_FAILED', message: error.message, table, row };
        }
        return { success: true, table, row: data };
      },
    },
    {
      name: 'data_update_row',
      description:
        'UPDATE en tabla permitida. filters debe incluir id u otra clave única. patch son solo columnas a cambiar.',
      keywords: ['actualizar fila', 'update', 'modificar registro'],
      parameters: {
        type: 'object',
        properties: {
          table: { type: 'string' },
          filters: { type: 'object', description: 'Filtros eq (ej. { id: "uuid" })' },
          patch: { type: 'object', description: 'Columnas a actualizar' },
        },
        required: ['table', 'filters', 'patch'],
        additionalProperties: false,
      },
      execute: async (
        params: { table: string; filters: Record<string, unknown>; patch: Record<string, unknown> },
        ctx: AiExecutionContext,
      ) => {
        if (!ctx.userId) {
          return { error: 'AUTH_REQUIRED', message: 'Inicia sesión.' };
        }
        const table = normalizeTableName(params.table);
        const def = getTableDef(table);
        if (!def?.writable) {
          return { error: 'WRITE_NOT_ALLOWED', table };
        }

        let query = supabase.from(table).update(params.patch);
        let filterCount = 0;
        for (const [key, value] of Object.entries(params.filters ?? {})) {
          if (value === null || value === undefined || value === '') continue;
          query = query.eq(key, value as string | number | boolean);
          filterCount += 1;
        }
        if (filterCount === 0) {
          return { error: 'FILTERS_REQUIRED', message: 'Indica al menos un filtro (ej. id).' };
        }

        const { data, error } = await query.select('*');
        if (error) {
          return { error: 'UPDATE_FAILED', message: error.message, table };
        }
        return { success: true, table, updated: data?.length ?? 0, rows: data ?? [] };
      },
    },
  ],
};
