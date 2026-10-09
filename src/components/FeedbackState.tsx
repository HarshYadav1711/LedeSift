type FeedbackStateProps = {
  tone: "info" | "error" | "success";
  title: string;
  message: string;
  id?: string;
};

export function FeedbackState({
  tone,
  title,
  message,
  id,
}: FeedbackStateProps) {
  const border =
    tone === "error"
      ? "border-accent"
      : tone === "success"
        ? "border-ink/30"
        : "border-border";

  return (
    <div
      id={id}
      role={tone === "error" ? "alert" : "status"}
      aria-live={tone === "error" ? "assertive" : "polite"}
      className={`mt-8 border-t ${border} pt-6`}
    >
      <p className="font-serif text-xl text-ink">{title}</p>
      <p className="mt-2 max-w-prose text-base leading-relaxed text-muted">
        {message}
      </p>
    </div>
  );
}
