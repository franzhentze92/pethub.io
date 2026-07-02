/**
 * Genera tarjetas SVG de producto y las sube a Supabase Storage
 * para productos del marketplace sin imagen (fallback sin IA).
 *
 * Usage:
 *   node scripts/upload-catalog-card-images.mjs --list
 *   node scripts/upload-catalog-card-images.mjs --all
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function loadEnv() {
  const env = {};
  for (const line of readFileSync(join(root, '.env'), 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return env;
}

const CATEGORY_STYLES = {
  alimentos: { from: '#fef3c7', to: '#f59e0b', accent: '#b45309', label: 'Alimentos' },
  juguetes: { from: '#ede9fe', to: '#8b5cf6', accent: '#5b21b6', label: 'Juguetes' },
  accesorios: { from: '#fdf4ff', to: '#d946ef', accent: '#86198f', label: 'Accesorios' },
  higiene: { from: '#e0f2fe', to: '#0ea5e9', accent: '#0369a1', label: 'Higiene' },
  medicamentos: { from: '#ffe4e6', to: '#f43f5e', accent: '#be123c', label: 'Medicamentos' },
  ropa: { from: '#fce7f3', to: '#ec4899', accent: '#9d174d', label: 'Ropa' },
  camas: { from: '#ffedd5', to: '#f97316', accent: '#c2410c', label: 'Camas' },
  transporte: { from: '#e0e7ff', to: '#6366f1', accent: '#3730a3', label: 'Transporte' },
  otro: { from: '#ccfbf1', to: '#14b8a6', accent: '#0f766e', label: 'Producto' },
};

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wrapText(text, maxChars = 22) {
  const words = text.split(/\s+/);
  const lines = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 3);
}

function categoryIcon(category) {
  switch (category) {
    case 'accesorios':
      return `
        <circle cx="512" cy="430" r="120" fill="none" stroke="white" stroke-width="18" opacity="0.9"/>
        <rect x="452" y="500" width="120" height="28" rx="14" fill="white" opacity="0.85"/>
      `;
    case 'camas':
      return `
        <rect x="332" y="470" width="360" height="90" rx="28" fill="white" opacity="0.9"/>
        <rect x="362" y="420" width="300" height="70" rx="35" fill="white" opacity="0.75"/>
      `;
    case 'higiene':
      return `
        <rect x="462" y="360" width="100" height="220" rx="24" fill="white" opacity="0.9"/>
        <rect x="492" y="330" width="40" height="40" rx="8" fill="white" opacity="0.8"/>
      `;
    case 'ropa':
      return `
        <path d="M412 560 L512 360 L612 560 Z" fill="white" opacity="0.9"/>
        <rect x="472" y="360" width="80" height="40" rx="12" fill="white" opacity="0.75"/>
      `;
    case 'transporte':
      return `
        <rect x="342" y="400" width="340" height="200" rx="36" fill="white" opacity="0.9"/>
        <circle cx="420" cy="620" r="36" fill="white" opacity="0.85"/>
        <circle cx="604" cy="620" r="36" fill="white" opacity="0.85"/>
      `;
    case 'juguetes':
      return `
        <circle cx="512" cy="470" r="110" fill="white" opacity="0.9"/>
        <path d="M512 360 L540 430 L612 430 L555 475 L575 545 L512 505 L449 545 L469 475 L412 430 L484 430 Z" fill="white" opacity="0.55"/>
      `;
    case 'medicamentos':
      return `
        <rect x="432" y="380" width="160" height="240" rx="24" fill="white" opacity="0.9"/>
        <rect x="472" y="420" width="80" height="160" rx="12" fill="white" opacity="0.45"/>
      `;
    case 'alimentos':
      return `
        <rect x="382" y="390" width="260" height="220" rx="20" fill="white" opacity="0.9"/>
        <rect x="412" y="420" width="200" height="120" rx="12" fill="white" opacity="0.5"/>
      `;
    default:
      return `
        <rect x="382" y="390" width="260" height="220" rx="32" fill="white" opacity="0.9"/>
        <circle cx="512" cy="500" r="60" fill="white" opacity="0.45"/>
      `;
  }
}

function buildProductCardSvg({ product_name, product_category, brand }) {
  const key = (product_category || 'otro').toLowerCase().trim();
  const style = CATEGORY_STYLES[key] ?? CATEGORY_STYLES.otro;
  const lines = wrapText(product_name, 24);
  const titleY = 760 - (lines.length - 1) * 34;
  const titleLines = lines
    .map((line, i) => {
      const y = titleY + i * 42;
      return `<text x="512" y="${y}" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="38" font-weight="700" fill="#1f2937">${escapeXml(line)}</text>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${style.from}"/>
      <stop offset="100%" stop-color="${style.to}"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="18" flood-color="#000000" flood-opacity="0.12"/>
    </filter>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <circle cx="180" cy="180" r="120" fill="white" opacity="0.12"/>
  <circle cx="860" cy="220" r="90" fill="white" opacity="0.1"/>
  <circle cx="820" cy="820" r="140" fill="white" opacity="0.08"/>
  <g filter="url(#shadow)">
    <rect x="162" y="210" width="700" height="500" rx="48" fill="white" opacity="0.22"/>
    <rect x="192" y="240" width="640" height="440" rx="40" fill="white" opacity="0.92"/>
    ${categoryIcon(key)}
  </g>
  <rect x="192" y="690" width="220" height="52" rx="26" fill="${style.accent}" opacity="0.92"/>
  <text x="302" y="726" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="24" font-weight="600" fill="white">${escapeXml(style.label)}</text>
  ${brand ? `<text x="512" y="690" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="26" font-weight="500" fill="${style.accent}" opacity="0.9">${escapeXml(brand)}</text>` : ''}
  ${titleLines}
  <text x="512" y="930" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="22" fill="#6b7280">PetHub Marketplace</text>
</svg>`;
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
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}

async function uploadPng(env, providerId, productId, pngBuffer) {
  const path = `${providerId}/card-${productId.slice(0, 8)}.png`;
  const url = `${env.VITE_SUPABASE_URL}/storage/v1/object/product-images/${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'image/png',
      'x-upsert': 'true',
    },
    body: pngBuffer,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
  return `${env.VITE_SUPABASE_URL}/storage/v1/object/public/product-images/${path}`;
}

async function listMissing(env) {
  return supabaseRest(
    env,
    'provider_products?select=id,provider_id,product_name,product_category,brand&is_active=eq.true&or=(product_image_url.is.null,product_image_url.eq.)&order=product_name.asc',
  );
}

async function main() {
  const env = loadEnv();
  if (!env.VITE_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Faltan VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env');
    process.exit(1);
  }

  const listOnly = process.argv.includes('--list');
  const products = await listMissing(env);
  console.log(`Productos sin imagen: ${products.length}`);
  for (const p of products) {
    console.log(`  ${p.product_name} (${p.product_category})`);
  }

  if (listOnly || products.length === 0) return;

  let ok = 0;
  for (const product of products) {
    try {
      const svg = buildProductCardSvg(product);
      const pngBuffer = await sharp(Buffer.from(svg)).png({ quality: 90 }).toBuffer();
      const imageUrl = await uploadPng(env, product.provider_id, product.id, pngBuffer);
      await supabaseRest(env, `provider_products?id=eq.${product.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ product_image_url: imageUrl }),
        prefer: 'return=minimal',
      });
      console.log(`OK: ${product.product_name}`);
      console.log(`    ${imageUrl}`);
      ok++;
    } catch (err) {
      console.error(`ERROR ${product.product_name}:`, err.message ?? err);
    }
  }
  console.log(`\nListo: ${ok}/${products.length} tarjetas subidas.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
