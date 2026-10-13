/**
 * The treatable concerns a client (or clinic staff) can tick for the
 * "after treatment" preview. These — not free-form text — drive both the
 * image prompt and which parts of the photo the model may edit, so the
 * simulation only ever shows things the clinic can actually treat.
 */

import type { Assessment } from "../assessment/types.ts";

export type Concern = "darkCircles" | "marks" | "faceFullness" | "doubleChin" | "foreheadLines" | "hairLoss";

export const CONCERN_OPTIONS: { value: Concern; label: string; treatment: string }[] = [
  { value: "darkCircles", label: "Dark circles / tired eyes", treatment: "tear-trough filler, PRP, peels" },
  { value: "marks", label: "Acne, marks, scars & uneven tone", treatment: "peels, lasers, microneedling" },
  { value: "faceFullness", label: "Facial fullness / puffiness", treatment: "fat-reduction injections, HIFU, contouring" },
  { value: "doubleChin", label: "Double chin / jawline", treatment: "deoxycholic acid, HIFU, fillers" },
  { value: "foreheadLines", label: "Forehead lines & frown lines", treatment: "neuromodulators" },
  { value: "hairLoss", label: "Hair loss / thinning hairline", treatment: "PRP, transplant, medical therapy" },
];

export const CONCERN_VALUES: readonly Concern[] = CONCERN_OPTIONS.map((c) => c.value);

export function isConcern(value: unknown): value is Concern {
  return typeof value === "string" && (CONCERN_VALUES as readonly string[]).includes(value);
}

/** Pre-ticks concerns from the questionnaire; the user can change them freely. */
export function defaultConcerns(assessment: Assessment): Concern[] {
  const areas = new Set(assessment.goals.areas);
  const priorities = new Set(assessment.goals.priorities);
  const out = new Set<Concern>();
  if (areas.has("skin") || priorities.has("improveSkin")) {
    out.add("darkCircles");
    out.add("marks");
  }
  if (areas.has("jawDefinition") || priorities.has("lookMoreDefined")) out.add("doubleChin");
  if (areas.has("face") || priorities.has("improveFacialFraming")) out.add("faceFullness");
  if (areas.has("hair") || priorities.has("improveHair") || assessment.hair.concerns.some((c) => c === "thinning" || c === "hairline")) {
    out.add("hairLoss");
  }
  if (areas.has("overallAppearance") || priorities.has("overallGlowUp")) {
    out.add("darkCircles");
    out.add("marks");
    out.add("faceFullness");
  }
  return CONCERN_VALUES.filter((c) => out.has(c));
}
