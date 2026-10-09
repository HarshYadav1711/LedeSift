export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-16 sm:px-8">
        <p className="font-serif text-4xl tracking-tight text-ink sm:text-5xl">
          LedeSift
        </p>
        <p className="mt-3 text-lg text-muted">The page, distilled.</p>
        <p className="mt-10 max-w-prose border-t border-border pt-8 text-base leading-relaxed text-ink">
          Foundation phase complete. URL input, extraction, and summarization
          land in later phases.
        </p>
      </main>
    </div>
  );
}
