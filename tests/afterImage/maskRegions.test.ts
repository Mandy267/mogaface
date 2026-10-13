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

test("eyes, nose and lips are never editable", () => {
  const regions = computeMaskRegions(buildFace());
  for (const p of [
    { x: 0.38, y: 0.4 }, // right eye
    { x: 0.62, y: 0.4 }, // left eye
    { x: 0.5, y: 0.52 }, // nose
    { x: 0.5, y: 0.7 }, // lips
  ]) {
    assert.equal(isEditable(p, regions), false, `${p.x},${p.y} should be locked`);
  }
});

test("cheek and forehead skin are editable", () => {
  const regions = computeMaskRegions(buildFace());
  assert.ok(isEditable({ x: 0.33, y: 0.55 }, regions)); // cheek
  assert.ok(isEditable({ x: 0.5, y: 0.25 }, regions)); // forehead
});

test("the area under the chin is editable (submental zone) but far neck is not", () => {
  const regions = computeMaskRegions(buildFace());
  assert.ok(isEditable({ x: 0.5, y: 0.9 }, regions));
  assert.equal(isEditable({ x: 0.5, y: 1.0 }, regions), false);
});

test("hair above the forehead and the background are locked by default", () => {
  const regions = computeMaskRegions(buildFace());
  assert.equal(isEditable({ x: 0.5, y: 0.1 }, regions), false); // above hairline
  assert.equal(isEditable({ x: 0.05, y: 0.5 }, regions), false); // background
});

test("hair restoration unlocks only a band above the forehead", () => {
  const regions = computeMaskRegions(buildFace(), { hairRestoration: true });
  assert.ok(isEditable({ x: 0.5, y: 0.1 }, regions));
  assert.equal(isEditable({ x: 0.5, y: 0.01 }, regions), false); // still far above
  assert.equal(isEditable({ x: 0.38, y: 0.4 }, regions), false); // eyes stay locked
});
