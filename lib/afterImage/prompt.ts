/**
 * Builds the text prompt for the "after treatment" preview image.
 *
 * Pure function: ticked concerns in, prompt string out. No React, no
 * network, no photo access — so it is unit-testable and the wording of every
 * edit instruction lives in one reviewable place.
 *
 * The prompt is deliberately conservative: only outcomes a non-surgical
 * clinic treatment can plausibly deliver, applied to the client's own face.
 * The result is an illustrative simulation, never a guaranteed outcome.
 */

import type { Concern } from "./concerns.ts";

export const AFTER_IMAGE_PROMPT_VERSION = "3";

export const AFTER_IMAGE_DISCLAIMER =
  "AI-generated simulation for illustration only. Actual results vary and are not guaranteed. Your clinician will assess what is suitable for you.";

const LOCK_RULES = [
  "Keep the exact same person: same nose, eye shape, eyelid folds, eyebrow shape, lips, skull and bone structure, cheekbone width, chin projection, age and expression. This must be undeniably the same individual, not a different or generic model.",
  "Preserve the natural skin tone and melanin depth exactly. Never lighten, whiten, brighten or bleach the complexion.",
  "Keep the same pose, head angle, framing, clothing, background and lighting.",
  "The result must look like a real high-resolution photograph: keep authentic pore texture, fine skin grain and natural highlights. No airbrushing, plastic or porcelain smoothing, CGI look or filters.",
  "Do not add text, logos, watermarks, makeup, jewellery or accessories.",
];

const HAIR_LOCK =
  "Hair lock: do not alter the hair, hairline, scalp or haircut in any way. If the person is bald, balding or shaved, they stay exactly so; never add hair, a wig or a hairstyle.";

const INSTRUCTIONS: Record<Concern, string> = {
  darkCircles:
    "Dark circles (as after tear-trough filler, PRP and peels): clearly lighten the dark pigmentation under the eyes, soften under-eye hollows and shadowing, and reduce puffy bags so the eyes look rested.",
  marks:
    "Skin clarity (as after peels, laser and microneedling): clear acne, pustules, red spots, scars, marks and hyperpigmentation, and even out the skin tone on the face, keeping the skin's natural colour and visible natural texture.",
  faceFullness:
    "Facial fullness (as after fat-reduction injections, HIFU and contouring): visibly reduce puffiness and soft-tissue fullness in the cheeks and lower face so the face looks slimmer and better defined, with a gently tighter contour along the cheeks and jaw. Keep it realistic and proportionate, a believable partial change rather than a dramatic one.",
  doubleChin:
    "Double chin (as after deoxycholic acid or HIFU): reduce fullness under the chin and neck and firm the lower jaw border along the person's own jawline, without changing chin projection or bone structure.",
  foreheadLines:
    "Lines (as after neuromodulators such as Botox): smooth horizontal forehead lines, frown lines between the brows and crow's feet, keeping the expression natural and not frozen.",
  hairLoss:
    "Hair restoration (as after PRP, medical therapy or a hair transplant, explicitly requested): show a realistic, conservative result with natural hair density along the person's own hairline and across thinning or bald areas. If the scalp is bald or shaved, show natural short hair with a believable, slightly irregular hairline suited to their age, in a natural colour matching their eyebrows or beard. Keep any existing hair colour, texture and style unchanged.",
};

/** Returns the full prompt, or null when no concern is ticked (nothing to simulate). */
export function buildAfterImagePrompt(concerns: readonly Concern[]): string | null {
  const selected = [...new Set(concerns)];
  if (selected.length === 0) return null;

  return [
    "Edit this photograph of an aesthetic-clinic client to show a realistic, conservative preview of how they could look after a course of non-surgical treatments at the clinic.",
    "A mask is supplied: change ONLY the transparent (editable) area of the mask and leave every other pixel exactly as it is. Within the editable area, apply only the improvements below.",
    "",
    "Requested improvements:",
    ...selected.map((c) => `- ${INSTRUCTIONS[c]}`),
    "",
    "Strict rules:",
    ...LOCK_RULES.map((r) => `- ${r}`),
    ...(selected.includes("hairLoss") ? [] : [`- ${HAIR_LOCK}`]),
  ].join("\n");
}
