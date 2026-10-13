import { sanitizeAssessment } from "@/lib/assessment/schema.ts";
import { AFTER_IMAGE_DISCLAIMER, AFTER_IMAGE_PROMPT_VERSION, buildAfterImagePrompt } from "@/lib/afterImage/prompt.ts";

// Image edits can take a while; allow the upstream call to finish.
export const maxDuration = 120;

const OPENAI_EDITS_URL = "https://api.openai.com/v1/images/edits";
const DEFAULT_MODEL = "gpt-image-1";
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
// Output sizes the image-edit endpoint supports; the client resizes the photo
// and mask to exactly this size so the masked composite lines up pixel for pixel.
const ALLOWED_SIZES = ["1024x1024", "1536x1024", "1024x1536"];

function fail(status: number, error: string) {
  return Response.json({ error }, { status });
}

/**
 * POST multipart/form-data: `photo` (front image), `mask` (PNG, transparent =
 * editable), `size`, `assessment` (JSON string), `hairRestoration` ("true" to
 * opt in), `consent` ("true"). Returns `{ image, model, promptVersion, disclaimer }`
 * where `image` is a `data:image/png;base64,...` URL.
 *
 * The photo is forwarded to OpenAI and is not stored or logged here.
 */
export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return fail(503, "Preview generation is not configured on this server.");

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail(400, "Invalid request.");
  }

  if (form.get("consent") !== "true") {
    return fail(400, "Consent is required before a photo can be processed.");
  }

  const photo = form.get("photo");
  if (!(photo instanceof File)) return fail(400, "A photo is required.");
  if (!ACCEPTED_TYPES.includes(photo.type)) return fail(400, "Unsupported photo type. Use JPG, PNG, or WebP.");
  if (photo.size === 0 || photo.size > MAX_PHOTO_BYTES) return fail(400, "Photo must be under 10MB.");

  const mask = form.get("mask");
  if (!(mask instanceof File) || mask.type !== "image/png" || mask.size === 0 || mask.size > MAX_PHOTO_BYTES) {
    return fail(400, "A valid edit mask is required.");
  }
  const size = String(form.get("size") ?? "");
  if (!ALLOWED_SIZES.includes(size)) return fail(400, "Unsupported image size.");
  const hairRestoration = form.get("hairRestoration") === "true";

  let assessment;
  try {
    assessment = sanitizeAssessment(JSON.parse(String(form.get("assessment") ?? "")));
  } catch {
    assessment = null;
  }
  if (!assessment) return fail(400, "Invalid assessment.");

  const prompt = buildAfterImagePrompt(assessment, { hairRestoration });
  if (!prompt) return fail(422, "Choose at least one goal (skin, jawline, face or overall appearance) to preview.");

  const model = process.env.OPENAI_IMAGE_MODEL || DEFAULT_MODEL;
  const body = new FormData();
  body.set("model", model);
  body.set("prompt", prompt);
  body.set("image", photo, photo.name || "photo");
  body.set("mask", mask, "mask.png");
  body.set("size", size);
  body.set("quality", "medium");
  body.set("input_fidelity", "high");
  body.set("n", "1");

  let upstream: Response;
  try {
    upstream = await fetch(OPENAI_EDITS_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body,
      signal: AbortSignal.timeout(110_000),
    });
  } catch {
    return fail(504, "The image service did not respond in time. Please try again.");
  }

  if (!upstream.ok) {
    let code = "";
    try {
      code = (await upstream.json())?.error?.code ?? "";
    } catch {
      // Non-JSON error body — fall through to the generic message.
    }
    console.error(`[after-image] upstream ${upstream.status} ${code}`);
    if (code === "moderation_blocked") {
      return fail(422, "This photo could not be processed. Try a different, clearly lit front-facing photo.");
    }
    return fail(502, "Could not generate the preview. Please try again.");
  }

  const json = (await upstream.json().catch(() => null)) as { data?: { b64_json?: string }[] } | null;
  const b64 = json?.data?.[0]?.b64_json;
  if (!b64) return fail(502, "Could not generate the preview. Please try again.");

  return Response.json({
    image: `data:image/png;base64,${b64}`,
    model,
    promptVersion: AFTER_IMAGE_PROMPT_VERSION,
    disclaimer: AFTER_IMAGE_DISCLAIMER,
  });
}
