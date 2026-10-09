/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SummarizeApp } from "@/components/SummarizeApp";

const requestSummarize = vi.fn();

vi.mock("@/lib/api/client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/client")>(
    "@/lib/api/client",
  );
  return {
    ...actual,
    requestSummarize: (...args: unknown[]) => requestSummarize(...args),
  };
});

describe("SummarizeApp", () => {
  beforeEach(() => {
    requestSummarize.mockReset();
  });

  it("shows an error for empty input without calling the API", async () => {
    const user = userEvent.setup();
    render(<SummarizeApp />);
    await user.click(
      screen.getByRole("button", { name: /distill this page/i }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/enter a webpage url/i);
    expect(requestSummarize).not.toHaveBeenCalled();
  });

  it("shows an error for invalid input", async () => {
    const user = userEvent.setup();
    render(<SummarizeApp />);
    await user.type(screen.getByLabelText(/webpage url/i), "notaurl");
    await user.click(
      screen.getByRole("button", { name: /distill this page/i }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/valid absolute url/i);
    expect(requestSummarize).not.toHaveBeenCalled();
  });

  it("shows loading then success state", async () => {
    const user = userEvent.setup();
    let resolveRequest: (value: unknown) => void = () => undefined;
    requestSummarize.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        }),
    );

    render(<SummarizeApp />);
    await user.type(
      screen.getByLabelText(/webpage url/i),
      "https://example.com/a",
    );
    await user.click(screen.getByRole("button", { name: /distill/i }));

    expect(
      screen.getByText(/fetching and summarizing the webpage/i),
    ).toBeInTheDocument();

    resolveRequest({
      kind: "success",
      data: {
        source: {
          requestedUrl: "https://example.com/a",
          finalUrl: "https://example.com/a",
          title: "Example Title",
          wordCount: 120,
          extractionMethod: "readability",
        },
        summary: "A concise summary of the example article for testing.",
        keyPoints: ["Point one", "Point two"],
        coverage: {
          extractionTruncated: false,
          inputTruncated: false,
        },
        sourcePreview: "Preview text from the article body.",
      },
    });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /example title/i })).toBeInTheDocument();
    });
    expect(screen.getByText(/point one/i)).toBeInTheDocument();
    expect(screen.getByText(/key takeaways \(2\)/i)).toBeInTheDocument();
  });

  it("shows error state from the API", async () => {
    const user = userEvent.setup();
    requestSummarize.mockResolvedValue({
      kind: "error",
      code: "AI_RATE_LIMITED",
      message: "The summarization service rate limit was reached. Try again later.",
      retryable: false,
      status: 429,
    });

    render(<SummarizeApp />);
    await user.type(
      screen.getByLabelText(/webpage url/i),
      "https://example.com/a",
    );
    await user.click(
      screen.getByRole("button", { name: /distill this page/i }),
    );

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/rate limit/i);
    });
    expect(screen.getByText(/quota reached/i)).toBeInTheDocument();
  });

  it("marks the control busy while loading and handles empty keyPoints", async () => {
    const user = userEvent.setup();
    let resolveRequest: (value: unknown) => void = () => undefined;
    requestSummarize.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        }),
    );

    render(<SummarizeApp />);
    await user.type(
      screen.getByLabelText(/webpage url/i),
      "https://example.com/a",
    );
    const button = screen.getByRole("button", { name: /distill this page/i });
    await user.click(button);
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toBeDisabled();
    expect(screen.getByLabelText(/webpage url/i)).toBeDisabled();
    expect(requestSummarize).toHaveBeenCalledTimes(1);

    resolveRequest({
      kind: "success",
      data: {
        source: {
          requestedUrl: "https://example.com/a",
          finalUrl: "https://example.com/a",
          title: "Done",
          wordCount: 40,
          extractionMethod: "readability",
        },
        summary: "Finished summary text for the loading test case.",
        keyPoints: [],
        coverage: { extractionTruncated: false, inputTruncated: false },
        sourcePreview: "preview",
      },
    });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /done/i })).toBeInTheDocument();
    });
    expect(screen.getByText(/no separate key points/i)).toBeInTheDocument();
  });

  it(
    "ignores stale responses when overlapping requests resolve out of order",
    async () => {
    const user = userEvent.setup();
    const resolvers: Array<(value: unknown) => void> = [];
    // Intentionally ignore AbortSignal so both promises can settle — exercises
    // the request-id guard beyond the production AbortController path.
    requestSummarize.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvers.push(resolve);
        }),
    );

    render(<SummarizeApp />);
    const input = screen.getByLabelText(/webpage url/i) as HTMLInputElement;
    await user.type(input, "https://example.com/first");
    await user.click(screen.getByRole("button", { name: /distill/i }));
    expect(screen.getByRole("button", { name: /distilling/i })).toBeDisabled();

    // Production disables controls while submitting; force a second form submit
    // via fireEvent so React disabled props cannot block the overlap case.
    const form = input.closest("form");
    expect(form).not.toBeNull();
    fireEvent.change(input, {
      target: { value: "https://example.com/second" },
    });
    fireEvent.submit(form!);

    expect(resolvers.length).toBe(2);

    resolvers[1]?.({
      kind: "success",
      data: {
        source: {
          requestedUrl: "https://example.com/second",
          finalUrl: "https://example.com/second",
          title: "Fresh Title",
          wordCount: 40,
          extractionMethod: "readability",
        },
        summary: "This fresh summary should win over the stale request.",
        keyPoints: ["fresh"],
        coverage: { extractionTruncated: true, inputTruncated: false },
        sourcePreview: "fresh preview",
      },
    });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /fresh title/i })).toBeInTheDocument();
    });
    expect(screen.getByText(/partial coverage/i)).toBeInTheDocument();

    // Late stale resolution must not overwrite the newer result.
    resolvers[0]?.({
      kind: "success",
      data: {
        source: {
          requestedUrl: "https://example.com/first",
          finalUrl: "https://example.com/first",
          title: "Stale Title",
          wordCount: 40,
          extractionMethod: "readability",
        },
        summary: "This stale summary should not appear in the UI.",
        keyPoints: ["stale"],
        coverage: { extractionTruncated: false, inputTruncated: false },
        sourcePreview: "stale",
      },
    });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /fresh title/i })).toBeInTheDocument();
    });
    expect(screen.queryByText(/stale title/i)).not.toBeInTheDocument();
  },
    10_000,
  );

  it("copies summary text and reports clipboard failure", async () => {
    const user = userEvent.setup();
    requestSummarize.mockResolvedValue({
      kind: "success",
      data: {
        source: {
          requestedUrl: "https://example.com/a",
          finalUrl: "https://example.com/a",
          title: "Copy Me",
          wordCount: 40,
          extractionMethod: "readability",
        },
        summary: "Copyable summary content for the clipboard test.",
        keyPoints: ["Alpha"],
        coverage: { extractionTruncated: false, inputTruncated: false },
        sourcePreview: "preview",
      },
    });

    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      ...navigator,
      clipboard: { writeText },
    });

    render(<SummarizeApp />);
    await user.type(
      screen.getByLabelText(/webpage url/i),
      "https://example.com/a",
    );
    await user.click(
      screen.getByRole("button", { name: /distill this page/i }),
    );
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /copy me/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /copy summary/i }));
    expect(writeText).toHaveBeenCalled();
    expect(screen.getByText(/summary copied/i)).toBeInTheDocument();

    writeText.mockRejectedValueOnce(new Error("denied"));
    await user.click(screen.getByRole("button", { name: /copy summary/i }));
    expect(screen.getByText(/could not copy/i)).toBeInTheDocument();
  });

  it("links to the external source and exposes preview disclosure", async () => {
    const user = userEvent.setup();
    requestSummarize.mockResolvedValue({
      kind: "success",
      data: {
        source: {
          requestedUrl: "https://example.com/a",
          finalUrl: "https://example.com/article",
          title: "Linked",
          wordCount: 40,
          extractionMethod: "fallback",
        },
        summary: "Summary used to verify source link and preview disclosure.",
        keyPoints: [],
        coverage: { extractionTruncated: false, inputTruncated: false },
        sourcePreview: "Exact preview body text.",
      },
    });

    render(<SummarizeApp />);
    await user.type(
      screen.getByLabelText(/webpage url/i),
      "https://example.com/a",
    );
    await user.click(
      screen.getByRole("button", { name: /distill this page/i }),
    );
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /linked/i })).toBeInTheDocument();
    });

    const openLinks = screen.getAllByRole("link", { name: /open source|example.com/i });
    expect(openLinks.length).toBeGreaterThan(0);
    expect(openLinks[0]).toHaveAttribute("href", "https://example.com/article");
    expect(openLinks[0]).toHaveAttribute("rel", "noopener noreferrer");

    await user.click(
      screen.getByRole("button", { name: /show extracted text preview/i }),
    );
    expect(screen.getByText(/exact preview body text/i)).toBeInTheDocument();
  });
});
