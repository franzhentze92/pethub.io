# Plantillas de correo — PetHub

Inventario completo en `email-manifest.json`.

## Correos Supabase Auth (13 plantillas)

| Plantilla | Archivo | Flujo en la app |
|-----------|---------|-----------------|
| **Confirmación registro** | `confirm-signup.html` | `/register` → revisar email antes de login |
| **Recuperar contraseña** | `recovery.html` | `/forgot-password` |
| **Magic link** | `magic-link.html` | Reservado (login sin contraseña) |
| **Invitación** | `invite.html` | Admin invita proveedor/refugio |
| **Cambio de correo** | `email-change.html` | Ajustes → cambiar email |
| **Reautenticación (OTP)** | `reauthentication.html` | Acciones sensibles |
| **Contraseña cambiada** | `password-changed-notification.html` | Tras `/reset-password` |
| **Correo cambiado** | `email-changed-notification.html` | Aviso post-cambio |
| **Teléfono cambiado** | `phone-changed-notification.html` | Perfil / SMS futuro |
| **OAuth vinculado** | `identity-linked-notification.html` | Google/Apple futuro |
| **OAuth desvinculado** | `identity-unlinked-notification.html` | Ajustes seguridad |
| **2FA activado** | `mfa-factor-enrolled-notification.html` | MFA futuro |
| **2FA desactivado** | `mfa-factor-unenrolled-notification.html` | MFA futuro |

## Correo transaccional (edge function, no Auth)

| Correo | Función | Flujo |
|--------|---------|-------|
| **Confirmación de compra** | `send-order-confirmation` | Checkout en Tienda |
| **Actualización de orden** | `send-order-status-email` | Proveedor / reparto / admin cambia estado → email al cliente |

Estados que envían correo: `processing`, `shipped`, `in_transit`, `delivered`, `completed`, `cancelled`.

Desplegar: `npx supabase functions deploy send-order-status-email --project-ref uzcuhdkjfqqzqlxgwyjt`

## Solo in-app / push (sin email hoy)

- Nutrición y recordatorios de comida → **push** (`send-feeding-reminders`)
- Estado de órdenes, adopción, parejas, chat → **campana in-app**
- Renovación de suscripciones → cron sin email aún

---

## Generar plantillas

Tras editar `_layout.mjs` o `generate-auth-emails.mjs`:

```bash
node supabase/email-templates/generate-auth-emails.mjs
```

`confirm-signup.html` y `recovery.html` se mantienen a mano (más detalle).

## Aplicar en producción

**Free tier:** requiere SMTP custom (Resend). Ver instrucciones en sección anterior del README.

```bash
set SUPABASE_ACCESS_TOKEN=tu-token
set RESEND_API_KEY=tu-resend-key
node scripts/apply-auth-email-templates.mjs --with-smtp
```

## Manual (dashboard)

**Authentication → Email Templates**  
https://supabase.com/dashboard/project/uzcuhdkjfqqzqlxgwyjt/auth/templates

## Remitente

- **Sender name:** `PetHub`
- **Sender email:** `noreply@pethubgt.com` (dominio verificado en Resend)
