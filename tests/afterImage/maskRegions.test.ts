import { test } from "node:test";
import assert from "node:assert/strict";
import { computeMaskRegions, isEditable } from "../../lib/afterImage/maskRegions.ts";
import { LANDMARK_RINGS } from "../../lib/facial-analysis/landmarkMapping.ts";
import { convexHull, pointInPolygon, scalePolygon } from "../../lib/facial-analysis/geometry.ts";
import type { LandmarkList } from "../../lib/facial-analysis/types.ts";

/** Synthetic face: oval ring on an ellipse, features at fixed spots. Face spans x 0.25-0.75, y 0.15-0.85. */
function buildFace(): LandmarkList {
  const lm: LandmarkList = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
  const put = (i: number, x: number, y: number) => (lm[i] = { x, y, z: 0 });
  const ovals = LANDMARK_RINGS.faceOval;
  ovals.forEach((idx, k) => {
    const t = (k / ovals.length) * Math.PI * 2 - Math.PI / 2; // start at top (landmark 10)
    put(idx, 0.5 + 0.25 * Math.cos(t), 0.5 + 0.35 * Math.sin(t));
  });
  const around = (ringIdx: readonly number[], cx: number, cy: number, rx: number, ry: number) =>
    ringIdx.forEach((idx, k) => {
      const t = (k / ringIdx.length) * Math.PI * 2;
      put(idx, cx + rx * Math.cos(t), cy + ry * Math.sin(t));
    });
  around(LANDMARK_RINGS.rightEye, 0.38, 0.4, 0.06, 0.02);
  around(LANDMARK_RINGS.leftEye, 0.62, 0.4, 0.06, 0.02);
  around(LANDMARK_RINGS.rightEyebrow, 0.38, 0.34, 0.07, 0.015);
  around(LANDMARK_RINGS.leftEyebrow, 0.62, 0.34, 0.07, 0.015);
  around(LANDMARK_RINGS.lipsOuter, 0.5, 0.7, 0.09, 0.03);
  around(LANDMARK_RINGS.nose, 0.5, 0.52, 0.05, 0.1);
  return lm;
}

test("convexHull returns the outer corners of a square with an interior point", () => {
  const hull = convexHull([
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
    { x: 0.5, y: 0.5 },
  ]);
  assert.equal(hull.length, 4);
});

test("pointInPolygon and scalePolygon behave", () => {
  const square = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
  ];
  assert.ok(pointInPolygon({ x: 0.5, y: 0.5 }, square));
  assert.ok(!pointInPolygon({ x: 1.5, y: 0.5 }, square));
  assert.ok(!pointInPolygon({ x: 0.95, y: 0.5 }, scalePolygon(square, 0.5)));
});

const ALL = ["darkCircles", "marks", "faceFullness", "doubleChin", "foreheadLines", "hairLoss"] as const;

test("eyes, nose and lips are never editable, whatever is selected", () => {
  const regions = computeMaskRegions(buildFace(), ALL);
  for (const p of [
    { x: 0.38, y: 0.4 }, // right eye
    { x: 0.62, y: 0.4 }, // left eye
    { x: 0.5, y: 0.52 }, // nose
    { x: 0.5, y: 0.7 }, // lips
  ]) {
    assert.equal(isEditable(p, regions), false, `${p.x},${p.y} should be locked`);
  }
});

test("nothing is editable when no concern is selected", () => {
  const regions = computeMaskRegions(buildFace(), []);
  assert.equal(regions.active.length, 0);
  assert.equal(isEditable({ x: 0.33, y: 0.55 }, regions), false);
});

test("skin concerns unlock cheek and forehead skin only", () => {
  const regions = computeMaskRegions(buildFace(), ["marks"]);
  assert.ok(isEditable({ x: 0.33, y: 0.55 }, regions)); // cheek
  assert.ok(isEditable({ x: 0.5, y: 0.25 }, regions)); // forehead
  assert.equal(isEditable({ x: 0.5, y: 0.9 }, regions), false); // under chin
  assert.equal(isEditable({ x: 0.5, y: 0.1 }, regions), false); // above hairline
});

test("double chin unlocks the area under the chin but not the far neck", () => {
  const regions = computeMaskRegions(buildFace(), ["doubleChin"]);
  assert.ok(isEditable({ x: 0.5, y: 0.9 }, regions));
  assert.equal(isEditable({ x: 0.5, y: 1.0 }, regions), false);
  assert.equal(isEditable({ x: 0.33, y: 0.45 }, regions), false); // cheek untouched
});

test("face fullness lets the cheek outline move inward (band just outside the oval)", () => {
  const regions = computeMaskRegions(buildFace(), ["faceFullness"]);
  assert.ok(isEditable({ x: 0.74, y: 0.6 }, regions), "just outside the cheek edge");
  assert.equal(isEditable({ x: 0.9, y: 0.6 }, regions), false, "background far away stays locked");
});

test("hair is locked unless hair loss is selected", () => {
  assert.equal(isEditable({ x: 0.5, y: 0.1 }, computeMaskRegions(buildFace(), ["marks", "faceFullness"])), false);
  const withHair = computeMaskRegions(buildFace(), ["hairLoss"]);
  assert.ok(isEditable({ x: 0.5, y: 0.1 }, withHair));
  assert.equal(isEditable({ x: 0.1, y: 0.1 }, withHair), false); // background beside the head
  assert.equal(isEditable({ x: 0.33, y: 0.55 }, withHair), false); // face skin untouched
});
