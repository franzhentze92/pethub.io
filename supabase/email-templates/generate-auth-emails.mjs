/**
 * Generates Supabase Auth email HTML files from shared PetHub layout.
 * Run: node supabase/email-templates/generate-auth-emails.mjs
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildEmail,
  p,
  chip,
  alert,
  fallbackLink,
  otpBox,
  C,
} from './_layout.mjs';

const dir = dirname(fileURLToPath(import.meta.url));

const write = (name, html) => {
  writeFileSync(join(dir, name), `${html}\n`, 'utf8');
  console.log('  ✓', name);
};

console.log('Generating auth email templates…');

// ─── Magic link (acceso sin contraseña — futuro / admin) ───
write(
  'magic-link.html',
  buildEmail({
    pageTitle: 'Inicia sesión — PetHub',
    preheader: 'Tu enlace seguro para entrar a PetHub.',
    headerBg: C.mint,
    headerSubtitle: 'Acceso rápido a tu cuenta',
    title: 'Inicia sesión en PetHub',
    bodyHtml: `
      ${p('{{ if .Data.full_name }}Hola <strong style="color:#0f172a;">{{ .Data.full_name }}</strong>,{{ else }}Hola,{{ end }}')}
      ${p('Haz clic en el botón para iniciar sesión en <strong style="color:#0f172a;">PetHub</strong>. Este enlace es de un solo uso y caduca pronto por seguridad.')}
      ${chip('Correo', '{{ .Email }}')}
      ${fallbackLink()}
      ${alert('info', '<strong>Tip:</strong> también puedes usar este código de un solo uso: <strong>{{ .Token }}</strong>')}
    `,
    cta: { label: 'Iniciar sesión', href: '{{ .ConfirmationURL }}', bg: C.mint, textColor: C.text },
    footerNote: 'Si no solicitaste este acceso, ignora este correo.',
  }),
);

// ─── Invite (admin invita proveedor/refugio) ───
write(
  'invite.html',
  buildEmail({
    pageTitle: 'Invitación — PetHub',
    preheader: 'Te invitaron a unirte a PetHub.',
    headerBg: C.mango,
    headerSubtitle: 'Invitación a la plataforma',
    title: 'Te invitaron a PetHub',
    bodyHtml: `
      ${p('Has sido invitado a crear tu cuenta en <strong style="color:#0f172a;">PetHub</strong>, el ecosistema pet de Guatemala.')}
      ${p('Acepta la invitación para configurar tu perfil y empezar a usar el dashboard de cliente, proveedor o refugio.')}
      ${chip('Correo invitado', '{{ .Email }}')}
      ${fallbackLink()}
    `,
    cta: { label: 'Aceptar invitación', href: '{{ .ConfirmationURL }}', bg: C.mango, textColor: C.text },
    footerNote: 'Si no esperabas esta invitación, puedes ignorar este correo.',
  }),
);

// ─── Email change confirmation ───
write(
  'email-change.html',
  buildEmail({
    pageTitle: 'Confirma tu nuevo correo — PetHub',
    preheader: 'Confirma el cambio de correo en tu cuenta PetHub.',
    headerBg: C.aqua,
    headerSubtitle: 'Cambio de correo electrónico',
    title: 'Confirma tu nuevo correo',
    bodyHtml: `
      ${p('Recibimos una solicitud para cambiar el correo de tu cuenta PetHub.')}
      ${chip('Nuevo correo', '{{ .NewEmail }}')}
      ${p('Confirma que este correo te pertenece para completar el cambio.')}
      ${fallbackLink()}
      ${alert('warning', '<strong>¿No fuiste tú?</strong> Ignora este correo y tu correo actual seguirá activo.')}
    `,
    cta: { label: 'Confirmar nuevo correo', href: '{{ .ConfirmationURL }}' },
  }),
);

// ─── Reauthentication OTP ───
write(
  'reauthentication.html',
  buildEmail({
    pageTitle: 'Código de verificación — PetHub',
    preheader: 'Tu código de verificación PetHub: {{ .Token }}',
    headerBg: C.mango,
    headerSubtitle: 'Verificación de seguridad',
    title: 'Confirma que eres tú',
    bodyHtml: `
      ${p('Para continuar con una acción sensible en <strong style="color:#0f172a;">PetHub</strong> (cambio de contraseña, datos de pago, etc.), ingresa este código:')}
      ${otpBox()}
      ${alert('warning', '<strong>Importante:</strong> nunca compartas este código. El equipo de PetHub nunca te lo pedirá por correo o chat.')}
    `,
    footerNote: 'Si no iniciaste esta acción, cambia tu contraseña de inmediato.',
  }),
);

// ─── Security notifications (info only, no CTA) ───

write(
  'password-changed-notification.html',
  buildEmail({
    pageTitle: 'Contraseña actualizada — PetHub',
    preheader: 'La contraseña de tu cuenta PetHub fue cambiada.',
    headerBg: C.aqua,
    headerSubtitle: 'Notificación de seguridad',
    title: 'Tu contraseña fue actualizada',
    bodyHtml: `
      ${p('La contraseña de la cuenta <strong style="color:#00C4A3;">{{ .Email }}</strong> fue cambiada recientemente.')}
      ${alert('info', 'Si fuiste tú, no necesitas hacer nada. Ya puedes iniciar sesión con tu nueva contraseña.')}
      ${alert('warning', '<strong>¿No reconoces este cambio?</strong> Restablece tu contraseña de inmediato y contáctanos en <a href="mailto:contacto@pethub.gt" style="color:#00C4A3;">contacto@pethub.gt</a>.')}
    `,
    cta: {
      label: 'Restablecer contraseña',
      href: '{{ .SiteURL }}/forgot-password',
      bg: C.aqua,
    },
  }),
);

write(
  'email-changed-notification.html',
  buildEmail({
    pageTitle: 'Correo actualizado — PetHub',
    preheader: 'El correo de tu cuenta PetHub fue cambiado.',
    headerBg: C.mint,
    headerSubtitle: 'Notificación de seguridad',
    title: 'Tu correo electrónico fue actualizado',
    bodyHtml: `
      ${p('El correo de tu cuenta PetHub cambió de <strong style="color:#0f172a;">{{ .OldEmail }}</strong> a <strong style="color:#00C4A3;">{{ .Email }}</strong>.')}
      ${alert('info', 'Si fuiste tú, no necesitas hacer nada.')}
      ${alert('warning', '<strong>¿No fuiste tú?</strong> Contacta a soporte de inmediato en <a href="mailto:contacto@pethub.gt" style="color:#00C4A3;">contacto@pethub.gt</a>.')}
    `,
  }),
);

write(
  'phone-changed-notification.html',
  buildEmail({
    pageTitle: 'Teléfono actualizado — PetHub',
    preheader: 'El teléfono de tu cuenta PetHub fue cambiado.',
    headerBg: C.mango,
    headerSubtitle: 'Notificación de seguridad',
    title: 'Tu número de teléfono fue actualizado',
    bodyHtml: `
      ${p('El teléfono asociado a <strong style="color:#00C4A3;">{{ .Email }}</strong> cambió de <strong>{{ .OldPhone }}</strong> a <strong>{{ .Phone }}</strong>.')}
      ${alert('warning', '<strong>¿No fuiste tú?</strong> Revisa la seguridad de tu cuenta y escríbenos a <a href="mailto:contacto@pethub.gt" style="color:#00C4A3;">contacto@pethub.gt</a>.')}
    `,
  }),
);

write(
  'identity-linked-notification.html',
  buildEmail({
    pageTitle: 'Método de acceso vinculado — PetHub',
    preheader: 'Se vinculó un nuevo método de inicio de sesión a tu cuenta.',
    headerBg: C.aqua,
    headerSubtitle: 'Notificación de seguridad',
    title: 'Nuevo método de inicio de sesión',
    bodyHtml: `
      ${p('Se vinculó <strong style="color:#0f172a;">{{ .Provider }}</strong> como método de acceso para <strong style="color:#00C4A3;">{{ .Email }}</strong>.')}
      ${alert('info', 'Ahora puedes iniciar sesión con este método además de tu correo y contraseña.')}
      ${alert('warning', '<strong>¿No fuiste tú?</strong> Desvincula el método desde Ajustes o contacta a soporte.')}
    `,
  }),
);

write(
  'identity-unlinked-notification.html',
  buildEmail({
    pageTitle: 'Método de acceso eliminado — PetHub',
    preheader: 'Se eliminó un método de inicio de sesión de tu cuenta.',
    headerBg: C.mango,
    headerSubtitle: 'Notificación de seguridad',
    title: 'Método de inicio de sesión eliminado',
    bodyHtml: `
      ${p('Se eliminó <strong style="color:#0f172a;">{{ .Provider }}</strong> como método de acceso de <strong style="color:#00C4A3;">{{ .Email }}</strong>.')}
      ${alert('warning', '<strong>¿No fuiste tú?</strong> Restablece tu contraseña y contáctanos de inmediato.')}
    `,
  }),
);

write(
  'mfa-factor-enrolled-notification.html',
  buildEmail({
    pageTitle: 'Verificación añadida — PetHub',
    preheader: 'Se añadió un método de verificación a tu cuenta PetHub.',
    headerBg: C.mint,
    headerSubtitle: 'Notificación de seguridad',
    title: 'Nuevo método de verificación',
    bodyHtml: `
      ${p('Se añadió el método <strong style="color:#0f172a;">{{ .FactorType }}</strong> a la cuenta <strong style="color:#00C4A3;">{{ .Email }}</strong>.')}
      ${alert('info', 'Tu cuenta ahora tiene una capa extra de seguridad.')}
      ${alert('warning', '<strong>¿No fuiste tú?</strong> Contacta a soporte de inmediato.')}
    `,
  }),
);

write(
  'mfa-factor-unenrolled-notification.html',
  buildEmail({
    pageTitle: 'Verificación eliminada — PetHub',
    preheader: 'Se eliminó un método de verificación de tu cuenta PetHub.',
    headerBg: C.mango,
    headerSubtitle: 'Notificación de seguridad',
    title: 'Método de verificación eliminado',
    bodyHtml: `
      ${p('Se eliminó el método <strong style="color:#0f172a;">{{ .FactorType }}</strong> de la cuenta <strong style="color:#00C4A3;">{{ .Email }}</strong>.')}
      ${alert('warning', '<strong>¿No fuiste tú?</strong> Activa de nuevo la verificación en dos pasos y contáctanos.')}
    `,
  }),
);

console.log('\nDone. confirm-signup.html and recovery.html are maintained manually.');
