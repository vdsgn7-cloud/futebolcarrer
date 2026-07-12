"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadCareer, saveCareer } from "@/lib/storage";
import { ATTRIBUTES, overallForPosition } from "@/lib/positions";
import { definirFocoTreino } from "@/lib/engine";
import BottomNav from "@/components/BottomNav";

export default function TreinoPage() {
  const router = useRouter();
  const [career, setCareer] = useState(undefined);

  useEffect(() => {
    const c = loadCareer();
    if (!c) {
      router.replace("/");
      return;
    }
    setCareer(c);
  }, [router]);

  if (career === undefined || !career) return null;

  const overall = overallForPosition(career.player.atributos, career.player.posicao);

  function escolherFoco(key) {
    const nova = definirFocoTreino(career, key);
    saveCareer(nova);
    setCareer(nova);
  }

  return (
    <main className="min-h-screen max-w-2xl mx-auto px-4 pt-6 pb-28 relative z-10">
      
      {/* Luzes de Estádio */}
      <div className="stadium-light-beam stadium-light-left" />
      <div className="stadium-light-beam stadium-light-right" />

      <div className="font-mono text-[10px] tracking-[0.25em] text-gold-400/80 mb-1">
        DESENVOLVIMENTO
      </div>
      <h1 className="font-display text-3xl mb-4 uppercase font-extrabold text-chalk tracking-wide">TREINO</h1>

      <div className="card overflow-hidden mb-4">
        <div className="card-header">FOCO DA TEMPORADA</div>
        <div className="p-4 text-xs text-chalk/50 leading-relaxed font-mono">
          Escolha um atributo para ser o foco do seu treino nesta temporada. Ele evoluirá mais
          quando a temporada terminar — os outros atributos também evoluirão um pouco (ou
          regredirão, se você já estiver envelhecendo), mas o foco ganhará um empurrão extra.
          Você pode alterar o foco de treino a qualquer momento antes do término do ano.
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="card-header uppercase">
          ATRIBUTOS · OVERALL {overall} ({career.player.posicao})
        </div>
        <div className="p-4 space-y-4">
          {ATTRIBUTES.map((a) => {
            const ativo = career.focoTreino === a.key;
            return (
              <button
                key={a.key}
                onClick={() => escolherFoco(a.key)}
                className={`w-full text-left rounded-xl border p-3.5 transition-all ${
                  ativo 
                    ? "border-[#00FF87] bg-[#00FF87]/5 shadow-[0_0_15px_rgba(0,255,135,0.1)]" 
                    : "border-chalk/10 hover:bg-white/5"
                }`}
              >
                <div className="flex justify-between text-sm mb-2">
                  <span className={ativo ? "text-[#00FF87] font-bold" : "text-chalk/80"}>
                    {a.label} {ativo && "· FOCO ATIVO"}
                  </span>
                  <span className="font-mono text-gold-400 font-bold">{career.player.atributos[a.key]}</span>
                </div>
                <div className="stat-track">
                  <div
                    className={`stat-fill ${!ativo ? "stat-fill-alt" : ""}`}
                    style={{ width: `${career.player.atributos[a.key]}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <BottomNav />
    </main>
  );
}
