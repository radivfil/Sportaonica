import "server-only";
import { repo } from "./data";
import type { CancelResult, Registration } from "./data/types";
import { isAgeInRange } from "./age";
import { WEEKDAYS } from "./format";
import { SITE_URL } from "./site";
import { sendEmail } from "./email/send";
import {
  cancellationEmail,
  confirmationEmail,
  ownerRegistrationEmail,
  promotedEmail,
  type SlotDescription,
} from "./email/templates";
import type { RegistrationData } from "./validation";

export async function describeSlot(slotId: string): Promise<SlotDescription | null> {
  const r = repo();
  const slot = await r.getSlot(slotId);
  if (!slot) return null;
  const [activity, location] = await Promise.all([r.getActivity(slot.activityId), r.getLocation(slot.locationId)]);
  return {
    activityName: activity?.name ?? "Aktivnost",
    locationName: location?.name ?? "Lokacija",
    venue: location?.venue ?? "",
    address: location ? `${location.address}, ${location.postalCode} ${location.city}` : "",
    day: WEEKDAYS[slot.dayOfWeek],
    time: `${slot.startTime}–${slot.endTime}`,
  };
}

export const cancelUrl = (reg: Registration) => `${SITE_URL}/otkazivanje/${encodeURIComponent(reg.cancelToken)}`;

export type CreateRegistrationResult =
  | { ok: true; registration: Registration; slot: SlotDescription }
  | { ok: false; status: number; code: string; message: string; fieldErrors?: Record<string, string> };

/** Business rules for a public registration (validation already done by zod). */
export async function createPublicRegistration(data: RegistrationData): Promise<CreateRegistrationResult> {
  const r = repo();
  const slot = await r.getSlot(data.slotId);
  if (!slot || slot.status !== "active") {
    return { ok: false, status: 404, code: "SLOT_NOT_FOUND", message: "Odabrani termin više nije dostupan. Molimo odaberite drugi." };
  }
  const activity = await r.getActivity(slot.activityId);
  if (!activity) return { ok: false, status: 404, code: "SLOT_NOT_FOUND", message: "Aktivnost nije pronađena." };

  if (!isAgeInRange(data.childBirthDate, activity.ageMin, activity.ageMax)) {
    const msg = `Program „${activity.name}” namijenjen je djeci od ${activity.ageMin} do ${activity.ageMax} godina. Odaberite program prikladan dobi djeteta ili nas kontaktirajte.`;
    return { ok: false, status: 422, code: "AGE_OUT_OF_RANGE", message: msg, fieldErrors: { childBirthDate: msg } };
  }

  // duplicate protection: same child, same slot, still active
  const existing = await r.listRegistrations({ slotId: slot.id });
  const dup = existing.find(
    (x) =>
      x.status !== "cancelled" &&
      x.childBirthDate === data.childBirthDate &&
      x.childName.trim().toLowerCase() === data.childName.trim().toLowerCase(),
  );
  if (dup) {
    return { ok: false, status: 409, code: "DUPLICATE", message: "Ovo dijete je već prijavljeno u odabrani termin. Provjerite e-mail s potvrdom." };
  }

  const result = await r.book(
    slot.id,
    {
      slotId: slot.id,
      parentName: data.parentName,
      phone: data.phone,
      email: data.email,
      childName: data.childName,
      childBirthDate: data.childBirthDate,
      healthNote: data.healthNote || undefined,
      source: data.source || undefined,
      gdprConsent: true,
      marketingConsent: !!data.marketingConsent,
    },
    { allowWaitlist: !!data.waitlist },
  );

  if (!result.ok) {
    if (result.code === "SLOT_FULL") {
      return {
        ok: false,
        status: 409,
        code: "SLOT_FULL",
        message: "Netko je upravo zauzeo zadnje mjesto u ovom terminu. Možete se upisati na listu čekanja ili odabrati drugi termin.",
      };
    }
    return { ok: false, status: 404, code: result.code, message: "Odabrani termin više nije dostupan." };
  }

  const desc = (await describeSlot(slot.id))!;
  await notifyRegistration(result.registration, desc);
  return { ok: true, registration: result.registration, slot: desc };
}

async function notifyRegistration(reg: Registration, slot: SlotDescription) {
  const settings = await repo().getSettings();
  const parent = confirmationEmail(reg, slot, cancelUrl(reg), settings);
  const owner = ownerRegistrationEmail(reg, slot, `${SITE_URL}/admin/prijave?q=${encodeURIComponent(reg.email)}`, settings);
  await Promise.all([
    sendEmail({ to: reg.email, ...parent, replyTo: settings.email }),
    sendEmail({ to: process.env.OWNER_NOTIFICATION_EMAIL || settings.email, ...owner, replyTo: reg.email }),
  ]);
}

export async function notifyPromoted(promoted: Registration | null | undefined) {
  if (!promoted) return;
  const slot = await describeSlot(promoted.slotId);
  if (!slot) return;
  const settings = await repo().getSettings();
  const mail = promotedEmail(promoted, slot, cancelUrl(promoted), settings);
  await sendEmail({ to: promoted.email, ...mail, replyTo: settings.email });
}

/** Cancel via the parent's personal link. Frees the seat and promotes the waitlist. */
export async function cancelWithToken(token: string): Promise<CancelResult> {
  const result = await repo().cancelByToken(token);
  if (result.cancelled && !result.alreadyCancelled) {
    const slot = await describeSlot(result.cancelled.slotId);
    const settings = await repo().getSettings();
    if (slot) await sendEmail({ to: result.cancelled.email, ...cancellationEmail(result.cancelled, slot, settings) });
    await notifyPromoted(result.promoted);
  }
  return result;
}
