/**
 * Upload files from DB Backup/ttptbdgvlxnslvacapjt/ to Supabase Storage.
 *
 * Requires in .env:
 *   VITE_SUPABASE_URL=https://xxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ...
 *
 * Usage: node scripts/migrate-storage.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative, sep } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = join(__dirname, '..');
const backupRoot = join(root, 'DB Backup', 'ttptbdgvlxnslvacapjt');
const extraBackup = join(root, 'DB Backup', 'ttptbdgvlxnslvacapjt.storage', 'ttptbdgvlxnslvacapjt');

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

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function mimeFor(name) {
  const ext = name.split('.').pop()?.toLowerCase();
  const map = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
    webp: 'image/webp', pdf: 'application/pdf', mp4: 'video/mp4',
  };
  return map[ext] || 'application/octet-stream';
}

async function uploadDir(supabase, baseDir, bucketFilter) {
  if (!statSync(baseDir, { throwIfNoAccess: false })?.isDirectory()) return { ok: 0, fail: 0 };

  const files = walk(baseDir);
  let ok = 0;
  let fail = 0;

  for (const filePath of files) {
    const rel = relative(baseDir, filePath).split(sep).join('/');
    const parts = rel.split('/');
    const bucket = parts[0];
    if (bucketFilter && bucket !== bucketFilter) continue;
    const objectPath = parts.slice(1).join('/');
    if (!objectPath) continue;

    const body = readFileSync(filePath);
    const { error } = await supabase.storage.from(bucket).upload(objectPath, body, {
      upsert: true,
      contentType: mimeFor(objectPath),
    });

    if (error) {
      console.error(`FAIL ${bucket}/${objectPath}:`, error.message);
      fail++;
    } else {
      console.log(`OK   ${bucket}/${objectPath}`);
      ok++;
    }
  }

  return { ok, fail };
}

async function main() {
  const env = loadEnv();
  const url = env.VITE_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    console.error('Missing VITE_SUPABASE_URL in .env');
    process.exit(1);
  }
  if (!key) {
    console.error('Missing SUPABASE_SERVICE_ROLE_KEY in .env');
    console.error('Get it from Supabase Dashboard → Project Settings → API → service_role');
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  console.log('Uploading from', backupRoot);
  const r1 = await uploadDir(supabase, backupRoot);

  console.log('Uploading extras from', extraBackup);
  const r2 = await uploadDir(supabase, extraBackup);

  const ok = r1.ok + r2.ok;
  const fail = r1.fail + r2.fail;
  console.log(`\nDone: ${ok} uploaded, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
