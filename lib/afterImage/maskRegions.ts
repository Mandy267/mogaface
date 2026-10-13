/**
 * Decides which parts of a face photo the image model may change.
 *
 * Pure geometry (no canvas, no React) so it is unit-testable. Output is in
 * normalized 0-1 image coordinates, matching MediaPipe landmarks.
 *
 *   editable = inside any `active` polygon AND outside every `protect` polygon
 *
 * Protected: eyes, brows, nose, lips. Everything outside the face oval
 * (hair, scalp, ears, background) is never in an active polygon, so it is
 * also locked — unless hair restoration is requested, which adds a band
 * above the hairline.
 */

import { LANDMARK_RINGS } from "../facial-analysis/landmarkMapping.ts";
import { boundingBox, convexHull, pointInPolygon, scalePolygon } from "../facial-analysis/geometry.ts";
import type { LandmarkList, Point2D } from "../facial-analysis/types.ts";

export type Polygon = Point2D[];

export interface MaskRegions {
  active: Polygon[];
  protect: Polygon[];
}

export interface MaskOptions {
  /** Also allow edits in a band above the hairline. Off by default (hair lock). */
  hairRestoration?: boolean;
}

const SKIN_INSET = 0.97; // keep a thin rim of the oval untouched at the face boundary
const PROTECT_GROW = 1.12; // small safety margin around eyes/nose/lips
const BROW_GROW = 1.08;
const SUBMENTAL_DEPTH = 0.16; // of face height, below the chin line
const HAIR_BAND_DEPTH = 0.1; // of face height, above the forehead arc

function ring(landmarks: LandmarkList, indices: readonly number[]): Polygon {
  return indices.map((i) => ({ x: landmarks[i].x, y: landmarks[i].y }));
}

function shift(polygon: Polygon, dy: number): Polygon {
  return polygon.map((p) => ({ x: p.x, y: p.y + dy }));
}

export function computeMaskRegions(landmarks: LandmarkList, options: MaskOptions = {}): MaskRegions {
  const oval = ring(landmarks, LANDMARK_RINGS.faceOval);
  const faceHeight = (() => {
    const box = boundingBox(oval);
    return box.maxY - box.minY;
  })();

  const protect: Polygon[] = [
    scalePolygon(ring(landmarks, LANDMARK_RINGS.rightEye), PROTECT_GROW),
    scalePolygon(ring(landmarks, LANDMARK_RINGS.leftEye), PROTECT_GROW),
    scalePolygon(ring(landmarks, LANDMARK_RINGS.rightEyebrow), BROW_GROW),
    scalePolygon(ring(landmarks, LANDMARK_RINGS.leftEyebrow), BROW_GROW),
    scalePolygon(convexHull(ring(landmarks, LANDMARK_RINGS.nose)), PROTECT_GROW),
    scalePolygon(ring(landmarks, LANDMARK_RINGS.lipsOuter), PROTECT_GROW),
  ];

  const active: Polygon[] = [scalePolygon(oval, SKIN_INSET)];

  // Submental / mandibular zone: the jawline arc pushed down, so the model can
  // reduce fullness under the chin and tighten the border.
  const jaw = ring(landmarks, LANDMARK_RINGS.jawline);
  active.push([...jaw, ...shift(jaw, faceHeight * SUBMENTAL_DEPTH).reverse()]);

  if (options.hairRestoration) {
    const arc = ring(landmarks, LANDMARK_RINGS.foreheadArc);
    active.push([...arc, ...shift(arc, -faceHeight * HAIR_BAND_DEPTH).reverse()]);
  }

  return { active, protect };
}

/** Whether a normalized point may be changed by the model. */
export function isEditable(point: Point2D, regions: MaskRegions): boolean {
  return regions.active.some((a) => pointInPolygon(point, a)) && !regions.protect.some((p) => pointInPolygon(point, p));
}
