type InvitationRole = "admin" | "supervisor" | "operador" | "applicator";

interface InvitationEmailParams {
    orgName: string;
    role: InvitationRole;
    joinUrl: string;
}

const ROLE_LABELS: Record<InvitationRole, string> = {
    admin: "Administrador",
    supervisor: "Supervisor",
    operador: "Operador (Oficina)",
    applicator: "Aplicador",
};

function escapeHtml(value: string): string {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

export function getInvitationEmailHtml({
    orgName,
    role,
    joinUrl,
}: InvitationEmailParams): string {
    const safeOrgName = escapeHtml(orgName);
    const safeRoleLabel = escapeHtml(ROLE_LABELS[role]);
    const safeJoinUrl = escapeHtml(joinUrl);

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invitacion - LEC Platform</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="background:#002e5d;padding:32px 32px 24px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">
                LEC Platform
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 8px;color:#0f172a;font-size:20px;font-weight:600;">
                Te han invitado
              </h2>
              <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
                Has recibido una invitacion para unirte a
                <strong style="color:#0f172a;">${safeOrgName}</strong>
                con el rol de
                <strong style="color:#002e5d;">${safeRoleLabel}</strong>.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 24px;">
                    <a href="${safeJoinUrl}"
                       style="display:inline-block;background:#002e5d;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 36px;border-radius:8px;">
                      Aceptar invitacion
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;color:#64748b;font-size:13px;line-height:1.5;">
                Si el boton no funciona, copia y pega este enlace en tu navegador:
              </p>
              <p style="margin:0 0 24px;word-break:break-all;">
                <a href="${safeJoinUrl}" style="color:#002e5d;font-size:13px;">${safeJoinUrl}</a>
              </p>
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
              <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.5;">
                Si no esperabas esta invitacion, puedes ignorar este mensaje.
                <br />
                Este enlace permanecera activo mientras la invitacion siga pendiente.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f8fafc;padding:20px 32px;text-align:center;">
              <p style="margin:0;color:#94a3b8;font-size:11px;">
                Language Evaluation Center - LEC Platform
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

// ── Certificate email ─────────────────────────────────────────────────────────

interface CertificateEmailParams {
    studentName: string;
    folio: string;
    orgName: string;
    downloadUrl: string;
}

export function getCertificateEmailHtml({
    studentName,
    folio,
    orgName,
    downloadUrl,
}: CertificateEmailParams): string {
    const safe = escapeHtml;
    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Tu certificado CENNI esta listo</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="background:#002e5d;padding:32px 32px 24px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">
                LEC Platform
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 8px;color:#0f172a;font-size:20px;font-weight:600;">
                Tu certificado CENNI esta listo
              </h2>
              <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
                Hola <strong style="color:#0f172a;">${safe(studentName)}</strong>, tu certificado CENNI
                con folio <strong style="color:#002e5d;font-family:monospace;">${safe(folio)}</strong>
                ha sido procesado y ya esta disponible para descarga.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 24px;">
                    <a href="${safe(downloadUrl)}"
                       style="display:inline-block;background:#002e5d;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 36px;border-radius:8px;">
                      Descargar certificado
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;color:#64748b;font-size:13px;line-height:1.5;">
                Si el boton no funciona, copia y pega este enlace en tu navegador:
              </p>
              <p style="margin:0 0 24px;word-break:break-all;">
                <a href="${safe(downloadUrl)}" style="color:#002e5d;font-size:13px;">${safe(downloadUrl)}</a>
              </p>
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
              <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.5;">
                El enlace de descarga es valido por 7 dias.
                Si tienes dudas, contacta a tu centro de evaluacion.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f8fafc;padding:20px 32px;text-align:center;">
              <p style="margin:0;color:#94a3b8;font-size:11px;">
                ${safe(orgName)} &mdash; Language Evaluation Center (LEC)
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

export function getCertificateEmailText({
    studentName,
    folio,
    orgName,
    downloadUrl,
}: CertificateEmailParams): string {
    return [
        "LEC Platform",
        "",
        `Hola ${studentName},`,
        `Tu certificado CENNI con folio ${folio} ha sido procesado y ya esta disponible.`,
        "",
        "Descarga tu certificado aqui (valido por 7 dias):",
        downloadUrl,
        "",
        `${orgName} - Language Evaluation Center (LEC)`,
    ].join("\n");
}

// ── Invitation email ──────────────────────────────────────────────────────────

export function getInvitationEmailText({
    orgName,
    role,
    joinUrl,
}: InvitationEmailParams): string {
    return [
        "LEC Platform",
        "",
        `Has recibido una invitacion para unirte a ${orgName} con el rol de ${ROLE_LABELS[role]}.`,
        "",
        "Acepta tu invitacion aqui:",
        joinUrl,
        "",
        "Si no esperabas esta invitacion, puedes ignorar este mensaje.",
    ].join("\n");
}
