"use client";

import { useActionState } from "react";
import { login, verifyMfa, type LoginState } from "../auth-actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={action} className="mt-6 grid gap-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="email" className="field-label">E-mail</label>
        <input id="email" name="email" type="email" autoComplete="username" required className="field" />
      </div>
      <div>
        <label htmlFor="password" className="field-label">Lozinka</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="field" />
      </div>
      {state.error && (
        <p role="alert" className="rounded-2xl bg-coral-100 p-3 font-semibold text-coral-700">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn-navy w-full">
        {pending ? "Prijava…" : "Dalje"}
      </button>
    </form>
  );
}

export function MfaForm({ next, factorId }: { next: string; factorId?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(verifyMfa, {});
  return (
    <form action={action} className="mt-6 grid gap-4">
      <input type="hidden" name="next" value={next} />
      {factorId && <input type="hidden" name="factorId" value={factorId} />}
      <div>
        <label htmlFor="code" className="field-label">Kod iz aplikacije za autentifikaciju</label>
        <input
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]{6,7}"
          maxLength={7}
          required
          autoFocus
          className="field text-center font-display text-3xl tracking-[0.4em]"
        />
      </div>
      {state.error && (
        <p role="alert" className="rounded-2xl bg-coral-100 p-3 font-semibold text-coral-700">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn-navy w-full">
        {pending ? "Provjeravam…" : "Potvrdi i uđi"}
      </button>
    </form>
  );
}
