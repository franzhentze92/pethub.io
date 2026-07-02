# Plantillas de correo — Supabase Auth

Los correos de **confirmación de registro** y **recuperación de contraseña** los envía Supabase Auth.

## Aplicar automáticamente (recomendado)

Con la CLI de Supabase autenticada con la cuenta que **sí tiene acceso al proyecto PetHub** (`uzcuhdkjfqqzqlxgwyjt`):

```bash
npx supabase config push --project-ref uzcuhdkjfqqzqlxgwyjt
```

Las plantillas están declaradas en `supabase/config.toml` y apuntan a los HTML de esta carpeta.

Alternativa con Management API (token en https://supabase.com/dashboard/account/tokens):

```bash
set SUPABASE_ACCESS_TOKEN=tu-token
node scripts/apply-auth-email-templates.mjs
```

## Aplicar manualmente en el Dashboard

**No es en Settings → API Keys.** Ve a:

**Authentication → Email Templates**  
https://supabase.com/dashboard/project/uzcuhdkjfqqzqlxgwyjt/auth/templates

### Confirm signup

| Campo | Archivo |
|-------|---------|
| Subject | `confirm-signup-subject.txt` |
| Body | `confirm-signup.html` |

### Reset password

| Campo | Archivo |
|-------|---------|
| Subject | `recovery-subject.txt` |
| Body | `recovery.html` |

También verifica en **Authentication → URL Configuration**:

- **Site URL**: `https://pethubgt.com`
- **Redirect URLs**: `https://pethubgt.com/login`, `http://localhost:5173/login`

## Remitente (opcional)

En **Project Settings → Authentication → SMTP Settings**:

- **Sender name**: `PetHub`
- **Sender email**: `noreply@pethubgt.com` (dominio verificado)

Sin SMTP custom, el remitente seguirá siendo `noreply@mail.app.supabase.io`, pero el cuerpo del correo ya será PetHub.
