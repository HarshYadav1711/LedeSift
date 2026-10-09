"use client";

import { useId, useState } from "react";

type SourcePreviewProps = {
  preview: string;
};

export function SourcePreview({ preview }: SourcePreviewProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="mt-8 border-t border-border pt-6">
      <button
        type="button"
        className="text-left text-sm font-medium text-ink underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? "Hide extracted text preview" : "Show extracted text preview"}
      </button>
      {open ? (
        <pre
          id={panelId}
          className="mt-4 max-h-64 overflow-auto whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-muted"
        >
          {preview}
        </pre>
      ) : null}
    </div>
  );
}
