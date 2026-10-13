import { test } from "node:test";
import assert from "node:assert/strict";
import { buildAfterImagePrompt } from "../../lib/afterImage/prompt.ts";
import { CONCERN_VALUES, defaultConcerns } from "../../lib/afterImage/concerns.ts";
import { createEmptyAssessment } from "../../lib/assessment/defaults.ts";

test("returns null when no concern is selected", () => {
  assert.equal(buildAfterImagePrompt([]), null);
});

test("each concern produces its own instruction", () => {
  const expectations: Record<string, string> = {
    darkCircles: "Dark circles",
    marks: "Skin clarity",
    faceFullness: "Facial fullness",
    doubleChin: "Double chin",
    foreheadLines: "neuromodulators",
    hairLoss: "Hair restoration",
  };
  for (const c of CONCERN_VALUES) {
    assert.ok(buildAfterImagePrompt([c])?.includes(expectations[c]), c);
  }
});

test("hair is locked unless hair loss is selected (bald stays bald)", () => {
  const locked = buildAfterImagePrompt(["marks", "faceFullness"]);
  assert.ok(locked?.includes("Hair lock"));
  assert.ok(locked?.includes("bald"));
  const restored = buildAfterImagePrompt(["hairLoss"]);
  assert.ok(!restored?.includes("Hair lock"));
});

test("face fullness stays realistic and does not touch bone structure", () => {
  const prompt = buildAfterImagePrompt(["faceFullness"]);
  assert.ok(prompt?.includes("believable partial change"));
  assert.ok(prompt?.includes("skull and bone structure"));
});

test("every prompt carries identity, skin tone and photorealism rules", () => {
  const prompt = buildAfterImagePrompt(["darkCircles"]);
  assert.ok(prompt?.includes("undeniably the same individual"));
  assert.ok(prompt?.includes("Never lighten, whiten"));
  assert.ok(prompt?.includes("No airbrushing"));
});

test("defaultConcerns pre-ticks from the questionnaire", () => {
  const a = createEmptyAssessment();
  assert.deepEqual(defaultConcerns(a), []);
  a.goals.areas = ["skin", "hair"];
  assert.deepEqual(defaultConcerns(a), ["darkCircles", "marks", "hairLoss"]);
});
