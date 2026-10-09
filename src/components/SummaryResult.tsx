"use client";

import { useState } from "react";
import type { SummarizeSuccess } from "@/lib/api/contracts";
import { SourcePreview } from "@/components/SourcePreview";

type SummaryResultProps = {
  data: SummarizeSuccess["data"];
};

function domainOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function buildCopyText(data: SummarizeSuccess["data"]): string {
  const points =
    data.keyPoints.length > 0
      ? `\n\nKey takeaways:\n${data.keyPoints.map((point) => `• ${point}`).join("\n")}`
      : "";
  return `${data.source.title || "Summary"}\n\n${data.summary}${points}`;
}

export function SummaryResult({ data }: SummaryResultProps) {
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const partial =
    data.coverage.extractionTruncated || data.coverage.inputTruncated;

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(buildCopyText(data));
      setCopyMessage("Summary copied.");
    } catch {
      setCopyMessage("Could not copy. Select the text and copy manually.");
    }
  }

  return (
    <section
      className="mt-10 border-t border-border pt-8"
      aria-labelledby="summary-heading"
    >
      <p className="text-sm uppercase tracking-[0.08em] text-muted">Result</p>
      <h2
        id="summary-heading"
        className="mt-2 break-words font-serif text-2xl tracking-tight text-ink sm:text-3xl"
      >
        {data.source.title || "Untitled page"}
      </h2>
      <p className="mt-2 text-sm text-muted">
        <a
          href={data.source.finalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {domainOf(data.source.finalUrl)}
        </a>
        <span aria-hidden="true"> · </span>
        <span>{data.source.wordCount} words extracted</span>
      </p>

      {partial ? (
        <p
          className="mt-4 border-l-2 border-accent pl-3 text-sm leading-relaxed text-muted"
          role="status"
        >
          Partial coverage: the extracted page or model input was truncated, so
          this summary may not reflect the full article.
        </p>
      ) : null}

      <div className="mt-6 max-w-prose">
        <h3 className="text-sm font-medium uppercase tracking-[0.08em] text-muted">
          Summary
        </h3>
        <p className="mt-3 break-words text-lg leading-relaxed text-ink">
          {data.summary}
        </p>
      </div>

      <div className="mt-8 max-w-prose">
        <h3 className="text-sm font-medium uppercase tracking-[0.08em] text-muted">
          Key takeaways
          {data.keyPoints.length > 0
            ? ` (${data.keyPoints.length})`
            : ""}
        </h3>
        {data.keyPoints.length > 0 ? (
          <ul className="mt-3 list-disc space-y-2 break-words pl-5 text-base leading-relaxed text-ink">
            {data.keyPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-base leading-relaxed text-muted">
            No separate key points were returned for this page.
          </p>
        )}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onCopy}
          className="min-h-11 border border-border bg-transparent px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Copy summary
        </button>
        <a
          href={data.source.finalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center border border-border px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Open source
        </a>
      </div>
      {copyMessage ? (
        <p className="mt-3 text-sm text-muted" role="status" aria-live="polite">
          {copyMessage}
        </p>
      ) : null}

      <SourcePreview preview={data.sourcePreview} />
    </section>
  );
}
