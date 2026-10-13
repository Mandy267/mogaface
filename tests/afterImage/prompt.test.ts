import { test } from "node:test";
import assert from "node:assert/strict";
import { buildAfterImagePrompt } from "../../lib/afterImage/prompt.ts";
import { createEmptyAssessment } from "../../lib/assessment/defaults.ts";

test("returns null when no goal gives anything to improve", () => {
  assert.equal(buildAfterImagePrompt(createEmptyAssessment()), null);
});

test("skin goal asks for blemish clearance and tear trough softening", () => {
  const a = createEmptyAssessment();
  a.goals.areas = ["skin"];
  const prompt = buildAfterImagePrompt(a);
  assert.ok(prompt?.includes("clear acne"));
  assert.ok(prompt?.includes("Tear troughs"));
  assert.ok(!prompt?.includes("Hair restoration"));
});

test("jawline goal asks for submental reduction without changing bone structure", () => {
  const a = createEmptyAssessment();
  a.goals.areas = ["jawDefinition"];
  const prompt = buildAfterImagePrompt(a);
  assert.ok(prompt?.includes("double chin"));
  assert.ok(prompt?.includes("without changing chin projection"));
});

test("hair is locked by default, even when the client lists hair concerns", () => {
  const a = createEmptyAssessment();
  a.goals.areas = ["skin", "hair"];
  a.hair.concerns = ["thinning", "hairline"];
  const prompt = buildAfterImagePrompt(a);
  assert.ok(prompt?.includes("Hair lock"));
  assert.ok(prompt?.includes("bald"));
  assert.ok(!prompt?.includes("Hair restoration (explicitly requested)"));
});

test("hair restoration only appears when explicitly requested, and drops the lock", () => {
  const a = createEmptyAssessment();
  a.goals.areas = ["skin"];
  const prompt = buildAfterImagePrompt(a, { hairRestoration: true });
  assert.ok(prompt?.includes("Hair restoration (explicitly requested)"));
  assert.ok(!prompt?.includes("Hair lock"));
});

test("hair restoration alone is enough to produce a prompt", () => {
  assert.ok(buildAfterImagePrompt(createEmptyAssessment(), { hairRestoration: true }));
});

test("every prompt carries identity, skin tone and photorealism rules", () => {
  const a = createEmptyAssessment();
  a.goals.areas = ["face"];
  const prompt = buildAfterImagePrompt(a);
  assert.ok(prompt?.includes("undeniably the same individual"));
  assert.ok(prompt?.includes("Never lighten, whiten"));
  assert.ok(prompt?.includes("No airbrushing"));
});
