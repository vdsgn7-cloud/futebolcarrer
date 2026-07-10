"use client";

// Gráfico radar (pentágono) simples em SVG puro — sem dependências extras.
export default function RadarChart({ data, size = 180 }) {
  // data: [{ label, value (0-99) }]
  const n = data.length;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 24;

  function pointFor(i, value) {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const dist = (value / 99) * r;
    return { x: cx + dist * Math.cos(angle), y: cy + dist * Math.sin(angle) };
  }
  function labelPointFor(i) {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const dist = r + 16;
    return { x: cx + dist * Math.cos(angle), y: cy + dist * Math.sin(angle) };
  }

  const poly = data.map((d, i) => pointFor(i, d.value));
  const polyStr = poly.map((p) => `${p.x},${p.y}`).join(" ");

  const rings = [0.25, 0.5, 0.75, 1];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {rings.map((r2, i) => {
        const ringPts = data
          .map((_, idx) => pointFor(idx, r2 * 99))
          .map((p) => `${p.x},${p.y}`)
          .join(" ");
        return (
          <polygon
            key={i}
            points={ringPts}
            fill="none"
            stroke="rgba(242,246,241,0.12)"
            strokeWidth="1"
          />
        );
      })}
      {data.map((_, i) => {
        const p = pointFor(i, 99);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={p.x}
            y2={p.y}
            stroke="rgba(242,246,241,0.12)"
            strokeWidth="1"
          />
        );
      })}
      <polygon
        points={polyStr}
        fill="rgba(61,220,132,0.25)"
        stroke="#3ddc84"
        strokeWidth="2"
      />
      {poly.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="#3ddc84" />
      ))}
      {data.map((d, i) => {
        const lp = labelPointFor(i);
        return (
          <text
            key={i}
            x={lp.x}
            y={lp.y}
            fontSize="9"
            fill="rgba(242,246,241,0.55)"
            textAnchor="middle"
            dominantBaseline="middle"
            fontFamily="var(--font-mono)"
          >
            {d.label}
          </text>
        );
      })}
    </svg>
  );
}
