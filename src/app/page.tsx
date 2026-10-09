import { SummarizeApp } from "@/components/SummarizeApp";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-3xl items-baseline justify-between px-6 py-5 sm:px-8">
          <p className="font-serif text-2xl tracking-tight text-ink">LedeSift</p>
          <p className="text-sm text-muted">The page, distilled.</p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 sm:px-8 sm:py-16">
        <h1 className="max-w-xl font-serif text-4xl leading-tight tracking-tight text-ink sm:text-5xl">
          The internet is loud. Find the point.
        </h1>
        <p className="mt-5 max-w-prose text-lg leading-relaxed text-muted">
          Paste a public webpage URL. LedeSift fetches the HTML, extracts the
          main readable text, and returns a concise summary with key takeaways.
          No accounts. No dashboards. Just the lede, sifted.
        </p>

        <SummarizeApp />
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-6 py-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>LedeSift — a reading utility for public HTML pages.</p>
          <p>Summaries are generated from extracted text and are not independently verified.</p>
        </div>
      </footer>
    </div>
  );
}
