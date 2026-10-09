"use client";

import { useEffect, useRef, useState } from "react";
import {
  basicClientUrlCheck,
  requestSummarize,
} from "@/lib/api/client";
import type { SummarizeSuccess } from "@/lib/api/contracts";
import { FeedbackState } from "@/components/FeedbackState";
import { SummaryResult } from "@/components/SummaryResult";
import { UrlForm } from "@/components/UrlForm";

type AppState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; data: SummarizeSuccess["data"] }
  | {
      status: "error";
      code: string;
      message: string;
      retryable: boolean;
    };

export function SummarizeApp() {
  const [url, setUrl] = useState("");
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [state, setState] = useState<AppState>({ status: "idle" });
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  async function submit() {
    const trimmed = url.trim();
    const clientError = basicClientUrlCheck(trimmed);
    if (clientError) {
      setInlineError(clientError);
      return;
    }

    setInlineError(null);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setState({ status: "submitting" });

    try {
      const result = await requestSummarize(trimmed, {
        signal: controller.signal,
      });

      if (requestId !== requestIdRef.current) {
        return;
      }

      if (result.kind === "success") {
        setState({ status: "success", data: result.data });
        return;
      }

      setState({
        status: "error",
        code: result.code,
        message: result.message,
        retryable: result.retryable,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      if (requestId !== requestIdRef.current) {
        return;
      }
      setState({
        status: "error",
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred.",
        retryable: true,
      });
    }
  }

  return (
    <div>
      <UrlForm
        value={url}
        onChange={(value) => {
          setUrl(value);
          if (inlineError) {
            setInlineError(null);
          }
        }}
        onSubmit={() => {
          void submit();
        }}
        submitting={state.status === "submitting"}
        inlineError={inlineError}
      />

      {state.status === "submitting" ? (
        <FeedbackState
          tone="info"
          title="Working"
          message="Fetching and summarizing the webpage… Browser abort cancels the browser request only; upstream model work may still finish."
        />
      ) : null}

      {state.status === "error" ? (
        <FeedbackState
          tone="error"
          title={titleForError(state.code)}
          message={
            state.retryable
              ? `${state.message} You can try again.`
              : state.message
          }
        />
      ) : null}

      {state.status === "success" ? (
        <SummaryResult data={state.data} />
      ) : null}
    </div>
  );
}

function titleForError(code: string): string {
  switch (code) {
    case "INVALID_URL":
    case "MALFORMED_REQUEST":
      return "Invalid URL";
    case "UNSAFE_URL":
      return "URL not allowed";
    case "FETCH_TIMEOUT":
    case "AI_TIMEOUT":
      return "Timed out";
    case "INSUFFICIENT_CONTENT":
    case "AI_INPUT_INVALID":
      return "Not enough readable text";
    case "UNSUPPORTED_CONTENT":
      return "Unsupported page";
    case "AI_RATE_LIMITED":
      return "Quota reached";
    case "MISSING_API_CONFIG":
      return "Service unavailable";
    case "HTTP_ERROR":
    case "DNS_ERROR":
      return "Page inaccessible";
    default:
      return "Could not distill this page";
  }
}
