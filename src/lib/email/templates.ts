/**
 * Croatian e-mail templates (HTML + plain text). Every interpolated value is
 * escaped. Owner notifications deliberately carry minimal personal data —
 * details are in the admin panel (behind 2FA), not in an inbox.
 */
import type { Inquiry, SiteSettings } from "../data/types";

export interface SessionLine {
  activityName: string;
  locationName: string;
  address: string;
  /** "Ponedjeljak, 17:00–17:45" or "Subota 14. 11. 2026., 10:00–11:00" */
  when: string;
  status: "active" | "waitlist" | "cancelled_parent" | "cancelled_admin";
  waitlistPosition?: number | null;
}

export interface Mail {
  subject: string;
  html: string;
  text: string;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

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

const STATUS_LABEL: Record<SessionLine["status"], string> = {
  active: "Upisano",
  waitlist: "Lista čekanja",
  cancelled_parent: "Otkazano",
  cancelled_admin: "Otkazano",
};

function sessionsBlock(lines: SessionLine[]) {
  const label = (l: SessionLine) => STATUS_LABEL[l.status] + (l.status === "waitlist" && l.waitlistPosition ? ` (${l.waitlistPosition}. na listi)` : "");
  const html = `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:16px 0;background:#F1FAF9;border-radius:14px">${lines
    .map(
      (l) =>
        `<tr><td style="padding:10px 14px;border-bottom:1px solid #DDF1EF"><strong>${esc(l.activityName)}</strong><br>${esc(l.when)}<br><span style="color:#4A5B70">${esc(l.locationName)}, ${esc(l.address)}</span></td><td style="padding:10px 14px;border-bottom:1px solid #DDF1EF;font-weight:bold;white-space:nowrap">${esc(label(l))}</td></tr>`,
    )
    .join("")}</table>`;
  const text = lines.map((l) => `• ${l.activityName}, ${l.when}, ${l.locationName} (${l.address}): ${label(l)}`).join("\n");
  return { html, text };
}

const button = (href: string, label: string) =>
  `<p style="margin:24px 0"><a href="${esc(href)}" style="display:inline-block;background:#C2453D;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:999px">${esc(label)}</a></p>`;

const greeting = (name: string) => `Poštovani/a ${name},`;

export function confirmationEmail(
  p: { parentName: string; childName: string; lines: SessionLine[]; cancelUrl: string; deadlineHours: number },
  settings: SiteSettings,
): Mail {
  const t = sessionsBlock(p.lines);
  const allWait = p.lines.every((l) => l.status === "waitlist");
  const someWait = p.lines.some((l) => l.status === "waitlist");
  const first = p.lines[0];
  const subject = allWait ? `Lista čekanja: ${first.activityName}` : `Potvrda prijave: ${first.activityName}`;
  const intro = allWait
    ? `termin je trenutno popunjen pa je <strong>${esc(p.childName)}</strong> na listi čekanja. Čim se mjesto oslobodi, automatski dobivate mjesto i javljamo vam e-mailom.`
    : `hvala na prijavi! <strong>${esc(p.childName)}</strong> ima rezervirano mjesto.${someWait ? " Za termine označene „Lista čekanja” javit ćemo vam se čim se mjesto oslobodi." : ""}`;
  const deadline = p.lines.some((l) => /\d{4}\./.test(l.when))
    ? `<p style="font-size:14px;color:#4A5B70">Pojedinačne termine možete otkazati najkasnije ${p.deadlineHours} h prije početka.</p>`
    : "";
  const html = layout(
    subject,
    `<p>${esc(greeting(p.parentName))}</p><p>${intro}</p>${t.html}
<p>Ponesite udobnu sportsku odjeću, tenisice za dvoranu i bočicu vode.</p>
<p>Ako ne možete doći, otkažite prijavu kako bi mjesto dobio netko drugi. Poveznica je osobna, nemojte je prosljeđivati:</p>${button(p.cancelUrl, "Pregled i otkazivanje prijave")}${deadline}
<p>Vidimo se!<br>Vaša Sportaonica</p>`,
    settings,
  );
  const text = `${greeting(p.parentName)}\n\n${allWait ? `${p.childName} je na listi čekanja.` : `hvala na prijavi! ${p.childName} ima rezervirano mjesto.`}\n\n${t.text}\n\nPregled i otkazivanje (osobna poveznica): ${p.cancelUrl}\n\nVaša Sportaonica\n${settings.phone} · ${settings.email}`;
  return { subject, html, text };
}

export function promotedEmail(p: { parentName: string; childName: string; line: SessionLine; siteUrl: string }, settings: SiteSettings): Mail {
  const t = sessionsBlock([p.line]);
  const subject = `Oslobodilo se mjesto: ${p.line.activityName}`;
  const html = layout(
    subject,
    `<p>${esc(greeting(p.parentName))}</p><p>imamo lijepe vijesti: oslobodilo se mjesto i <strong>${esc(p.childName)}</strong> je sada upisan/a.</p>${t.html}
<p>Ako vam termin više ne odgovara, otkažite ga putem osobne poveznice iz prvog e-maila (potvrde prijave) ili nas nazovite na ${esc(settings.phone)}.</p>
<p>Vidimo se!<br>Vaša Sportaonica</p>`,
    settings,
  );
  const text = `${greeting(p.parentName)}\n\noslobodilo se mjesto i ${p.childName} je sada upisan/a.\n\n${t.text}\n\nOtkazivanje: osobna poveznica iz e-maila s potvrdom prijave ili telefonom ${settings.phone}.\n\nVaša Sportaonica`;
  return { subject, html, text };
}

export function cancellationEmail(p: { parentName: string; childName: string; lines: SessionLine[]; siteUrl: string }, settings: SiteSettings): Mail {
  const t = sessionsBlock(p.lines);
  const subject = `Prijava otkazana: ${p.lines[0]?.activityName ?? "Sportaonica"}`;
  const html = layout(
    subject,
    `<p>${esc(greeting(p.parentName))}</p><p>potvrđujemo otkazivanje za <strong>${esc(p.childName)}</strong>:</p>${t.html}<p>Hvala što ste oslobodili mjesto! Uvijek se možete ponovno prijaviti na <a href="${esc(p.siteUrl)}/upisi" style="color:#0F4F7D">našoj stranici</a>.</p><p>Vaša Sportaonica</p>`,
    settings,
  );
  return { subject, html, text: `${greeting(p.parentName)}\n\notkazano za ${p.childName}:\n\n${t.text}\n\nVaša Sportaonica` };
}

export function ownerRegistrationEmail(p: { childFirstName: string; lines: SessionLine[]; adminUrl: string }, settings: SiteSettings): Mail {
  const t = sessionsBlock(p.lines);
  const wait = p.lines.every((l) => l.status === "waitlist");
  const label = wait ? "Nova prijava na listu čekanja" : "Nova prijava";
  const subject = `${label}: ${p.lines[0]?.activityName ?? ""}`;
  const html = layout(subject, `<p><strong>${label}</strong> (${esc(p.childFirstName)})</p>${t.html}<p style="font-size:14px;color:#4A5B70">Kontakt podaci i napomene nalaze se u adminu.</p>${button(p.adminUrl, "Otvori u adminu")}`, settings);
  return { subject, html, text: `${label} (${p.childFirstName})\n\n${t.text}\n\n${p.adminUrl}` };
}

export function ownerInquiryEmail(i: Inquiry, adminUrl: string, settings: SiteSettings): Mail {
  const isBirthday = i.type === "birthday";
  const subject = isBirthday ? `Upit za rođendan${i.eventDate ? ` (${i.eventDate})` : ""}` : "Nova poruka s web stranice";
  const facts = isBirthday ? `Datum: ${i.eventDate ?? "—"} · Broj djece: ${i.childrenCount ?? "—"} · Dob: ${i.childAge ?? "—"}` : "";
  const html = layout(subject, `<p><strong>${esc(subject)}</strong></p>${facts ? `<p>${esc(facts)}</p>` : ""}<p style="font-size:14px;color:#4A5B70">Ime, kontakt i poruka nalaze se u adminu.</p>${button(adminUrl, "Otvori upit")}`, settings);
  return { subject, html, text: `${subject}\n${facts}\n\n${adminUrl}` };
}

export function quotaWarningEmail(sent: number, limit: number, adminUrl: string, settings: SiteSettings): Mail {
  const subject = `Upozorenje: danas poslano ${sent} od ${limit} e-mailova`;
  const html = layout(
    subject,
    `<p>Dnevna potrošnja e-mailova prešla je <strong>${sent}</strong> od dopuštenih <strong>${limit}</strong> (besplatni Resend plan).</p><p>Ako se limit dosegne, preostali e-mailovi čekaju u redu i šalju se automatski sljedeći dan. Ništa se ne gubi.</p><p>Ako se ovo često ponavlja, razmislite o Resend Pro planu (vidi README → Troškovi).</p>${button(adminUrl, "Otvori admin")}`,
    settings,
  );
  return { subject, html, text: `${subject}\n\nPreostali e-mailovi čekaju u redu i šalju se sutra.\n${adminUrl}` };
}
