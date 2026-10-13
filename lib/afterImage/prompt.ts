/**
 * Builds the text prompt for the "after treatment" preview image.
 *
 * Pure function: questionnaire answers in, prompt string out. No React, no
 * network, no photo access — so it is unit-testable and the wording of every
 * edit instruction lives in one reviewable place.
 *
 * The prompt is deliberately conservative. It asks for a realistic,
 * achievable, non-surgical improvement of only the areas the client chose,
 * and forbids changing identity, bone structure, or anything else. The
 * resulting image is an illustrative simulation, never a guaranteed outcome.
 */

import type { Assessment } from "../assessment/types.ts";

export const AFTER_IMAGE_PROMPT_VERSION = "2";

export const AFTER_IMAGE_DISCLAIMER =
  "AI-generated simulation for illustration only. Actual results vary and are not guaranteed. Your clinician will assess what is suitable for you.";

export interface PromptOptions {
  /** Explicit opt-in. When false (default) hair, hairline and scalp are never altered. */
  hairRestoration?: boolean;
}

const LOCK_RULES = [
  "Keep the exact same person: same nose, eye shape, eyelid folds, eyebrow shape, lips, skull and jaw structure, cheekbone width, chin projection, age and expression. This must be undeniably the same individual, not a different or generic model.",
  "Preserve the natural skin tone and melanin depth exactly. Never lighten, whiten, brighten or bleach the complexion.",
  "Keep the same pose, head angle, framing, clothing, background and lighting.",
  "The result must look like a real high-resolution photograph: keep authentic pore texture, fine skin grain and natural highlights. No airbrushing, plastic or porcelain smoothing, CGI look or filters.",
  "Do not add text, logos, watermarks, makeup, jewellery or accessories.",
];

const HAIR_LOCK =
  "Hair lock: do not alter the hair, hairline, scalp or haircut in any way. If the person is bald, balding or shaved, they stay exactly so; never add hair, a wig or a hairstyle.";

const HAIR_RESTORE =
  "Hair restoration (explicitly requested): restore natural density along the person's OWN original hairline and thinning areas, with soft irregular believable edges. Keep their existing hair colour, texture, curl pattern and hairstyle unchanged.";

/**
 * Returns the full prompt, or null when the client's answers give nothing
 * to improve (so the caller never asks the model to "make up" a change).
 *
 * Only outcomes achievable with non-surgical treatment are requested.
 */
export function buildAfterImagePrompt(assessment: Assessment, options: PromptOptions = {}): string | null {
  const areas = new Set(assessment.goals.areas);
  const priorities = new Set(assessment.goals.priorities);
  const overall = areas.has("overallAppearance") || priorities.has("overallGlowUp");
  const edits: string[] = [];

  if (areas.has("skin") || priorities.has("improveSkin") || overall) {
    edits.push(
      "Dermal clarity (as after chemical peels or laser): clear acne, pustules, red spots, blemishes and hyperpigmentation, and even out the skin tone on the cheeks and forehead, keeping the skin's natural colour and texture.",
      "Tear troughs (as after hyaluronic filler): soften under-eye hollows, shadowing and tired dark circles.",
    );
  }
  if (areas.has("jawDefinition") || priorities.has("lookMoreDefined") || overall) {
    edits.push(
      "Submental and jawline (as after HIFU or deoxycholic acid): reduce soft-tissue fullness under the chin (double chin) and firm the lower jaw border along the person's own jawline, without changing chin projection or bone structure.",
    );
  }
  if (areas.has("face") || priorities.has("improveFacialFraming") || priorities.has("lookMorePolished") || overall) {
    edits.push(
      "Neuromodulator effect (as after Botox): smooth horizontal forehead lines, glabellar frown lines and crow's feet while keeping natural, non-frozen expression lines elsewhere.",
    );
  }
  if (options.hairRestoration) edits.push(HAIR_RESTORE);

  if (edits.length === 0) return null;

  return [
    "Edit this photograph of an aesthetic-clinic client to show a realistic, conservative preview of how they could look after a course of non-surgical treatments.",
    "A mask is supplied: change ONLY the transparent (editable) area of the mask and leave every other pixel exactly as it is. Within the editable area, apply only the improvements below.",
    "",
    "Requested improvements:",
    ...edits.map((e) => `- ${e}`),
    "",
    "Strict rules:",
    ...LOCK_RULES.map((r) => `- ${r}`),
    ...(options.hairRestoration ? [] : [`- ${HAIR_LOCK}`]),
  ].join("\n");
}
