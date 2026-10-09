import { handleSummarizePost, methodNotAllowed } from "@/lib/api/handler";

export const runtime = "nodejs";

function toResponse(result: Awaited<ReturnType<typeof handleSummarizePost>>) {
  return Response.json(result.body, {
    status: result.status,
    headers: result.headers,
  });
}

export async function POST(request: Request) {
  return toResponse(await handleSummarizePost(request));
}

export async function GET() {
  return toResponse(methodNotAllowed());
}

export async function PUT() {
  return toResponse(methodNotAllowed());
}

export async function PATCH() {
  return toResponse(methodNotAllowed());
}

export async function DELETE() {
  return toResponse(methodNotAllowed());
}
