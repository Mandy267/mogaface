/**
 * Browser-only canvas rendering for the after-image masks and the final
 * pixel-lock composite. Geometry comes from maskRegions.ts.
 *
 * Two masks are produced from the same regions:
 *  - the API mask (hard edge): alpha 0 where the model may edit, opaque
 *    elsewhere — the format OpenAI's image-edit endpoint expects;
 *  - the blend mask (feathered): used to composite the model's output back
 *    over the ORIGINAL photo, so every pixel outside the editable area is
 *    copied straight from the source. This — not the prompt — is what
 *    guarantees the eyes, nose, lips and hair cannot drift.
 */

import type { MaskRegions, Polygon } from "./maskRegions.ts";

function traceAll(ctx: CanvasRenderingContext2D, polygons: Polygon[], width: number, height: number) {
  ctx.beginPath();
  for (const polygon of polygons) {
    polygon.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x * width, p.y * height) : ctx.lineTo(p.x * width, p.y * height)));
    ctx.closePath();
  }
}

function makeCanvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available in this browser.");
  return [canvas, ctx];
}

/** Editable = white (alpha 1), locked = transparent. Optionally blurred for feathering. */
function renderEditableAlpha(regions: MaskRegions, width: number, height: number, featherPx: number): HTMLCanvasElement {
  const [raw, ctx] = makeCanvas(width, height);
  ctx.fillStyle = "#fff";
  traceAll(ctx, regions.active, width, height);
  ctx.fill();
  ctx.globalCompositeOperation = "destination-out";
  traceAll(ctx, regions.protect, width, height);
  ctx.fill();
  if (featherPx <= 0) return raw;

  const [blurred, bctx] = makeCanvas(width, height);
  bctx.filter = `blur(${featherPx}px)`;
  bctx.drawImage(raw, 0, 0);
  return blurred;
}

/** PNG mask for the image-edit API: transparent where the model may paint. */
export async function renderApiMask(regions: MaskRegions, width: number, height: number): Promise<Blob> {
  const editable = renderEditableAlpha(regions, width, height, 0);
  const [mask, ctx] = makeCanvas(width, height);
  ctx.fillStyle = "#000"; // opaque = keep
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = "destination-out";
  ctx.drawImage(editable, 0, 0); // punch out the editable area
  const blob = await new Promise<Blob | null>((resolve) => mask.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Could not prepare the edit mask.");
  return blob;
}

/**
 * Composites `generated` over `original` using the feathered editable mask.
 * Both inputs must already be `width` x `height`. Returns a PNG data URL.
 */
export function compositeLocked(
  original: CanvasImageSource,
  generated: CanvasImageSource,
  regions: MaskRegions,
  width: number,
  height: number,
): string {
  const feather = Math.max(2, Math.round(Math.min(width, height) * 0.004));
  const blend = renderEditableAlpha(regions, width, height, feather);

  const [edited, ectx] = makeCanvas(width, height);
  ectx.drawImage(generated, 0, 0, width, height);
  ectx.globalCompositeOperation = "destination-in";
  ectx.drawImage(blend, 0, 0); // keep generated pixels only where editable

  const [out, octx] = makeCanvas(width, height);
  octx.drawImage(original, 0, 0, width, height);
  octx.drawImage(edited, 0, 0);
  return out.toDataURL("image/png");
}
