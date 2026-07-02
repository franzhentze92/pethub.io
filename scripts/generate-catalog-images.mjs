/**
 * Generate AI catalog images for products/services missing a main image.
 *
 * Requires in .env:
 *   VITE_SUPABASE_URL=https://xxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ...
 *
 * The edge function must be deployed (uses REPLICATE/OPENAI secrets on Supabase).
 *
 * Usage:
 *   node scripts/generate-catalog-images.mjs --list
 *   node scripts/generate-catalog-images.mjs --next product
 *   node scripts/generate-catalog-images.mjs --next service
 *   node scripts/generate-catalog-images.mjs --type product --id <uuid>
 *   node scripts/generate-catalog-images.mjs --type service --id <uuid> --force
 *   node scripts/generate-catalog-images.mjs --all product
 *   node scripts/generate-catalog-images.mjs --all service
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function loadEnv() {
  const envPath = join(root, '.env');
  const env = {};
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return env;
}

function parseArgs(argv) {
  const args = { list: false, force: false };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--list') args.list = true;
    else if (arg === '--force') args.force = true;
    else if (arg === '--next') args.next = argv[++i];
    else if (arg === '--all') args.all = argv[++i];
    else if (arg === '--type') args.type = argv[++i];
    else if (arg === '--id') args.id = argv[++i];
    else if (arg === '--delay') args.delayMs = Number(argv[++i]) || 2000;
  }
  return args;
}

async function supabaseRest(env, path, options = {}) {
  const url = `${env.VITE_SUPABASE_URL}/rest/v1/${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: options.prefer ?? 'return=representation',
      ...(options.headers ?? {}),
    },
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    throw new Error(typeof data === 'object' ? JSON.stringify(data) : String(data));
  }
  return data;
}

async function listMissing(env) {
  const products = await supabaseRest(
    env,
    'provider_products?select=id,product_name,product_category&is_active=eq.true&or=(product_image_url.is.null,product_image_url.eq.)&order=created_at.asc',
  );
  const services = await supabaseRest(
    env,
    'provider_services?select=id,service_name,service_category&is_active=eq.true&or=(service_image_url.is.null,service_image_url.eq.)&order=created_at.asc',
  );

  console.log(`\nProductos sin imagen: ${products.length}`);
  for (const p of products) {
    console.log(`  [product] ${p.id} — ${p.product_name} (${p.product_category})`);
  }

  console.log(`\nServicios sin imagen: ${services.length}`);
  for (const s of services) {
    console.log(`  [service] ${s.id} — ${s.service_name} (${s.service_category})`);
  }

  return { products, services };
}

async function generateOne(env, type, id, force) {
  const fnUrl = `${env.VITE_SUPABASE_URL}/functions/v1/generate-catalog-image`;
  console.log(`\nGenerando imagen para ${type} ${id}...`);

  const res = await fetch(fnUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type, id, force }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? JSON.stringify(data));
  }

  if (data.skipped) {
    console.log(`Omitido: ya tiene imagen → ${data.imageUrl}`);
  } else {
    console.log(`OK: ${data.name}`);
    console.log(`URL: ${data.imageUrl}`);
    console.log(`Proveedor: ${data.provider}`);
  }

  return data;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateAll(env, type, force, delayMs = 2000) {
  const { products, services } = await listMissing(env);
  const queue = type === 'service' ? services : products;
  if (queue.length === 0) {
    console.log(`No hay ${type === 'product' ? 'productos' : 'servicios'} pendientes.`);
    return { ok: 0, failed: 0 };
  }

  let ok = 0;
  let failed = 0;
  console.log(`\nProcesando ${queue.length} ${type === 'product' ? 'productos' : 'servicios'}...\n`);

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    const label = type === 'product' ? item.product_name : item.service_name;
    console.log(`[${i + 1}/${queue.length}] ${label}`);
    try {
      await generateOne(env, type, item.id, force);
      ok++;
    } catch (err) {
      failed++;
      console.error(`  ERROR: ${err.message ?? err}`);
    }
    if (i < queue.length - 1 && delayMs > 0) {
      await sleep(delayMs);
    }
  }

  console.log(`\nListo: ${ok} generados, ${failed} fallidos.`);
  return { ok, failed };
}

async function main() {
  const env = loadEnv();
  if (!env.VITE_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Faltan VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env');
    process.exit(1);
  }

  const args = parseArgs(process.argv);

  if (args.list) {
    await listMissing(env);
    return;
  }

  if (args.next) {
    const { products, services } = await listMissing(env);
    const type = args.next === 'service' ? 'service' : 'product';
    const queue = type === 'product' ? products : services;
    if (queue.length === 0) {
      console.log(`No hay ${type === 'product' ? 'productos' : 'servicios'} pendientes.`);
      return;
    }
    await generateOne(env, type, queue[0].id, args.force);
    return;
  }

  if (args.all) {
    const type = args.all === 'service' ? 'service' : 'product';
    await generateAll(env, type, args.force, args.delayMs ?? 2000);
    return;
  }

  if (args.type && args.id) {
    await generateOne(env, args.type, args.id, args.force);
    return;
  }

  console.log(`Uso:
  node scripts/generate-catalog-images.mjs --list
  node scripts/generate-catalog-images.mjs --next product
  node scripts/generate-catalog-images.mjs --next service
  node scripts/generate-catalog-images.mjs --type product --id <uuid>
  node scripts/generate-catalog-images.mjs --type service --id <uuid> [--force]
  node scripts/generate-catalog-images.mjs --all product
  node scripts/generate-catalog-images.mjs --all service [--delay 3000]`);
}

main().catch((err) => {
  console.error('Error:', err.message ?? err);
  process.exit(1);
});
