/** Characters of extracted text sent to the model (deterministic budget). */
export const MAX_MODEL_INPUT_CHARS = 12_000;

/** Soft reserve noted for instructions/schema overhead (documentation only). */
export const PROMPT_OVERHEAD_CHARS = 2_000;

/** Application-level timeout for a single Gemini request. */
export const AI_TIMEOUT_MS = 20_000;

/** Bound model completion size. */
export const AI_MAX_OUTPUT_TOKENS = 512;

/** Summary string limits after Zod validation. */
export const MAX_SUMMARY_CHARS = 1_200;
export const MIN_SUMMARY_CHARS = 20;

/** Key-point array limits. Fewer points are allowed when the source is thin. */
export const MIN_KEY_POINTS = 0;
export const MAX_KEY_POINTS = 5;
export const MAX_KEY_POINT_CHARS = 240;

/** Default free-tier-capable model id. */
export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-lite";
