import "server-only";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

/**
 * Sends via Resend's HTTP API when RESEND_API_KEY is set; otherwise prints the
 * e-mail to the server console (demo mode). Never throws — a failed e-mail
 * must not break a successful registration.
 */
export async function sendEmail(msg: EmailMessage): Promise<{ ok: boolean; mode: "resend" | "console" }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(
      [
        "",
        "┌─ 📧 DEMO E-MAIL (not sent) ─────────────────────────────",
        `│ To:      ${msg.to}`,
        `│ Subject: ${msg.subject}`,
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
    });
    if (!res.ok) console.error("Resend error", res.status, await res.text());
    return { ok: res.ok, mode: "resend" };
  } catch (err) {
    console.error("E-mail send failed", err);
    return { ok: false, mode: "resend" };
  }
}
