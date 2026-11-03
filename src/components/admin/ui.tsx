"use client";

import { useFormStatus } from "react-dom";

/** Submit button with pending state (works inside server-action forms). */
export function SubmitButton({ children, className = "btn-navy", pendingLabel = "Spremam…", ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className} {...rest}>
      {pending ? pendingLabel : children}
    </button>
  );
}

/** Submit button that asks for confirmation first (destructive actions). */
export function ConfirmButton({ children, message, className = "btn bg-coral-100 text-coral-700 hover:bg-coral hover:text-white", ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { message: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={className}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
      {...rest}
    >
      {pending ? "…" : children}
    </button>
  );
}

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="btn-navy no-print">
      🖨️ Ispiši
    </button>
  );
}
