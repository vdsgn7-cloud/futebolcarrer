"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { loadCareer, saveCareer } from "@/lib/storage";
import { simulateRound } from "@/lib/engine";
import { getTeam } from "@/lib/teams";
import Pitch2D from "@/components/Pitch2D";

export default function MatchPage() {
  const router = useRouter();
  const [resultado, setResultado] = useState(null);
  const [terminou, setTerminou] = useState(false);
  const [speed, setSpeed] = useState(1);
  const rodou = useRef(false);

  useEffect(() => {
    if (rodou.current) return;
    rodou.current = true;
    const career = loadCareer();
    if (!career) {
      router.replace("/");
      return;
    }
    const { career: novaCareer, partida } = simulateRound(career);
    saveCareer(novaCareer);
    setResultado(partida);
  }, [router]);

  if (!resultado) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="font-display text-2xl text-gold-400 animate-pulse">CARREGANDO PARTIDA…</div>
      </main>
    );
  }

  const mandante = getTeam(resultado.mandanteId);
  const visitante = getTeam(resultado.visitanteId);

  return (
    <main className="min-h-screen max-w-md mx-auto px-5 py-8 pb-16">
      <div className="text-center mb-4">
        <div className="font-mono text-xs text-gold-400/80 tracking-widest mb-1">AO VIVO</div>
        <div className="font-display text-2xl">
          {mandante.name} <span className="text-chalk/30">vs</span> {visitante.name}
        </div>
      </div>

      <div className="card p-3 mb-4">
        <Pitch2D
          timeline={resultado.timeline}
          isHome={resultado.isHome}
          corMandante={mandante.cor}
          corVisitante={visitante.cor}
          speed={speed}
          onFinish={() => setTerminou(true)}
        />
      </div>

      {!terminou && (
        <div className="flex gap-2 justify-center mb-4">
          {[1, 2, 4].map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-mono border ${
                speed === s ? "bg-gold-500 text-pitch-950 border-gold-500" : "border-chalk/15 text-chalk/60"
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      )}

      {terminou && (
        <div className="card p-5">
          <div className="text-center mb-4">
            <div className="font-display text-4xl mb-1">
              {resultado.golsMandante} — {resultado.golsVisitante}
            </div>
            <div className="text-xs text-chalk/40">FIM DE JOGO</div>
          </div>

          <div className="flex justify-around text-center mb-4">
            <div>
              <div className="font-display text-xl text-gold-400">{resultado.golsJogador}</div>
              <div className="text-[10px] text-chalk/40 font-mono">GOLS</div>
            </div>
            <div>
              <div className="font-display text-xl text-gold-400">{resultado.assistJogador}</div>
              <div className="text-[10px] text-chalk/40 font-mono">ASSISTÊNCIAS</div>
            </div>
            <div>
              <div className="font-display text-xl text-gold-400">{resultado.nota.toFixed(1)}</div>
              <div className="text-[10px] text-chalk/40 font-mono">NOTA</div>
            </div>
          </div>

          {resultado.eventos.length > 0 && (
            <div className="space-y-1 mb-4 max-h-32 overflow-y-auto">
              {resultado.eventos.map((e, i) => (
                <div key={i} className="text-xs text-chalk/60 font-mono">
                  {e.minuto}&apos; — {e.texto}
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => router.push("/career")}
            className="btn-primary w-full py-3 rounded-lg font-display text-lg tracking-wide"
          >
            CONTINUAR
          </button>
        </div>
      )}
    </main>
  );
}
