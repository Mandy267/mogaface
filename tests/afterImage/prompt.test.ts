import { test } from "node:test";
import assert from "node:assert/strict";
import { buildAfterImagePrompt } from "../../lib/afterImage/prompt.ts";
import { createEmptyAssessment } from "../../lib/assessment/defaults.ts";

test("returns null when no goal gives anything to improve", () => {
  assert.equal(buildAfterImagePrompt(createEmptyAssessment()), null);
});

test("skin goal asks for under-eye and tone improvement", () => {
  const a = createEmptyAssessment();
  a.goals.areas = ["skin"];
  const prompt = buildAfterImagePrompt(a);
  assert.ok(prompt?.includes("under-eye dark circles"));
  assert.ok(!prompt?.includes("Hair:"));
});

test("hair thinning concern asks for density and keeps the style", () => {
  const a = createEmptyAssessment();
  a.goals.areas = ["hair"];
  a.hair.concerns = ["thinning", "hairline"];
  const prompt = buildAfterImagePrompt(a);
  assert.ok(prompt?.includes("hair density"));
  assert.ok(prompt?.includes("Keep the current hair colour"));
});

test("clean-shaven client with the facial hair goal gets no facial hair edit", () => {
  const a = createEmptyAssessment();
  a.goals.areas = ["facialHair"];
  a.facialHair.currentStyle = "cleanShaven";
  assert.equal(buildAfterImagePrompt(a), null);
});

test("every prompt carries the identity-preservation rules", () => {
  const a = createEmptyAssessment();
  a.goals.areas = ["face"];
  const prompt = buildAfterImagePrompt(a);
  assert.ok(prompt?.includes("same identity"));
  assert.ok(prompt?.includes("Do not add text"));
});
