const POINTS: [number, number][] = [
  [100, 28], [60, 58], [140, 58], [42, 100], [158, 100], [70, 98], [130, 98],
  [100, 96], [100, 124], [84, 140], [116, 140], [100, 156], [52, 140], [148, 140],
  [74, 186], [126, 186], [100, 204],
];
const LINES: [number, number][] = [
  [0, 1], [0, 2], [1, 3], [2, 4], [1, 5], [2, 6], [5, 7], [6, 7], [7, 8], [8, 9],
  [8, 10], [9, 11], [10, 11], [3, 12], [4, 13], [12, 14], [13, 15], [14, 16],
  [15, 16], [9, 14], [10, 15], [5, 3], [6, 4],
];

export function FaceMeshIllustration() {
  return (
    <svg
      viewBox="0 0 200 232"
      role="img"
      aria-label="Illustration of a face outline with measurement landmarks"
      className="h-auto w-full text-accent"
    >
      <ellipse cx="100" cy="116" rx="68" ry="96" fill="none" stroke="currentColor" strokeOpacity="0.25" />
      <line x1="100" y1="8" x2="100" y2="224" stroke="currentColor" strokeOpacity="0.3" strokeDasharray="3 4" />
      {[58, 98, 156].map((y) => (
        <line key={y} x1="24" y1={y} x2="176" y2={y} stroke="currentColor" strokeOpacity="0.15" strokeDasharray="2 4" />
      ))}
      {LINES.map(([a, b]) => (
        <line
          key={`${a}-${b}`}
          x1={POINTS[a][0]}
          y1={POINTS[a][1]}
          x2={POINTS[b][0]}
          y2={POINTS[b][1]}
          stroke="currentColor"
          strokeOpacity="0.45"
        />
      ))}
      {POINTS.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.6" fill="currentColor" />
      ))}
    </svg>
  );
}
