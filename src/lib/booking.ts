import "server-only";
import { publicRepo } from "./data";
import type { BookingErrorCode, CancelResult, SlotWithStats } from "./data/types";
import { ageRangeLabel, isAgeAllowed } from "./data/rules";
import { slotWhen } from "./format";
import { APP_ENV } from "./env";
import { cancelUrl, dispatchOutbox, hashToken, newCancelToken } from "./notifications";
import type { RegistrationData } from "./validation";

export interface BookedSession {
  slotId: string;
  activityName: string;
  locationName: string;
  when: string;
  status: "active" | "waitlist";
  waitlistPosition: number | null;
}

export type CreateRegistrationResult =
  | { ok: true; sessions: BookedSession[]; childName: string; email: string; demoCancelUrl?: string }
  | { ok: false; status: number; code: BookingErrorCode | "INVALID"; message: string; fieldErrors?: Record<string, string> };

const MESSAGES: Record<BookingErrorCode, string> = {
  SLOT_FULL: "Netko je upravo zauzeo zadnje mjesto. Možete se upisati na listu čekanja ili odabrati drugi termin.",
  SLOT_NOT_FOUND: "Odabrani termin više nije dostupan. Odaberite drugi.",
  SLOT_INACTIVE: "Odabrani termin više nije dostupan za prijave.",
  DUPLICATE: "Ovaj polaznik je već prijavljen u odabrani termin. Provjerite e-mail s potvrdom.",
  AGE_OUT_OF_RANGE: "Dob ne odgovara programu.",
  INVALID: "Provjerite unesene podatke.",
};

/** Business flow for a public registration (zod validation already done). */
export async function createPublicRegistration(data: RegistrationData): Promise<CreateRegistrationResult> {
  const repo = publicRepo();
  const [slots, activities, locations] = await Promise.all([repo.listSlots(), repo.listActivities(), repo.listLocations()]);
  const chosen = data.slotIds.map((id) => slots.find((s) => s.id === id));
  if (chosen.some((s) => !s)) return { ok: false, status: 404, code: "SLOT_NOT_FOUND", message: MESSAGES.SLOT_NOT_FOUND };
  const picked = chosen as SlotWithStats[];
  const activity = activities.find((a) => a.id === picked[0].activityId);
  if (!activity || picked.some((s) => s.activityId !== activity.id)) return { ok: false, status: 404, code: "SLOT_NOT_FOUND", message: MESSAGES.SLOT_NOT_FOUND };

  // friendly early message (the database checks again)
  if (!isAgeAllowed(activity, data.childBirthDate)) {
    const msg = `Program „${activity.name}” namijenjen je dobi: ${ageRangeLabel(activity)}. Odaberite prikladan program ili nas kontaktirajte.`;
    return { ok: false, status: 422, code: "AGE_OUT_OF_RANGE", message: msg, fieldErrors: { childBirthDate: msg } };
  }

  const token = newCancelToken();
  const result = await repo.book({
    slotIds: data.slotIds,
    input: {
      parentName: data.parentName,
      phone: data.phone,
      email: data.email,
      childName: data.childName,
      childBirthDate: data.childBirthDate,
      healthNote: data.healthNote || undefined,
      gdprConsent: true,
    },
    cancelTokenHash: hashToken(token),
    allowWaitlist: !!data.waitlist,
  });

  if (!result.ok) {
    const status = result.code === "SLOT_FULL" || result.code === "DUPLICATE" ? 409 : result.code === "SLOT_NOT_FOUND" ? 404 : 422;
    return { ok: false, status, code: result.code, message: MESSAGES[result.code] };
  }

  // send confirmation now (outbox row already committed; retried by cron if this fails)
  await dispatchOutbox(new Map([[result.groupId, token]])).catch((e) => console.error("dispatchOutbox", e));

  const locById = new Map(locations.map((l) => [l.id, l]));
  const sessions: BookedSession[] = result.registrations.map((r) => {
    const slot = picked.find((s) => s.id === r.slotId)!;
    return {
      slotId: r.slotId,
      activityName: activity.name,
      locationName: locById.get(slot.locationId)?.name ?? "",
      when: slotWhen(slot),
      status: r.status,
      waitlistPosition: r.waitlistPosition,
    };
  });
  return {
    ok: true,
    sessions,
    childName: data.childName,
    email: data.email,
    // Without Resend (local/demo) e-mails go to the console, so show the personal link on screen.
    demoCancelUrl: !process.env.RESEND_API_KEY && APP_ENV !== "production" ? cancelUrl(token) : undefined,
  };
}

/** Parent cancels via the personal link. Frees seats, promotes the waitlist, sends e-mails. */
export async function cancelWithToken(token: string, ids?: string[]): Promise<CancelResult> {
  const result = await publicRepo().cancelByToken(token, ids);
  if (result.cancelled.length || result.promoted) await dispatchOutbox().catch((e) => console.error("dispatchOutbox", e));
  return result;
}
