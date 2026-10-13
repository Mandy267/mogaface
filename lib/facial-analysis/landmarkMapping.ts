/**
 * Centralized semantic landmark map for the MediaPipe Face Landmarker's
 * 478-point canonical face mesh. Every index used anywhere in the analysis
 * engine must be looked up from here — never hard-code a raw index elsewhere.
 *
 * "left"/"right" below are anatomical (the subject's own left/right), which
 * matches MediaPipe's own naming in face_mesh_connections.py (FACEMESH_LEFT_EYE
 * / FACEMESH_RIGHT_EYE). On a typical un-mirrored front-facing photo, the
 * subject's right side appears on the left side of the image.
 *
 * Indices were cross-checked against MediaPipe's official connection sets
 * (FACEMESH_LEFT_EYE, FACEMESH_RIGHT_EYE, FACEMESH_LIPS, FACEMESH_FACE_OVAL)
 * from google-ai-edge/mediapipe. Points not covered by an official named set
 * (nose ala, jaw gonion, eyebrows) were assigned by their consistent ~+230
 * index offset between the confirmed right/left pairs (33→263, 61→291,
 * 234→454), which mirrors how the canonical model groups right-side and
 * left-side points.
 */

export const LANDMARK = {
  // Midline reference points.
  /** Top of the mesh, near the hairline. Not a true trichion — the mesh does
   * not track hair, so this is an approximation of the upper forehead boundary. */
  foreheadTop: 10,
  /** Glabella — between the eyebrows. Used as the upper-third/middle-third boundary. */
  glabella: 9,
  /** Subnasale — base of the nose, where it meets the upper lip. */
  noseBase: 2,
  /** Tip of the nose. */
  noseTip: 1,
  /** Center of the outer upper lip. */
  upperLip: 0,
  /** Center of the outer lower lip. */
  lowerLip: 17,
  /** Bottom of the chin. */
  chin: 152,

  // Right eye (subject's right).
  rightEyeOuter: 33,
  rightEyeInner: 133,
  // Left eye (subject's left).
  leftEyeInner: 362,
  leftEyeOuter: 263,

  // Eyebrows. Lower confidence than eye/mouth corners since brow hair can
  // shift the visible edge; used only for symmetry, not load-bearing ratios.
  rightEyebrowOuter: 70,
  rightEyebrowInner: 107,
  leftEyebrowInner: 336,
  leftEyebrowOuter: 300,

  // Nose ala (the widest visible points of the nostrils' outer wings).
  noseRightAla: 129,
  noseLeftAla: 358,

  // Mouth corners.
  mouthRight: 61,
  mouthLeft: 291,

  // Jaw — approximate gonion (jaw-angle) points, used for jaw width.
  // These sit on the mesh's face-oval contour, not a true bony landmark,
  // so jaw width should be read as an approximation.
  rightJaw: 172,
  leftJaw: 397,

  // Face boundary (cheek extremes at ear level) — used for face width.
  faceRightEdge: 234,
  faceLeftEdge: 454,
} as const;

export type LandmarkName = keyof typeof LANDMARK;

/** All indices this module depends on, for a cheap "did detection return enough points" check. */
export const REQUIRED_LANDMARK_INDICES: number[] = Array.from(new Set(Object.values(LANDMARK)));

/**
 * Index rings from MediaPipe's official connection sets (FACEMESH_FACE_OVAL,
 * FACEMESH_LIPS, FACEMESH_LEFT/RIGHT_EYE, FACEMESH_LEFT/RIGHT_EYEBROW), in
 * contour order. Used to build image-edit masks (see lib/afterImage/).
 */
export const LANDMARK_RINGS = {
  faceOval: [
    10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150,
    136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109,
  ],
  lipsOuter: [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185],
  rightEye: [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246],
  leftEye: [263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466],
  rightEyebrow: [46, 53, 52, 65, 55, 70, 63, 105, 66, 107],
  leftEyebrow: [276, 283, 282, 295, 285, 300, 293, 334, 296, 336],
  /** Nasal bridge, tip, nostrils and alae — taken as a convex hull. */
  nose: [168, 6, 197, 195, 5, 4, 1, 19, 94, 2, 98, 327, 129, 358, 49, 279, 102, 331],
  /** Lower face-oval arc from ear to ear through the chin — the mandibular border. */
  jawline: [234, 93, 132, 58, 172, 136, 150, 149, 176, 148, 152, 377, 400, 378, 379, 365, 397, 288, 361, 323, 454],
  /** Upper face-oval arc across the forehead, ear to ear — the hairline side of the oval. */
  foreheadArc: [234, 127, 162, 21, 54, 103, 67, 109, 10, 338, 297, 332, 284, 251, 389, 356, 454],
} as const;
