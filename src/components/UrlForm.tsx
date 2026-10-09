"use client";

type UrlFormProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  inlineError: string | null;
};

export function UrlForm({
  value,
  onChange,
  onSubmit,
  submitting,
  inlineError,
}: UrlFormProps) {
  return (
    <form
      className="mt-10"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      noValidate
    >
      <label htmlFor="page-url" className="block text-sm font-medium text-ink">
        Webpage URL
      </label>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <input
          id="page-url"
          name="url"
          type="url"
          inputMode="url"
          autoComplete="url"
          placeholder="https://example.com/article"
          value={value}
          disabled={submitting}
          aria-invalid={inlineError ? true : undefined}
          aria-busy={submitting || undefined}
          aria-describedby={inlineError ? "url-error" : "url-hint"}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-12 w-full flex-1 border border-border bg-background px-4 py-3 text-base text-ink placeholder:text-muted/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={submitting}
          aria-busy={submitting || undefined}
          className="min-h-12 shrink-0 bg-accent px-5 py-3 text-sm font-medium tracking-wide text-[#F7F5F0] transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? "Distilling…" : "Distill this page"}
        </button>
      </div>
      <p id="url-hint" className="mt-3 text-sm text-muted">
        Public HTML pages only. Paste a full http or https link.
      </p>
      {inlineError ? (
        <p id="url-error" className="mt-2 text-sm text-accent" role="alert">
          {inlineError}
        </p>
      ) : null}
    </form>
  );
}
