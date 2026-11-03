import type { Registration, SiteSettings } from "../data/types";
import { formatBirthDate } from "../format";

export interface SlotDescription {
  activityName: string;
  locationName: string;
  venue: string;
  address: string;
  day: string;
  time: string;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function layout(title: string, bodyHtml: string, settings: SiteSettings) {
  return `<!doctype html><html lang="hr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(title)}</title></head>
<body style="margin:0;background:#FFF5F8;font-family:Arial,Helvetica,sans-serif;color:#13385A">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFF5F8;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden">
<tr><td style="background:#91D2CE;padding:20px 28px;font-size:22px;font-weight:bold;color:#13385A">Sportaonica</td></tr>
<tr><td style="padding:28px;font-size:16px;line-height:1.6">${bodyHtml}</td></tr>
<tr><td style="padding:18px 28px;background:#FFFBEA;font-size:13px;color:#4A5B70">
Sportaonica · ${esc(settings.phone)} · <a href="mailto:${esc(settings.email)}" style="color:#0F4F7D">${esc(settings.email)}</a><br>
Sport koji gradi zdrave navike za cijeli život!</td></tr>
</table></td></tr></table></body></html>`;
}

function slotTable(slot: SlotDescription, reg: Registration) {
  const rows: [string, string][] = [
    ["Aktivnost", slot.activityName],
    ["Lokacija", `${slot.locationName} — ${slot.venue}`],
    ["Termin", `${slot.day}, ${slot.time}`],
    ["Dijete", `${reg.childName} (rođ. ${formatBirthDate(reg.childBirthDate)})`],
  ];
  const html = `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:16px 0;background:#F1FAF9;border-radius:14px">${rows
    .map(([k, v]) => `<tr><td style="padding:8px 14px;color:#4A5B70;width:110px">${k}</td><td style="padding:8px 14px;font-weight:bold">${esc(v)}</td></tr>`)
    .join("")}</table>`;
  const text = rows.map(([k, v]) => `${k}: ${v}`).join("\n");
  return { html, text };
}

const button = (href: string, label: string) =>
  `<p style="margin:24px 0"><a href="${esc(href)}" style="display:inline-block;background:#C2453D;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:999px">${esc(label)}</a></p>`;

export function confirmationEmail(reg: Registration, slot: SlotDescription, cancelUrl: string, settings: SiteSettings) {
  const t = slotTable(slot, reg);
  const waitlist = reg.status === "waitlist";
  const subject = waitlist
    ? `Lista čekanja: ${slot.activityName} (${slot.locationName})`
    : `Potvrda prijave: ${slot.activityName} (${slot.locationName})`;
  const intro = waitlist
    ? `Termin je trenutno popunjen pa smo <strong>${esc(reg.childName)}</strong> upisali na listu čekanja. Čim se mjesto oslobodi, automatski ćemo vas prebaciti u grupu i javiti vam e-mailom.`
    : `Hvala vam na prijavi! <strong>${esc(reg.childName)}</strong> ima rezervirano mjesto u terminu:`;
  const html = layout(
    subject,
    `<p>Poštovani/a ${esc(reg.parentName)},</p><p>${intro}</p>${t.html}
<p>Na trening ponesite udobnu sportsku odjeću, tenisice za dvoranu i bočicu vode. Informacije o članarini javit ćemo vam izravno.</p>
<p>Ako ne možete doći, molimo otkažite prijavu kako bi mjesto dobilo drugo dijete:</p>${button(cancelUrl, "Otkaži prijavu")}
<p>Vidimo se na treningu!<br>Vaša Sportaonica</p>`,
    settings,
  );
  const text = `Poštovani/a ${reg.parentName},\n\n${
    waitlist
      ? `termin je popunjen pa je ${reg.childName} na listi čekanja. Javit ćemo vam se čim se mjesto oslobodi.`
      : `hvala na prijavi! ${reg.childName} ima rezervirano mjesto.`
  }\n\n${t.text}\n\nOtkazivanje prijave: ${cancelUrl}\n\nVaša Sportaonica\n${settings.phone} · ${settings.email}`;
  return { subject, html, text };
}

export function promotedEmail(reg: Registration, slot: SlotDescription, cancelUrl: string, settings: SiteSettings) {
  const t = slotTable(slot, reg);
  const subject = `Oslobodilo se mjesto! ${slot.activityName} (${slot.locationName})`;
  const html = layout(
    subject,
    `<p>Poštovani/a ${esc(reg.parentName)},</p><p>imamo lijepe vijesti — u terminu se oslobodilo mjesto i <strong>${esc(reg.childName)}</strong> je sada upisan/a u grupu.</p>${t.html}
<p>Ako vam termin više ne odgovara, otkažite prijavu kako bi mjesto dobilo sljedeće dijete:</p>${button(cancelUrl, "Otkaži prijavu")}
<p>Vidimo se na treningu!<br>Vaša Sportaonica</p>`,
    settings,
  );
  const text = `Poštovani/a ${reg.parentName},\n\noslobodilo se mjesto i ${reg.childName} je sada upisan/a u grupu.\n\n${t.text}\n\nOtkazivanje: ${cancelUrl}\n\nVaša Sportaonica`;
  return { subject, html, text };
}

export function cancellationEmail(reg: Registration, slot: SlotDescription, settings: SiteSettings) {
  const t = slotTable(slot, reg);
  const subject = `Prijava otkazana: ${slot.activityName}`;
  const html = layout(
    subject,
    `<p>Poštovani/a ${esc(reg.parentName)},</p><p>potvrđujemo da je prijava otkazana.</p>${t.html}<p>Ako se predomislite, uvijek se možete ponovno prijaviti na našoj web stranici. Hvala što ste oslobodili mjesto!</p><p>Vaša Sportaonica</p>`,
    settings,
  );
  const text = `Poštovani/a ${reg.parentName},\n\nprijava je otkazana.\n\n${t.text}\n\nVaša Sportaonica`;
  return { subject, html, text };
}

export function ownerRegistrationEmail(reg: Registration, slot: SlotDescription, adminUrl: string, settings: SiteSettings) {
  const t = slotTable(slot, reg);
  const label = reg.status === "waitlist" ? "Nova prijava na listu čekanja" : "Nova prijava";
  const subject = `${label}: ${reg.childName} — ${slot.activityName}, ${slot.locationName}`;
  const details = `Roditelj: ${reg.parentName}\nTelefon: ${reg.phone}\nE-mail: ${reg.email}\nNapomena o zdravlju: ${reg.healthNote || "—"}\nKako su čuli za nas: ${reg.source || "—"}\nMarketing privola: ${reg.marketingConsent ? "da" : "ne"}`;
  const html = layout(
    subject,
    `<p><strong>${label}</strong></p>${t.html}<pre style="font-family:inherit;white-space:pre-wrap;background:#FFFBEA;padding:12px 14px;border-radius:12px">${esc(details)}</pre>${button(adminUrl, "Otvori u adminu")}`,
    settings,
  );
  return { subject, html, text: `${label}\n\n${t.text}\n${details}\n\n${adminUrl}` };
}

export function ownerContactEmail(m: { name: string; email: string; phone?: string; message: string }, settings: SiteSettings) {
  const subject = `Nova poruka s weba: ${m.name}`;
  const text = `Ime: ${m.name}\nE-mail: ${m.email}\nTelefon: ${m.phone || "—"}\n\n${m.message}`;
  const html = layout(subject, `<pre style="font-family:inherit;white-space:pre-wrap">${esc(text)}</pre>`, settings);
  return { subject, html, text };
}
