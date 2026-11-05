import "server-only";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

export type SendResult = { ok: boolean; mode: "resend" | "console"; error?: string };

/**
 * Sends via Resend's HTTP API when RESEND_API_KEY is set; otherwise prints the
 * e-mail to the server console (local/demo). Never throws: the caller (outbox)
 * records failures and retries.
 */
export async function sendEmail(msg: EmailMessage): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(
      [
        "",
        "┌─ 📧 DEMO E-MAIL (nije poslan) ───────────────────────────",
        `│ Za:     ${msg.to}`,
        `│ Naslov: ${msg.subject}`,
        "├──────────────────────────────────────────────────────────",
        ...msg.text.split("\n").map((l) => `│ ${l}`),
        "└──────────────────────────────────────────────────────────",
      ].join("\n"),
    );
    return { ok: true, mode: "console" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "Sportaonica <onboarding@resend.dev>",
        to: [msg.to],
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
        reply_to: msg.replyTo,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const body = (await res.text()).slice(0, 300);
      console.error("Resend error", res.status, body);
      return { ok: false, mode: "resend", error: `${res.status} ${body}` };
    }
    return { ok: true, mode: "resend" };
  } catch (err) {
    console.error("E-mail send failed", err);
    return { ok: false, mode: "resend", error: (err as Error).message };
  }
}
