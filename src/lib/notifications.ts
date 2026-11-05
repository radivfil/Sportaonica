import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { systemRepo } from "./data";
import type { Activity, Location, OutboxItem, Registration, SiteSettings, SlotWithStats } from "./data/types";
import { slotWhen } from "./format";
import { SITE_URL } from "./site";
import { sendEmail } from "./email/send";
import {
  cancellationEmail,
  confirmationEmail,
  ownerInquiryEmail,
  ownerRegistrationEmail,
  promotedEmail,
  quotaWarningEmail,
  type Mail,
  type SessionLine,
} from "./email/templates";
import { zagrebDate, zagrebInstant } from "./data/rules";

/** Resend free plan: 100 e-mails per day (3 000 per month). Warn the owner at 70. */
export const EMAIL_DAILY_LIMIT = Number(process.env.EMAIL_DAILY_LIMIT || 100);
export const EMAIL_WARN_AT = Number(process.env.EMAIL_WARN_AT || 70);

export const newCancelToken = () => randomBytes(24).toString("base64url");
export const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");
export const cancelUrl = (token: string) => `${SITE_URL}/otkazivanje/${encodeURIComponent(token)}`;
export const ownerEmail = (s: SiteSettings) => process.env.OWNER_NOTIFICATION_EMAIL || s.email;

interface Ctx {
  settings: SiteSettings;
  slots: Map<string, SlotWithStats>;
  activities: Map<string, Activity>;
  locations: Map<string, Location>;
}

function line(ctx: Ctx, r: Registration, waitlistPosition?: number | null): SessionLine {
  const slot = ctx.slots.get(r.slotId);
  const act = slot && ctx.activities.get(slot.activityId);
  const loc = slot && ctx.locations.get(slot.locationId);
  return {
    activityName: act?.name ?? "Aktivnost",
    locationName: loc?.name ?? "",
    address: loc ? `${loc.address}, ${loc.postalCode} ${loc.city}` : "",
    when: slot ? slotWhen(slot) : "",
    status: r.status,
    waitlistPosition,
  };
}

function waitPos(regs: Registration[], r: Registration) {
  if (r.status !== "waitlist") return null;
  const q = regs.filter((x) => x.slotId === r.slotId && x.status === "waitlist").sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return q.findIndex((x) => x.id === r.id) + 1;
}

/** Tomorrow 00:05 Europe/Zagreb — when the daily quota resets. */
function tomorrowMorning() {
  const t = new Date(Date.now() + 24 * 3600_000);
  return zagrebInstant(zagrebDate(t), "00:05");
}

/**
 * Sends pending e-mails from the outbox. The outbox row is written by the
 * database in the same transaction as the booking/cancellation, so nothing is
 * lost if Resend is down: failed items are retried with back-off by the cron
 * tick (/api/cron/tick). `tokens` carries raw cancel tokens of bookings made in
 * this request; on a retry a fresh token is generated (the parent has not
 * received a link yet, so rotating it is safe).
 */
export async function dispatchOutbox(tokens: Map<string, string> = new Map()) {
  const repo = systemRepo();
  const items = await repo.claimOutbox(25);
  const result = { sent: 0, failed: 0, deferred: 0, skipped: 0 };
  if (!items.length) return result;

  const [settings, slots, activities, locations] = await Promise.all([
    repo.getSettings(),
    repo.listSlots({ includeArchived: true }),
    repo.listActivities({ includeArchived: true }),
    repo.listLocations(),
  ]);
  const ctx: Ctx = {
    settings,
    slots: new Map(slots.map((s) => [s.id, s])),
    activities: new Map(activities.map((a) => [a.id, a])),
    locations: new Map(locations.map((l) => [l.id, l])),
  };

  let quotaExhausted = false;
  for (const item of items) {
    if (quotaExhausted) {
      await repo.finishOutbox(item.id, "Dnevni limit e-mailova", tomorrowMorning());
      result.deferred++;
      continue;
    }
    try {
      const msg = await buildMessage(item, ctx, tokens);
      if (!msg) {
        await repo.finishOutbox(item.id); // nothing to send any more (e.g. anonymised)
        result.skipped++;
        continue;
      }
      const quota = await repo.takeEmailQuota(EMAIL_DAILY_LIMIT, EMAIL_WARN_AT);
      if (!quota.allowed) {
        quotaExhausted = true;
        await repo.finishOutbox(item.id, "Dnevni limit e-mailova", tomorrowMorning());
        result.deferred++;
        continue;
      }
      const res = await sendEmail({ to: msg.to, subject: msg.subject, html: msg.html, text: msg.text, replyTo: msg.replyTo });
      if (res.ok) {
        await repo.finishOutbox(item.id);
        result.sent++;
      } else {
        await repo.finishOutbox(item.id, `Resend: ${res.error ?? "greška"}`);
        result.failed++;
      }
      if (quota.warn) await sendQuotaWarning(quota.sent, ctx.settings);
    } catch (err) {
      await repo.finishOutbox(item.id, (err as Error).message).catch(() => undefined);
      result.failed++;
    }
  }
  return result;
}

