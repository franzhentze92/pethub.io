/**
 * Applies PetHub auth email templates via Supabase Management API.
 * Requires SUPABASE_ACCESS_TOKEN (https://supabase.com/dashboard/account/tokens)
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const projectRef = 'uzcuhdkjfqqzqlxgwyjt';
const token = process.env.SUPABASE_ACCESS_TOKEN;

if (!token) {
  console.error('Missing SUPABASE_ACCESS_TOKEN. Create one at https://supabase.com/dashboard/account/tokens');
  process.exit(1);
}

const read = (rel) => readFileSync(join(root, rel), 'utf8').trim();

const payload = {
  mailer_subjects_confirmation: read('supabase/email-templates/confirm-signup-subject.txt'),
  mailer_templates_confirmation_content: read('supabase/email-templates/confirm-signup.html'),
  mailer_subjects_recovery: read('supabase/email-templates/recovery-subject.txt'),
  mailer_templates_recovery_content: read('supabase/email-templates/recovery.html'),
};

const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
  method: 'PATCH',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(payload),
});

const text = await res.text();
if (!res.ok) {
  console.error(`Failed (${res.status}):`, text);
  process.exit(1);
}

console.log('Auth email templates updated successfully.');
console.log('- Confirm signup subject:', payload.mailer_subjects_confirmation);
console.log('- Recovery subject:', payload.mailer_subjects_recovery);
