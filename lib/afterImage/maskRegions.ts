/**
 * Decides which parts of a face photo the image model may change.
 *
 * Pure geometry (no canvas, no React) so it is unit-testable. Output is in
 * normalized 0-1 image coordinates, matching MediaPipe landmarks.
 *
 *   editable = inside any `active` polygon AND outside every `protect` polygon
 *
 * Protected: eyes, brows, nose, lips. Active areas depend on the ticked
 * concerns, so nothing is editable that the client did not ask about:
 *   skin concerns   -> skin inside the face oval
 *   faceFullness    -> the lower cheeks/jaw contour, plus a thin band just
 *                      outside it so the outline can move inward
 *   doubleChin      -> a band under the jawline
 *   hairLoss        -> a cap above the forehead for hair
 * Hair, scalp, ears and background are otherwise locked.
 */

import { LANDMARK_RINGS } from "../facial-analysis/landmarkMapping.ts";
import { boundingBox, convexHull, pointInPolygon, scalePolygon } from "../facial-analysis/geometry.ts";
import type { LandmarkList, Point2D } from "../facial-analysis/types.ts";
import type { Concern } from "./concerns.ts";

export type Polygon = Point2D[];

export interface MaskRegions {
  active: Polygon[];
  protect: Polygon[];
}

const SKIN_INSET = 0.97; // keep a thin rim of the oval untouched at the face boundary
const PROTECT_GROW = 1.12; // small safety margin around eyes/nose/lips
const BROW_GROW = 1.08;
const CONTOUR_GROW = 1.1; // how far outside the oval the outline may move inward from
const SUBMENTAL_DEPTH = 0.16; // of face height, below the chin line
const HAIR_CAP_DEPTH = 0.32; // of face height, above the forehead arc
const HAIR_CAP_WIDEN = 1.08;

function ring(landmarks: LandmarkList, indices: readonly number[]): Polygon {
  return indices.map((i) => ({ x: landmarks[i].x, y: landmarks[i].y }));
}

function shift(polygon: Polygon, dy: number): Polygon {
  return polygon.map((p) => ({ x: p.x, y: p.y + dy }));
}

function centroid(polygon: Polygon): Point2D {
  return {
    x: polygon.reduce((s, p) => s + p.x, 0) / polygon.length,
    y: polygon.reduce((s, p) => s + p.y, 0) / polygon.length,
  };
}

const SKIN_CONCERNS: Concern[] = ["darkCircles", "marks", "foreheadLines"];

export function computeMaskRegions(landmarks: LandmarkList, concerns: readonly Concern[]): MaskRegions {
  const wants = (c: Concern) => concerns.includes(c);
  const oval = ring(landmarks, LANDMARK_RINGS.faceOval);
  const box = boundingBox(oval);
  const faceHeight = box.maxY - box.minY;

  const protect: Polygon[] = [
    scalePolygon(ring(landmarks, LANDMARK_RINGS.rightEye), PROTECT_GROW),
    scalePolygon(ring(landmarks, LANDMARK_RINGS.leftEye), PROTECT_GROW),
    scalePolygon(ring(landmarks, LANDMARK_RINGS.rightEyebrow), BROW_GROW),
    scalePolygon(ring(landmarks, LANDMARK_RINGS.leftEyebrow), BROW_GROW),
    scalePolygon(convexHull(ring(landmarks, LANDMARK_RINGS.nose)), PROTECT_GROW),
    scalePolygon(ring(landmarks, LANDMARK_RINGS.lipsOuter), PROTECT_GROW),
  ];

  const active: Polygon[] = [];

  if (SKIN_CONCERNS.some(wants) || wants("faceFullness")) {
    active.push(scalePolygon(oval, SKIN_INSET));
  }

  if (wants("faceFullness")) {
    // Lower half of the oval (below the eyes), grown outward, so the cheek and
    // jaw outline can recede inward and the freed area is filled with background.
    const eyeY = (landmarks[LANDMARK_RINGS.rightEye[0]].y + landmarks[LANDMARK_RINGS.leftEye[0]].y) / 2;
    const lower = oval.filter((p) => p.y >= eyeY);
    if (lower.length >= 3) {
      const c = centroid(oval);
      active.push(lower.map((p) => ({ x: c.x + (p.x - c.x) * CONTOUR_GROW, y: c.y + (p.y - c.y) * CONTOUR_GROW })));
    }
  }

  if (wants("doubleChin") || wants("faceFullness")) {
    // The jawline arc pushed down, so fullness under the chin can be reduced.
    const jaw = ring(landmarks, LANDMARK_RINGS.jawline);
    active.push([...jaw, ...shift(jaw, faceHeight * SUBMENTAL_DEPTH).reverse()]);
  }

  if (wants("hairLoss")) {
    const arc = ring(landmarks, LANDMARK_RINGS.foreheadArc);
    const c = centroid(arc);
    const widened = arc.map((p) => ({ x: c.x + (p.x - c.x) * HAIR_CAP_WIDEN, y: p.y }));
    active.push([...widened, ...shift(widened, -faceHeight * HAIR_CAP_DEPTH).reverse()]);
  }

  return { active, protect };
}

/** Whether a normalized point may be changed by the model. */
export function isEditable(point: Point2D, regions: MaskRegions): boolean {
  return regions.active.some((a) => pointInPolygon(point, a)) && !regions.protect.some((p) => pointInPolygon(point, p));
}
