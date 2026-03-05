interface TenantBranding {
  name: string; primaryColor: string;
  logoUrl?: string | null; emailSignature?: string | null;
}

function layout(t: TenantBranding, content: string): string {
  const c = t.primaryColor || '#4f46e5';
  return `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8">
<style>
  body{margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,sans-serif}
  .w{max-width:600px;margin:32px auto;background:#fff;border-radius:12px;
     overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)}
  .h{background:${c};padding:28px 32px}.h h1{margin:0;color:#fff;font-size:20px;font-weight:700}
  .b{padding:32px;color:#374151;font-size:15px;line-height:1.6}
  .btn{display:inline-block;margin:24px 0;padding:14px 28px;background:${c};
       color:#fff!important;text-decoration:none;border-radius:8px;font-weight:600}
  .f{padding:20px 32px;background:#f9fafb;font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb}
</style></head><body><div class="w">
  <div class="h">${t.logoUrl ? `<img src="${t.logoUrl}" height="36" style="margin-bottom:8px;display:block">` : ''}
    <h1>${t.name}</h1></div>
  <div class="b">${content}</div>
  <div class="f">${t.emailSignature || `© ${new Date().getFullYear()} ${t.name} · DocCollector+`}</div>
</div></body></html>`;
}

export const templates = {
  requestCreated(t: TenantBranding, o: {
    clientName: string; docTypeLabel: string; period: string;
    deadline?: string | null; portalUrl: string; notes?: string | null;
  }) {
    return {
      subject: `📄 Documento richiesto: ${o.docTypeLabel} (${o.period})`,
      bodyHtml: layout(t, `
        <p>Gentile <strong>${o.clientName}</strong>,</p>
        <p>lo studio richiede il seguente documento:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;color:#6b7280;width:40%">Documento</td>
              <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;font-weight:600">${o.docTypeLabel}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280">Periodo</td>
              <td style="padding:8px 0;font-weight:600">${o.period}</td></tr>
          ${o.deadline ? `<tr><td style="padding:8px 0;color:#6b7280">Scadenza</td>
              <td style="padding:8px 0;font-weight:600;color:#dc2626">${new Date(o.deadline).toLocaleDateString('it-IT')}</td></tr>` : ''}
        </table>
        ${o.notes ? `<p><em>${o.notes}</em></p>` : ''}
        <a href="${o.portalUrl}" class="btn">Carica il Documento →</a>`),
    };
  },

  magicLink(t: TenantBranding, o: { clientName: string; magicUrl: string }) {
    return {
      subject: `🔑 Accesso al portale ${t.name}`,
      bodyHtml: layout(t, `
        <p>Gentile <strong>${o.clientName}</strong>,</p>
        <p>Clicchi il link per accedere al portale. Valido <strong>72 ore</strong>, uso singolo.</p>
        <a href="${o.magicUrl}" class="btn">Accedi al Portale →</a>
        <p style="font-size:13px;color:#9ca3af">Se non ha richiesto l'accesso, ignori questa email.</p>`),
    };
  },

  documentApproved(t: TenantBranding, o: { clientName: string; docTypeLabel: string; portalUrl: string }) {
    return {
      subject: `✅ Documento approvato: ${o.docTypeLabel}`,
      bodyHtml: layout(t, `
        <p>Gentile <strong>${o.clientName}</strong>,</p>
        <p>Il documento <strong>${o.docTypeLabel}</strong> è stato
           <span style="color:#16a34a;font-weight:700">approvato</span>.</p>
        <a href="${o.portalUrl}" class="btn">Vai al Portale →</a>`),
    };
  },

  documentRejected(t: TenantBranding, o: {
    clientName: string; docTypeLabel: string; reason: string; portalUrl: string;
  }) {
    return {
      subject: `❌ Documento da ricaricare: ${o.docTypeLabel}`,
      bodyHtml: layout(t, `
        <p>Gentile <strong>${o.clientName}</strong>,</p>
        <p>Il documento <strong>${o.docTypeLabel}</strong> è stato rifiutato.</p>
        <div style="background:#fef2f2;border-left:4px solid #ef4444;padding:12px 16px;border-radius:4px;margin:16px 0">
          <strong>Motivazione:</strong><br>${o.reason}</div>
        <a href="${o.portalUrl}" class="btn">Carica il Documento Corretto →</a>`),
    };
  },

  deadlineReminder(t: TenantBranding, o: {
    clientName: string; docTypeLabel: string; deadline: string;
    daysLeft: number; portalUrl: string;
  }) {
    const icon = o.daysLeft <= 1 ? '🚨' : o.daysLeft <= 3 ? '⚠️' : '📅';
    return {
      subject: `${icon} Scadenza tra ${o.daysLeft} giorn${o.daysLeft === 1 ? 'o' : 'i'}: ${o.docTypeLabel}`,
      bodyHtml: layout(t, `
        <p>Gentile <strong>${o.clientName}</strong>,</p>
        <p>Il documento <strong>${o.docTypeLabel}</strong> scade il
           <strong>${new Date(o.deadline).toLocaleDateString('it-IT')}</strong>
           (${o.daysLeft} giorn${o.daysLeft === 1 ? 'o' : 'i'}).</p>
        <a href="${o.portalUrl}" class="btn">Carica Subito →</a>`),
    };
  },
};