"use client";

export default function PlayerAvatar({ nome, cor = "#1c3559", customizacao, size = 84 }) {
  const pele = customizacao?.pele || "#E0A96D";
  const cabeloCor = customizacao?.cabeloCor || "#4A3B32";
  const cabeloEstilo = customizacao?.cabeloEstilo || "curto";

  return (
    <svg width={size} height={size} viewBox="0 0 84 84" className="inline-block">
      <defs>
        <linearGradient id="avatarBg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={cor} stopOpacity="0.95" />
          <stop offset="100%" stopColor="#060c1a" />
        </linearGradient>
      </defs>
      
      {/* Círculo do card de fundo */}
      <circle cx="42" cy="42" r="40" fill="url(#avatarBg)" stroke="#e8c468" strokeWidth="2" />

      {/* CABELO TRAS (para Black Power ou Cabelo Longo) */}
      {cabeloEstilo === "black" && (
        <circle cx="42" cy="36" r="18" fill={cabeloCor} />
      )}
      {cabeloEstilo === "longo" && (
        <path d="M 25 35 Q 22 55 26 62 Q 42 65 58 62 Q 62 55 59 35 Z" fill={cabeloCor} />
      )}

      {/* PESCOÇO */}
      <rect x="37" y="47" width="10" height="12" rx="2" fill={pele} />

      {/* ROSTO */}
      <circle cx="42" cy="38" r="13" fill={pele} />

      {/* CABELO FRENTE / TOPO */}
      {cabeloEstilo === "curto" && (
        <>
          <path d="M 28 35 Q 42 22 56 35 Q 42 27 28 35 Z" fill={cabeloCor} />
          <rect x="28" y="32" width="3" height="6" fill={cabeloCor} />
          <rect x="53" y="32" width="3" height="6" fill={cabeloCor} />
        </>
      )}
      {cabeloEstilo === "longo" && (
        <path d="M 28 35 Q 42 24 56 35 Q 42 28 28 35 Z" fill={cabeloCor} />
      )}
      {cabeloEstilo === "black" && (
        <path d="M 28 35 Q 42 24 56 35 Q 42 32 28 35 Z" fill={cabeloCor} />
      )}

      {/* OLHOS */}
      <circle cx="38" cy="37" r="1.5" fill="#15284C" />
      <circle cx="46" cy="37" r="1.5" fill="#15284C" />

      {/* SORRISO */}
      <path d="M 39 43 Q 42 46 45 43" stroke="#15284C" strokeWidth="1.5" fill="none" strokeLinecap="round" />

      {/* CAMISA (Jersey) */}
      <path d="M 22 75 Q 42 58 62 75 L 62 82 L 22 82 Z" fill={cor} />
      {/* Detalhe da Gola (V-Neck) */}
      <path d="M 36 58 L 42 65 L 48 58 Z" fill={pele} />
      {/* Friso da Gola */}
      <path d="M 35 58 L 42 66 L 49 58" stroke="#ffffff" strokeWidth="1" fill="none" />
    </svg>
  );
}
