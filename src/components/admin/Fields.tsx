/** Server-friendly labelled inputs for admin forms. */
type Base = { label: string; name: string; hint?: string; error?: string; className?: string };

export function TextField({ label, name, hint, error, className = "", ...rest }: Base & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={className}>
      <label htmlFor={name} className="field-label">{label}</label>
      <input id={name} name={name} className="field" aria-invalid={!!error} aria-describedby={error ? `${name}-e` : hint ? `${name}-h` : undefined} {...rest} />
      {hint && !error && <p id={`${name}-h`} className="mt-1 text-sm text-ink-soft">{hint}</p>}
      {error && <p id={`${name}-e`} className="field-error">{error}</p>}
    </div>
  );
}

export function TextArea({ label, name, hint, error, className = "", ...rest }: Base & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className={className}>
      <label htmlFor={name} className="field-label">{label}</label>
      <textarea id={name} name={name} className="field" aria-invalid={!!error} {...rest} />
      {hint && !error && <p className="mt-1 text-sm text-ink-soft">{hint}</p>}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

export function Select({ label, name, hint, error, className = "", children, ...rest }: Base & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={className}>
      <label htmlFor={name} className="field-label">{label}</label>
      <select id={name} name={name} className="field" aria-invalid={!!error} {...rest}>
        {children}
      </select>
      {hint && !error && <p className="mt-1 text-sm text-ink-soft">{hint}</p>}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

export function Checkbox({ label, name, hint, ...rest }: Omit<Base, "error"> & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-white p-3 ring-1 ring-ink/10">
      <input type="checkbox" name={name} className="mt-0.5 h-6 w-6 shrink-0 accent-navy" {...rest} />
      <span>
        <span className="font-bold text-ink">{label}</span>
        {hint && <span className="block text-sm text-ink-soft">{hint}</span>}
      </span>
    </label>
  );
}

export function Flash({ ok, error }: { ok?: string; error?: string }) {
  if (!ok && !error) return null;
  return (
    <p role={error ? "alert" : "status"} className={`mb-5 rounded-2xl p-4 font-bold ${error ? "bg-coral-100 text-coral-700" : "bg-teal-100 text-teal-700"}`}>
      {error ? `⚠️ ${error}` : `✅ ${ok}`}
    </p>
  );
}

export function PageTitle({ title, children, intro }: { title: string; intro?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl font-extrabold sm:text-4xl">{title}</h1>
        {intro && <p className="mt-1 text-ink-soft">{intro}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export const STATUS_LABEL = { confirmed: "Upisan/a", waitlist: "Lista čekanja", cancelled: "Otkazano" } as const;
export const STATUS_CLASS = {
  confirmed: "bg-teal-100 text-teal-700",
  waitlist: "bg-butter-200 text-ink",
  cancelled: "bg-ink/10 text-ink-soft",
} as const;
