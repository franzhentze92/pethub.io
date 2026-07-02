import { supabase } from '@/lib/supabase';
import type { AiExecutionContext, AiModuleDefinition } from '../types';
import {
  buildProductTextOrFilter,
  expandMarketplaceTokens,
  inferProductCategory,
  inferTargetSpecies,
  scoreProductMatch,
  scoreProductMatchSemantic,
  tokenizeMarketplaceQuery,
} from '../helpers/marketplaceSearch';

interface SearchProductsParams {
  query?: string;
  category?: string;
  limit?: number;
}

interface SearchServicesParams {
  query?: string;
  category?: string;
  limit?: number;
}

export const marketplaceModule: AiModuleDefinition = {
  id: 'marketplace',
  name: 'Marketplace',
  description: 'Productos y servicios para mascotas (precios, stock, proveedores)',
  basePath: '/marketplace/products',
  tools: [
    {
      name: 'marketplace_search_products',
      description:
        'Busca productos en la TIENDA para comprar (provider_products): alimentos, juguetes, accesorios, etc. Usar cuando el usuario quiera comprar, ver precios o buscar en marketplace. Para registrar comidas en Nutrición usa nutrition_list_foods, no esta herramienta.',
      keywords: [
        'producto', 'productos', 'tienda', 'marketplace', 'comprar', 'compra', 'precio', 'cuesta', 'vale',
        'concentrado', 'croquetas', 'juguete', 'accesorio', 'medicamento', 'stock', 'marca', 'delivery',
      ],
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Texto a buscar en nombre, descripción o marca' },
          category: {
            type: 'string',
            description: 'Categoría del producto',
            enum: ['alimentos', 'juguetes', 'accesorios', 'higiene', 'medicamentos', 'ropa', 'equipamiento'],
          },
          limit: { type: 'number', description: 'Máximo de resultados (default 10)' },
        },
        additionalProperties: false,
      },
      execute: async (params: SearchProductsParams) => {
        const limit = Math.min(params.limit ?? 12, 50);
        const searchText = params.query?.trim() ?? '';
        const category = params.category ?? inferProductCategory(searchText);
        const species = inferTargetSpecies(searchText);
        const baseTokens = tokenizeMarketplaceQuery(searchText);
        const tokens = expandMarketplaceTokens(baseTokens);

        const runQuery = async (opts: {
          useTextFilter: boolean;
          requireStock: boolean;
        }) => {
          let query = supabase
            .from('provider_products')
            .select(
              'id, product_name, product_category, description, detailed_description, brand, price, currency, stock_quantity, tags, target_species, product_subtype, life_stage, ingredients, nutrition_protein_pct, nutrition_fat_pct, nutrition_fiber_pct, nutrition_moisture_pct, nutrition_ash_pct, nutrition_calories_per_100g, providers(business_name, has_delivery)',
            )
            .eq('is_active', true);

          if (opts.requireStock) {
            query = query.gt('stock_quantity', 0);
          }

          if (category) {
            query = query.ilike('product_category', `%${category}%`);
          }

          if (species) {
            query = query.or(`target_species.cs.{${species}},target_species.cs.{todos}`);
          }

          if (opts.useTextFilter) {
            const orFilter = buildProductTextOrFilter(tokens);
            if (orFilter) query = query.or(orFilter);
          }

          const fetchLimit = opts.useTextFilter ? Math.max(limit * 4, 24) : limit;
          const { data, error } = await query
            .order('created_at', { ascending: false })
            .limit(fetchLimit);

          if (error) throw error;
          return data ?? [];
        };

        let rows = await runQuery({ useTextFilter: tokens.length > 0, requireStock: true });

        if (rows.length === 0 && tokens.length > 0) {
          rows = await runQuery({ useTextFilter: false, requireStock: true });
        }

        if (rows.length === 0) {
          rows = await runQuery({ useTextFilter: false, requireStock: false });
        }

        const ranked = rows
          .map((row) => ({ row, score: scoreProductMatch(row, tokens) }))
          .sort((a, b) => b.score - a.score)
          .map((r) => r.row)
          .slice(0, limit);

        return {
          total: ranked.length,
          query_used: searchText || undefined,
          category_applied: category,
          species_applied: species,
          products: ranked.map((p) => ({
            id: p.id,
            name: p.product_name,
            category: p.product_category,
            brand: p.brand,
            price: p.price,
            currency: p.currency,
            stock: p.stock_quantity,
            provider: (p.providers as { business_name?: string })?.business_name,
            hasDelivery: (p.providers as { has_delivery?: boolean })?.has_delivery,
            ingredients: p.ingredients,
            nutrition: {
              protein_pct: p.nutrition_protein_pct,
              fat_pct: p.nutrition_fat_pct,
              fiber_pct: p.nutrition_fiber_pct,
              moisture_pct: p.nutrition_moisture_pct,
              calories_per_100g: p.nutrition_calories_per_100g,
            },
          })),
        };
      },
    },
    {
      name: 'marketplace_search_semantic',
      description:
        'Búsqueda mejorada de productos con coincidencia por frase completa, tags y descripción. Usar cuando la búsqueda normal no encuentre resultados o el usuario describa necesidades (ej. "alimento hipoalergénico para perro adulto").',
      keywords: [
        'recomiéndame',
        'recomiendame',
        'busca algo para',
        'necesito algo',
        'mejor opción',
        'mejor opcion',
        'alternativa',
        'similar a',
        'hipoalergénico',
        'hipoalergenico',
        'sin granos',
      ],
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Descripción de lo que busca el usuario' },
          category: {
            type: 'string',
            description: 'Categoría del producto',
            enum: ['alimentos', 'juguetes', 'accesorios', 'higiene', 'medicamentos', 'ropa', 'equipamiento'],
          },
          limit: { type: 'number', description: 'Máximo de resultados (default 10)' },
        },
        required: ['query'],
        additionalProperties: false,
      },
      execute: async (params: SearchProductsParams) => {
        const limit = Math.min(params.limit ?? 10, 30);
        const searchText = params.query?.trim() ?? '';
        if (!searchText) {
          return { error: 'QUERY_REQUIRED', message: 'Indica qué producto buscas.', products: [] };
        }

        const category = params.category ?? inferProductCategory(searchText);
        const species = inferTargetSpecies(searchText);
        const baseTokens = tokenizeMarketplaceQuery(searchText);
        const tokens = expandMarketplaceTokens(baseTokens);

        let query = supabase
          .from('provider_products')
          .select(
            'id, product_name, product_category, description, detailed_description, brand, price, currency, stock_quantity, tags, target_species, product_subtype, life_stage, ingredients, nutrition_protein_pct, nutrition_fat_pct, nutrition_fiber_pct, nutrition_moisture_pct, nutrition_ash_pct, nutrition_calories_per_100g, providers(business_name, has_delivery)',
          )
          .eq('is_active', true)
          .gt('stock_quantity', 0);

        if (category) query = query.ilike('product_category', `%${category}%`);
        if (species) {
          query = query.or(`target_species.cs.{${species}},target_species.cs.{todos}`);
        }

        const orFilter = buildProductTextOrFilter(tokens);
        if (orFilter) query = query.or(orFilter);

        const { data, error } = await query.order('created_at', { ascending: false }).limit(Math.max(limit * 5, 30));
        if (error) throw error;

        const ranked = (data ?? [])
          .map((row) => ({
            row,
            score: scoreProductMatchSemantic(row, tokens, searchText),
          }))
          .filter((r) => r.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, limit)
          .map((r) => r.row);

        return {
          total: ranked.length,
          query_used: searchText,
          search_mode: 'semantic_lite',
          category_applied: category,
          species_applied: species,
          products: ranked.map((p) => ({
            id: p.id,
            name: p.product_name,
            category: p.product_category,
            brand: p.brand,
            price: p.price,
            currency: p.currency,
            stock: p.stock_quantity,
            tags: p.tags,
            provider: (p.providers as { business_name?: string })?.business_name,
            hasDelivery: (p.providers as { has_delivery?: boolean })?.has_delivery,
            ingredients: p.ingredients,
            nutrition: {
              protein_pct: p.nutrition_protein_pct,
              fat_pct: p.nutrition_fat_pct,
              fiber_pct: p.nutrition_fiber_pct,
              moisture_pct: p.nutrition_moisture_pct,
              calories_per_100g: p.nutrition_calories_per_100g,
            },
          })),
        };
      },
    },
    {
      name: 'marketplace_search_services',
      description: 'Busca servicios (grooming, veterinaria, entrenamiento, etc.) con precio y duración.',
      keywords: [
        'servicio', 'servicios', 'grooming', 'veterinaria', 'entrenamiento', 'alojamiento',
        'reservar', 'cita', 'baño', 'peluquería', 'paseo',
      ],
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Texto a buscar' },
          category: { type: 'string', description: 'Categoría del servicio' },
          limit: { type: 'number', description: 'Máximo de resultados' },
        },
        additionalProperties: false,
      },
      execute: async (params: SearchServicesParams) => {
        const limit = params.limit ?? 10;
        let query = supabase
          .from('provider_services')
          .select(
            'id, service_name, service_category, description, price, currency, duration_minutes, providers(business_name, address)'
          )
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (params.category) {
          query = query.ilike('service_category', `%${params.category}%`);
        }
        if (params.query) {
          const q = params.query.trim();
          query = query.or(
            `service_name.ilike.%${q}%,description.ilike.%${q}%,service_category.ilike.%${q}%`
          );
        }

        const { data, error } = await query;
        if (error) throw error;

        return {
          total: data?.length ?? 0,
          services: (data ?? []).map((s) => ({
            name: s.service_name,
            category: s.service_category,
            price: s.price,
            currency: s.currency,
            durationMinutes: s.duration_minutes,
            provider: (s.providers as { business_name?: string })?.business_name,
            address: (s.providers as { address?: string })?.address,
          })),
        };
      },
    },
    {
      name: 'marketplace_count_catalog',
      description: 'Cuenta cuántos productos y servicios hay disponibles en total.',
      keywords: ['cuantos productos', 'cuántos productos', 'cuantos servicios', 'catalogo', 'catálogo', 'disponibles'],
      parameters: { type: 'object', properties: {}, additionalProperties: false },
      execute: async () => {
        const [products, services] = await Promise.all([
          supabase
            .from('provider_products')
            .select('id', { count: 'exact', head: true })
            .eq('is_active', true)
            .gt('stock_quantity', 0),
          supabase
            .from('provider_services')
            .select('id', { count: 'exact', head: true })
            .eq('is_active', true),
        ]);

        return {
          products: products.count ?? 0,
          services: services.count ?? 0,
        };
      },
    },
    {
      name: 'marketplace_add_favorite',
      description: 'Guarda un producto o servicio del marketplace en favoritos del usuario.',
      keywords: ['guardar favorito', 'agregar favorito', 'me gusta', 'guardar producto', 'guardar servicio'],
      parameters: {
        type: 'object',
        properties: {
          product_name: { type: 'string' },
          service_name: { type: 'string' },
          item_type: { type: 'string', description: 'product o service' },
        },
        additionalProperties: false,
      },
      execute: async (
        params: { product_name?: string; service_name?: string; item_type?: string },
        ctx: AiExecutionContext,
      ) => {
        if (!ctx.userId) return { error: 'Usuario no autenticado' };

        const isService =
          params.item_type === 'service' || Boolean(params.service_name && !params.product_name);

        if (isService && params.service_name?.trim()) {
          const { data: services, error } = await supabase
            .from('provider_services')
            .select('id, service_name')
            .eq('is_active', true)
            .ilike('service_name', `%${params.service_name.trim()}%`)
            .limit(1);
          if (error) throw error;
          const service = services?.[0];
          if (!service) {
            return { error: 'NOT_FOUND', message: `No encontré el servicio "${params.service_name}".` };
          }

          const { error: favError } = await supabase.from('marketplace_favorites').insert({
            user_id: ctx.userId,
            item_type: 'service',
            service_id: service.id,
            product_id: null,
          });
          if (favError && favError.code !== '23505') throw favError;

          return {
            success: true,
            item_name: service.service_name,
            message: `Servicio "${service.service_name}" guardado en favoritos.`,
            actionPath: '/marketplace/services',
          };
        }

        const searchName = params.product_name?.trim() || params.service_name?.trim();
        if (!searchName) {
          return { error: 'NAME_REQUIRED', message: 'Indica el nombre del producto o servicio.' };
        }

        const { data: products, error } = await supabase
          .from('provider_products')
          .select('id, product_name')
          .eq('is_active', true)
          .ilike('product_name', `%${searchName}%`)
          .limit(1);
        if (error) throw error;
        const product = products?.[0];
        if (!product) {
          return { error: 'NOT_FOUND', message: `No encontré el producto "${searchName}".` };
        }

        const { error: favError } = await supabase.from('marketplace_favorites').insert({
          user_id: ctx.userId,
          item_type: 'product',
          product_id: product.id,
          service_id: null,
        });
        if (favError && favError.code !== '23505') throw favError;

        return {
          success: true,
          item_name: product.product_name,
          message: `Producto "${product.product_name}" guardado en favoritos.`,
          actionPath: '/marketplace/products',
        };
      },
    },
  ],
};
