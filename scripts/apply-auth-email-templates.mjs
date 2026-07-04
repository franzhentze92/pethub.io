/**
 * Applies ALL PetHub Supabase Auth email templates via Management API.
 * Reads mapping from supabase/email-templates/email-manifest.json
 *
 * Usage:
 *   set SUPABASE_ACCESS_TOKEN=...
 *   set RESEND_API_KEY=...          (only with --with-smtp)
 *   node scripts/apply-auth-email-templates.mjs [--with-smtp]
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const templatesDir = join(root, 'supabase/email-templates');
const projectRef = 'uzcuhdkjfqqzqlxgwyjt';
const withSmtp = process.argv.includes('--with-smtp');

const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
if (!token) {
  console.error('Missing SUPABASE_ACCESS_TOKEN.');
  console.error('Create one at https://supabase.com/dashboard/account/tokens');
  process.exit(1);
}

const read = (rel) => readFileSync(join(templatesDir, rel), 'utf8').trim();
const manifest = JSON.parse(readFileSync(join(templatesDir, 'email-manifest.json'), 'utf8'));

const authUrl = `https://api.supabase.com/v1/projects/${projectRef}/config/auth`;

async function patchAuth(body, label) {
  const res = await fetch(authUrl, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`Failed ${label} (${res.status}):`, text);
    process.exit(1);
  }
  console.log(`✓ ${label}`);
}

if (withSmtp) {
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  if (!resendApiKey) {
    console.error('Missing RESEND_API_KEY (required with --with-smtp).');
    process.exit(1);
  }
  const smtpFrom = process.env.AUTH_SMTP_FROM || 'PetHub <noreply@pethubgt.com>';
  const smtpAdminEmail = smtpFrom.match(/<([^>]+)>/)?.[1] || 'noreply@pethubgt.com';
  const smtpSenderName = smtpFrom.replace(/<[^>]+>/, '').trim() || 'PetHub';

  console.log('Enabling Resend SMTP…');
  await patchAuth(
    {
      external_email_enabled: true,
      smtp_host: 'smtp.resend.com',
      smtp_port: 465,
      smtp_user: 'resend',
      smtp_pass: resendApiKey,
      smtp_admin_email: smtpAdminEmail,
      smtp_sender_name: smtpSenderName,
    },
    'Resend SMTP configured',
  );
}

const payload = {};

for (const t of manifest.auth_templates) {
  payload[t.subject_key] = read(t.subject_file);
  payload[t.content_key] = read(t.html_file);
}

for (const n of manifest.security_notifications) {
  payload[n.enabled_key] = true;
  payload[n.subject_key] = read(n.subject_file);
  payload[n.content_key] = read(n.html_file);
}

console.log(`Applying ${manifest.auth_templates.length} auth templates + ${manifest.security_notifications.length} security notifications…`);
await patchAuth(payload, 'All auth email templates updated');

console.log('\nApplied:');
for (const t of manifest.auth_templates) {
  console.log(`  • ${t.id}: ${read(t.subject_file)}`);
}
for (const n of manifest.security_notifications) {
  console.log(`  • ${n.id} (notification): ${read(n.subject_file)}`);
}
