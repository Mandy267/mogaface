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

export const AFTER_IMAGE_PROMPT_VERSION = "1";

export const AFTER_IMAGE_DISCLAIMER =
  "AI-generated simulation for illustration only. Actual results vary and are not guaranteed. Your clinician will assess what is suitable for you.";

const ALWAYS_PRESERVE = [
  "Keep the exact same person: same identity, face shape, bone structure, eye, nose, mouth and ear shape, skin colour, age and expression.",
  "Keep the same pose, head angle, framing, camera distance, clothing, background and lighting.",
  "Keep natural skin texture and pores; no airbrushing, plastic smoothing, filters or beauty-app effects.",
  "The result must be photorealistic and look like the same photograph taken after a modest, realistic, non-surgical aesthetic treatment course.",
  "Do not add text, logos, watermarks, makeup, jewellery or accessories.",
];

function skinInstruction(): string {
  return "Skin: even out skin tone, noticeably soften under-eye dark circles and tired-looking shadows, calm redness and visible blemishes, and give the skin a healthy, well-rested look while preserving natural texture.";
}

function hairInstruction(assessment: Assessment): string {
  const concerns = assessment.hair.concerns;
  const density = concerns.includes("thinning") || concerns.includes("hairline");
  const parts: string[] = [];
  if (density) {
    parts.push(
      "restore natural-looking hair density where it is thinning and along the hairline, with soft, irregular, believable hairline edges",
    );
  }
  if (concerns.includes("dryness") || concerns.includes("frizz") || concerns.includes("scalp")) {
    parts.push("make the hair look healthier, with less dryness or frizz and a healthier scalp");
  }
  if (parts.length === 0) parts.push("make the hair look healthier and fuller without changing its style");
  return `Hair: ${parts.join("; ")}. Keep the current hair colour, length, texture and style.`;
}

function facialHairInstruction(assessment: Assessment): string | null {
  const wanted = assessment.facialHair.improvements.filter((i) => i !== "notApplicable");
  if (wanted.length === 0 && assessment.facialHair.currentStyle === "cleanShaven") return null;
  const bits: string[] = [];
  if (wanted.includes("density")) bits.push("fill in patchy areas for more even coverage");
  if (wanted.includes("shape") || wanted.includes("cheekLine") || wanted.includes("neckline")) {
    bits.push("clean, well-defined cheek and neck lines and a tidy shape");
  }
  if (wanted.includes("length") || wanted.includes("grooming")) bits.push("neatly groomed at a similar length");
  if (bits.length === 0) bits.push("neatly groomed");
  return `Facial hair: ${bits.join("; ")}. Keep the same overall style.`;
}

/**
 * Returns the full prompt, or null when the client's answers give nothing
 * to improve (so the caller never asks the model to "make up" a change).
 */
export function buildAfterImagePrompt(assessment: Assessment): string | null {
  const areas = new Set(assessment.goals.areas);
  const priorities = new Set(assessment.goals.priorities);
  const edits: string[] = [];

  if (areas.has("skin") || priorities.has("improveSkin")) edits.push(skinInstruction());
  if (areas.has("hair") || priorities.has("improveHair") || assessment.hair.concerns.some((c) => c !== "none")) {
    edits.push(hairInstruction(assessment));
  }
  if (areas.has("facialHair")) {
    const facial = facialHairInstruction(assessment);
    if (facial) edits.push(facial);
  }
  if (areas.has("jawDefinition") || priorities.has("lookMoreDefined")) {
    edits.push(
      "Jawline: very subtle improvement in jaw and lower-face definition, as from reduced puffiness or soft-tissue contouring; do not change the bone structure or chin shape.",
    );
  }
  if (areas.has("face") || priorities.has("improveFacialFraming") || priorities.has("lookMorePolished")) {
    edits.push("Face: a subtly fresher, more balanced and well-rested look overall, with no change to the shape of any feature.");
  }
  if (edits.length === 0 && (areas.has("overallAppearance") || priorities.has("overallGlowUp"))) {
    edits.push(skinInstruction());
    edits.push("Face: a subtly fresher, more balanced and well-rested look overall, with no change to the shape of any feature.");
  }

  if (edits.length === 0) return null;

  return [
    "Edit this photograph of a client to show a realistic, conservative preview of their appearance after an aesthetic clinic treatment course.",
    "Only improve the areas listed below, and leave everything else exactly as it is.",
    "",
    "Requested improvements:",
    ...edits.map((e) => `- ${e}`),
    "",
    "Strict rules:",
    ...ALWAYS_PRESERVE.map((r) => `- ${r}`),
  ].join("\n");
}
