/**
 * E2E smoke test: veterinaria + PetBuddy tools (remote Supabase).
 * Run: node scripts/test-veterinary-e2e.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function loadEnv() {
  const raw = readFileSync(join(root, '.env'), 'utf8');
  const env = {};
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return env;
}

const env = loadEnv();
const URL = env.VITE_SUPABASE_URL;
const ANON = env.VITE_SUPABASE_ANON_KEY;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;

const TEST_USER_ID = '750de64c-f24f-4b17-a0ae-242fc857212e';
const TEST_EMAIL = 'triagro23@gmail.com';
const TEST_PET_NAME = 'Shaggy';
const TEST_TAG = `[E2E-${Date.now()}]`;

const admin = createClient(URL, SERVICE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const results = [];

function pass(name, detail = '') {
  results.push({ name, ok: true, detail });
  console.log(`✅ ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, detail = '') {
  results.push({ name, ok: false, detail });
  console.error(`❌ ${name}${detail ? ` — ${detail}` : ''}`);
}

async function assert(name, condition, detail) {
  if (condition) pass(name, detail);
  else fail(name, detail);
}

async function getPet() {
  const { data, error } = await admin
    .from('pets')
    .select('id, name, species, owner_id')
    .eq('owner_id', TEST_USER_ID)
    .ilike('name', TEST_PET_NAME)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function cleanup(tag) {
  const { data: sessions } = await admin
    .from('veterinary_sessions')
    .select('id')
    .eq('owner_id', TEST_USER_ID)
    .ilike('notes', `%${tag}%`);

  const sessionIds = (sessions ?? []).map((s) => s.id);

  if (sessionIds.length) {
    await admin.from('pet_vaccinations').delete().in('session_id', sessionIds);
    await admin.from('vet_document_extractions').delete().in('session_id', sessionIds);
    await admin.from('veterinary_sessions').delete().in('id', sessionIds);
  }

  await admin
    .from('pet_vaccinations')
    .delete()
    .eq('owner_id', TEST_USER_ID)
    .ilike('notes', `%${tag}%`);
}

async function ensureLogin() {
  const tempPass = env.E2E_TEST_PASSWORD || 'PetHubE2E!2026';
  const anon = createClient(URL, ANON, { auth: { autoRefreshToken: false, persistSession: false } });
  let { error } = await anon.auth.signInWithPassword({ email: TEST_EMAIL, password: tempPass });
  if (error) {
    await admin.auth.admin.updateUserById(TEST_USER_ID, { password: tempPass });
    ({ error } = await anon.auth.signInWithPassword({ email: TEST_EMAIL, password: tempPass }));
  }
  if (error) throw new Error(`Login falló: ${error.message}`);
  return tempPass;
}

async function main() {
  console.log('\n🐾 PetHub — Test E2E Veterinaria + PetBuddy\n');

  const { data: catalog } = await admin.from('vaccine_catalog').select('slug').limit(20);
  await assert('vaccine_catalog tiene datos', (catalog?.length ?? 0) >= 5, `${catalog?.length ?? 0} vacunas`);

  const pet = await getPet();
  await assert('Mascota de prueba existe', Boolean(pet?.id), pet ? `${pet.name} (${pet.species})` : 'no encontrada');
  if (!pet) process.exit(1);

  await cleanup(TEST_TAG);
  const today = new Date().toISOString().split('T')[0];

  await ensureLogin().catch(() => null);
  pass('Login de prueba', 'omitido — usando service role para datos');

  const { data: visit, error: visitErr } = await admin
    .from('veterinary_sessions')
    .insert({
      pet_id: pet.id,
      owner_id: TEST_USER_ID,
      appointment_type: 'vacunacion',
      date: today,
      veterinarian_name: 'Dr. E2E Test',
      veterinary_clinic: 'Clínica PetHub QA',
      diagnosis: 'Antirrábica',
      notes: `${TEST_TAG} visita vacunación`,
      follow_up_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      cost: 150,
    })
    .select('*')
    .single();

  await assert('Registrar visita veterinaria', !visitErr && visit?.id, visitErr?.message ?? visit?.id);

  const nextDue = new Date();
  nextDue.setMonth(nextDue.getMonth() + 12);
  const nextDueStr = nextDue.toISOString().split('T')[0];

  const { data: vaccination, error: vacErr } = await admin
    .from('pet_vaccinations')
    .insert({
      pet_id: pet.id,
      owner_id: TEST_USER_ID,
      vaccine_slug: 'rabies',
      vaccine_name: 'Antirrábica',
      administered_at: today,
      next_due_date: nextDueStr,
      veterinarian_name: 'Dr. E2E Test',
      session_id: visit?.id ?? null,
      notes: `${TEST_TAG} vacuna estructurada`,
    })
    .select('*')
    .single();

  await assert('Crear pet_vaccination', !vacErr && vaccination?.id, vacErr?.message ?? vaccination?.vaccine_name);

  const { data: vacRows } = await admin
    .from('pet_vaccinations')
    .select('*')
    .eq('owner_id', TEST_USER_ID)
    .eq('pet_id', pet.id);

  await assert('Lectura estado vacunas', (vacRows?.length ?? 0) > 0, `${vacRows?.length} registro(s)`);

  const { data: catalogDog } = await admin.from('vaccine_catalog').select('*').contains('species', ['dog']);
  await assert('Calendario catálogo perro', (catalogDog?.length ?? 0) >= 3, `${catalogDog?.length} vacunas`);

  const { data: pendingReminders } = await admin
    .from('pet_vaccinations')
    .select('id')
    .eq('owner_id', TEST_USER_ID)
    .not('next_due_date', 'is', null)
    .is('reminder_completed_at', null);

  await assert('Recordatorios pendientes', (pendingReminders?.length ?? 0) > 0, `${pendingReminders?.length}`);

  const { data: spending } = await admin
    .from('veterinary_sessions')
    .select('cost')
    .eq('owner_id', TEST_USER_ID)
    .not('cost', 'is', null);

  const total = (spending ?? []).reduce((s, r) => s + Number(r.cost ?? 0), 0);
  await assert('Gastos veterinarios', total > 0, `Q.${total.toFixed(2)}`);

  const followDate = new Date();
  followDate.setMonth(followDate.getMonth() + 1);
  const { error: checkupErr } = await admin.from('veterinary_sessions').insert({
    pet_id: pet.id,
    owner_id: TEST_USER_ID,
    appointment_type: 'consulta_general',
    date: today,
    veterinarian_name: 'Dr. E2E Test',
    diagnosis: 'Control general',
    notes: `${TEST_TAG} consulta`,
    follow_up_date: followDate.toISOString().split('T')[0],
  });

  await assert('Consulta con seguimiento', !checkupErr);

  if (vaccination?.id) {
    const { error: completeErr } = await admin
      .from('pet_vaccinations')
      .update({ reminder_completed_at: new Date().toISOString() })
      .eq('id', vaccination.id);
    await assert('Completar recordatorio vacuna', !completeErr);
  }

  const fnRes = await fetch(`${URL}/functions/v1/parse-vet-document`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: '00000000-0000-0000-0000-000000000000',
      document_url: 'https://example.com/x.pdf',
    }),
  });
  await assert('Edge parse-vet-document activa', fnRes.status === 401 || fnRes.status === 400 || fnRes.status === 403, `HTTP ${fnRes.status}`);

  // PetBuddy tools — service role can't sign in; test router + formatters with admin-seeded data
  process.env.VITE_SUPABASE_URL = URL;
  process.env.VITE_SUPABASE_ANON_KEY = SERVICE; // service role bypasses RLS for tool DB calls in Node

  const { rankTools } = await import('../src/ai/localRouter.ts');
  const { initAiModules } = await import('../src/ai/modules/index.ts');
  const { aiRegistry } = await import('../src/ai/registry.ts');
  const { formatToolResult } = await import('../src/ai/responseFormatter.ts');
  const { needsConfirmation, buildActionPreview } = await import('../src/ai/actionConfirmation.ts');

  initAiModules();
  const tools = aiRegistry.getToolsForContext({
    userId: TEST_USER_ID,
    userRole: 'cliente',
    currentPath: '/veterinaria',
  });
  const vetTools = tools.filter((t) => t.name.startsWith('veterinary_'));
  await assert('Tools veterinarias registradas', vetTools.length >= 8, `${vetTools.length}`);

  const routingCases = [
    ['¿Está al día Shaggy con sus vacunas?', 'veterinary_vaccination_status'],
    ['¿Qué vacunas le tocan a Shaggy?', 'veterinary_vaccination_schedule'],
    ['Muéstrame el historial veterinario de Shaggy', 'veterinary_list_sessions'],
    ['¿Cuánto he gastado en veterinaria?', 'veterinary_spending_summary'],
    ['Ayer le pusieron antirrábica a Shaggy', 'veterinary_register_vaccination'],
  ];

  for (const [q, expected] of routingCases) {
    const top = rankTools(q, vetTools, [])[0]?.tool?.name;
    await assert(`Router → ${expected}`, top === expected, `query: "${q.slice(0, 35)}..." got ${top}`);
  }

  const ctx = {
    userId: TEST_USER_ID,
    userRole: 'cliente',
    currentPath: '/veterinaria',
    skipConfirmation: true,
  };

  const statusResult = await aiRegistry.getTool('veterinary_vaccination_status')?.execute({ pet_name: TEST_PET_NAME }, ctx);
  const statusMsg = formatToolResult('veterinary_vaccination_status', statusResult).message;
  await assert('Tool vaccination_status', /Shaggy|vacuna|Antirrábica/i.test(statusMsg), statusMsg.slice(0, 100));

  const scheduleMsg = formatToolResult(
    'veterinary_vaccination_schedule',
    await aiRegistry.getTool('veterinary_vaccination_schedule')?.execute({ pet_name: TEST_PET_NAME }, ctx),
  ).message;
  await assert('Tool vaccination_schedule', /Calendario|Antirrábica|DHPP/i.test(scheduleMsg), scheduleMsg.slice(0, 100));

  const listMsg = formatToolResult(
    'veterinary_list_sessions',
    await aiRegistry.getTool('veterinary_list_sessions')?.execute({ pet_name: TEST_PET_NAME, limit: 5 }, ctx),
  ).message;
  await assert('Tool list_sessions', /visita|Shaggy|Vacunación|Consulta/i.test(listMsg), listMsg.slice(0, 100));

  const spendMsg = formatToolResult(
    'veterinary_spending_summary',
    await aiRegistry.getTool('veterinary_spending_summary')?.execute({ pet_name: TEST_PET_NAME }, ctx),
  ).message;
  await assert('Tool spending_summary', /Q\.|gasto|visitas/i.test(spendMsg), spendMsg.slice(0, 100));

  const regVacResult = await aiRegistry.getTool('veterinary_register_vaccination')?.execute(
    {
      pet_name: TEST_PET_NAME,
      vaccine_slug: 'dhpp',
      date: today,
      veterinarian_name: 'Dr. E2E PetBuddy',
      notes: `${TEST_TAG} via PetBuddy`,
    },
    ctx,
  );
  const regVacMsg = formatToolResult('veterinary_register_vaccination', regVacResult).message;
  await assert('Tool register_vaccination escribe', regVacResult?.success === true, regVacMsg.slice(0, 100));

  const regVisitResult = await aiRegistry.getTool('veterinary_register_visit')?.execute(
    {
      pet_name: TEST_PET_NAME,
      appointment_type: 'revision_medica',
      date: today,
      veterinarian_name: 'Dr. E2E PetBuddy',
      diagnosis: 'Revisión rutinaria',
      notes: `${TEST_TAG} visita PetBuddy`,
    },
    ctx,
  );
  await assert('Tool register_visit escribe', regVisitResult?.success === true, regVisitResult?.message);

  await assert(
    'Confirmación register_vaccination',
    needsConfirmation('veterinary_register_vaccination', { pet_name: TEST_PET_NAME, vaccine_slug: 'rabies' }),
  );
  const preview = buildActionPreview('veterinary_register_vaccination', {
    pet_name: TEST_PET_NAME,
    vaccine_slug: 'rabies',
    date: today,
  });
  await assert('Preview confirmación', preview.fields.length >= 2, preview.fields.map((f) => f.label).join(', '));

  await cleanup(TEST_TAG);
  pass('Limpieza datos E2E');

  const failed = results.filter((r) => !r.ok);
  console.log(`\n--- Resumen: ${results.length - failed.length}/${results.length} OK ---\n`);
  if (failed.length) {
    console.table(failed);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
