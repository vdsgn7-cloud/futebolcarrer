"use client";

export default function PlayerAvatar({ nome, cor = "#1c3559", size = 84 }) {
  const iniciais = nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <svg width={size} height={size} viewBox="0 0 84 84">
      <defs>
        <linearGradient id="avatarBg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={cor} stopOpacity="0.9" />
          <stop offset="100%" stopColor="#0a1428" />
        </linearGradient>
      </defs>
      <circle cx="42" cy="42" r="40" fill="url(#avatarBg)" stroke="#e8c468" strokeWidth="2.5" />
      <text
        x="42"
        y="50"
        textAnchor="middle"
        fontFamily="var(--font-display)"
        fontSize="30"
        fill="#f2f6f1"
      >
        {iniciais}
      </text>
    </svg>
  );
}