async function sendQuotaWarning(sent: number, settings: SiteSettings) {
  const mail = quotaWarningEmail(sent, EMAIL_DAILY_LIMIT, `${SITE_URL}/admin`, settings);
  await sendEmail({ to: ownerEmail(settings), ...mail });
}

type Outgoing = Mail & { to: string; replyTo?: string };

async function buildMessage(item: OutboxItem, ctx: Ctx, tokens: Map<string, string>): Promise<Outgoing | null> {
  const repo = systemRepo();
  const s = ctx.settings;
  switch (item.kind) {
    case "confirmation": {
      const regs = (await repo.listRegistrations({ groupId: item.refId })).filter((r) => !r.anonymizedAt);
      const open = regs.filter((r) => r.status === "active" || r.status === "waitlist");
      if (!open.length) return null;
      let token = tokens.get(item.refId);
      if (!token) {
        token = newCancelToken();
        await repo.rotateGroupToken(item.refId, hashToken(token));
      }
      const all = await repo.listRegistrations({ slotId: open[0].slotId });
      const first = open[0];
      const mail = confirmationEmail(
        {
          parentName: first.parentName,
          childName: first.childName,
          lines: open.map((r) => line(ctx, r, waitPos(all, r))),
          cancelUrl: cancelUrl(token),
          deadlineHours: s.cancelDeadlineHours,
        },
        s,
      );
      return { ...mail, to: first.email, replyTo: s.email };
    }
    case "cancellation": {
      const regs = (await repo.listRegistrations({ groupId: item.refId })).filter((r) => r.status === "cancelled_parent" && !r.anonymizedAt);
      if (!regs.length) return null;
      const mail = cancellationEmail({ parentName: regs[0].parentName, childName: regs[0].childName, lines: regs.map((r) => line(ctx, r)), siteUrl: SITE_URL }, s);
      return { ...mail, to: regs[0].email, replyTo: s.email };
    }
    case "promoted": {
      const r = await repo.getRegistration(item.refId);
      if (!r || r.anonymizedAt || r.status !== "active") return null;
      const mail = promotedEmail({ parentName: r.parentName, childName: r.childName, line: line(ctx, r), siteUrl: SITE_URL }, s);
      return { ...mail, to: r.email, replyTo: s.email };
    }
    case "owner_new_registration": {
      const regs = (await repo.listRegistrations({ groupId: item.refId })).filter((r) => !r.anonymizedAt);
      if (!regs.length) return null;
      const mail = ownerRegistrationEmail(
        { childFirstName: regs[0].childName.split(" ")[0], lines: regs.map((r) => line(ctx, r)), adminUrl: `${SITE_URL}/admin/prijave/${regs[0].id}` },
        s,
      );
      return { ...mail, to: ownerEmail(s) };
    }
    case "owner_new_inquiry": {
      const inq = await repo.getInquiry(item.refId);
      if (!inq) return null;
      return { ...ownerInquiryEmail(inq, `${SITE_URL}/admin/upiti`, s), to: ownerEmail(s) };
    }
    case "owner_email_quota":
      return null;
  }
}
