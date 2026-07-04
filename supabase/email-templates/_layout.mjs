/** Shared PetHub auth email layout — solid brand colors only. */

const C = {
  aqua: '#00F0C8',
  aquaDark: '#00C4A3',
  aquaLight: '#E6FDF9',
  mint: '#38F9A0',
  mintDark: '#2DD98A',
  mango: '#FFB703',
  mangoDark: '#E6A503',
  mangoLight: '#FFF8E6',
  tropical: '#FDE74C',
  text: '#0f172a',
  textMuted: '#475569',
  textLight: '#64748b',
  border: '#e2e8f0',
  bg: '#f8fafc',
  white: '#ffffff',
};

const styles = `
  body { margin:0; padding:0; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  img { border:0; outline:none; text-decoration:none; display:block; }
  table { border-collapse:collapse; mso-table-lspace:0; mso-table-rspace:0; }
  @media only screen and (max-width: 600px) {
    .email-wrapper { padding:12px 8px !important; }
    .email-body { padding:22px 16px !important; }
    .email-header { padding:28px 20px !important; }
    .cta-cell a { display:block !important; text-align:center !important; padding:16px 24px !important; }
    .otp-code { font-size:28px !important; letter-spacing:0.25em !important; }
  }
`;

export function buildEmail({
  pageTitle,
  preheader,
  headerBg = C.aqua,
  headerSubtitle,
  title,
  bodyHtml,
  cta,
  footerNote,
}) {
  const ctaBlock = cta
    ? `<table role="presentation" cellspacing="0" cellpadding="0" align="center" width="100%" style="margin:0 0 26px;">
        <tr>
          <td align="center" class="cta-cell" style="border-radius:14px;background:${cta.bg || C.aqua};">
            <a href="${cta.href}" style="display:inline-block;padding:16px 36px;font-size:16px;font-weight:700;color:${cta.textColor || C.white};text-decoration:none;border-radius:14px;letter-spacing:0.01em;">
              ${cta.label}
            </a>
          </td>
        </tr>
      </table>`
    : '';

  const footerNoteBlock = footerNote
    ? `<p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:#94a3b8;">${footerNote}</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${pageTitle}</title>
  <style type="text/css">${styles}</style>
</head>
<body style="margin:0;padding:0;background:${C.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${C.text};">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${C.bg};">
    ${preheader}
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" class="email-wrapper" style="background:${C.bg};padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:${C.white};border-radius:20px;overflow:hidden;border:1px solid rgba(0,240,200,0.22);box-shadow:0 4px 24px rgba(0,240,200,0.12);">
          <tr>
            <td class="email-header" bgcolor="${headerBg}" style="padding:36px 28px;background:${headerBg};text-align:center;">
              <table role="presentation" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto 14px;">
                <tr>
                  <td width="52" height="52" align="center" valign="middle" style="background:rgba(255,255,255,0.28);border-radius:50%;">
                    <img src="https://pethubgt.com/icons/icon-192.png" width="32" height="32" alt="PetHub" style="border-radius:8px;" />
                  </td>
                </tr>
              </table>
              <div style="font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">PetHub</div>
              <div style="font-size:15px;color:rgba(255,255,255,0.95);margin-top:6px;font-weight:500;">${headerSubtitle}</div>
            </td>
          </tr>
          <tr>
            <td class="email-body" style="padding:28px 24px;">
              <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:${C.text};font-weight:800;">${title}</h1>
              ${bodyHtml}
              ${ctaBlock}
              ${footerNoteBlock}
            </td>
          </tr>
          <tr>
            <td style="padding:18px 24px;background:${C.bg};text-align:center;border-top:1px solid ${C.border};">
              <p style="margin:0 0 6px;font-size:12px;color:${C.textLight};font-weight:600;">© PetHub — Cuidado integral para tu mascota</p>
              <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.6;">
                <a href="https://pethubgt.com" style="color:${C.aquaDark};text-decoration:none;font-weight:600;">pethubgt.com</a>
                &nbsp;·&nbsp;
                <a href="mailto:contacto@pethub.gt" style="color:${C.aquaDark};text-decoration:none;">contacto@pethub.gt</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function p(text) {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${C.textMuted};">${text}</p>`;
}

export function chip(label, value) {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${C.aquaLight};border:1px solid rgba(0,240,200,0.28);border-radius:14px;margin-bottom:20px;">
    <tr><td style="padding:14px 18px;">
      <div style="font-size:11px;font-weight:700;color:${C.textLight};text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">${label}</div>
      <div style="font-size:15px;font-weight:700;color:${C.aquaDark};word-break:break-all;">${value}</div>
    </td></tr>
  </table>`;
}

export function alert(type, html) {
  const styles =
    type === 'warning'
      ? `background:${C.mangoLight};border:1px solid rgba(255,183,3,0.35);`
      : `background:${C.aquaLight};border:1px solid rgba(0,240,200,0.28);`;
  const strongColor = type === 'warning' ? C.mangoDark : C.aquaDark;
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="${styles}border-radius:12px;margin-bottom:16px;">
    <tr><td style="padding:14px 16px;">
      <p style="margin:0;font-size:13px;line-height:1.6;color:${C.textMuted};">${html.replace('<strong>', `<strong style="color:${strongColor};">`)}</p>
    </td></tr>
  </table>`;
}

export function fallbackLink(urlVar = '{{ .ConfirmationURL }}') {
  return `${p('Si el botón no funciona, copia y pega este enlace en tu navegador:')}
    <p style="margin:0 0 20px;font-size:12px;line-height:1.6;word-break:break-all;">
      <a href="${urlVar}" style="color:${C.aquaDark};text-decoration:underline;">${urlVar}</a>
    </p>`;
}

export function otpBox(tokenVar = '{{ .Token }}') {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px;">
    <tr><td align="center" style="padding:20px;background:${C.bg};border:2px solid ${C.border};border-radius:16px;">
      <div style="font-size:11px;font-weight:700;color:${C.textLight};text-transform:uppercase;letter-spacing:0.1em;margin-bottom:10px;">Tu código de verificación</div>
      <div class="otp-code" style="font-size:36px;font-weight:800;color:${C.text};letter-spacing:0.35em;font-family:'SF Mono',Monaco,Consolas,monospace;">${tokenVar}</div>
      <div style="font-size:12px;color:${C.textLight};margin-top:10px;">Expira en pocos minutos</div>
    </td></tr>
  </table>`;
}

export { C };
