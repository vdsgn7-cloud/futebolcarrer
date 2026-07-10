"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadCareer, saveCareer } from "@/lib/storage";
import { ATTRIBUTES, overallForPosition } from "@/lib/positions";
import { treinarAtributo } from "@/lib/engine";
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

  function treinar(key) {
    const nova = treinarAtributo(career, key);
    saveCareer(nova);
    setCareer(nova);
  }

  return (
    <main className="min-h-screen max-w-md mx-auto px-4 pt-6 pb-28">
      <div className="font-mono text-[10px] tracking-[0.25em] text-gold-400/80 mb-1">
        DESENVOLVIMENTO
      </div>
      <h1 className="font-display text-3xl mb-4">TREINO</h1>

      <div className="card overflow-hidden mb-4">
        <div className="card-header">PONTOS DE TREINO</div>
        <div className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-chalk/50">
              Você ganha 1 ponto a cada rodada disputada. Use pra evoluir atributos.
            </div>
          </div>
          <div className="font-display text-3xl text-gold-400 shrink-0 pl-4">
            {career.player.pontosTreino}
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="card-header">
          ATRIBUTOS · OVERALL {overall} ({career.player.posicao})
        </div>
        <div className="p-4 space-y-4">
          {ATTRIBUTES.map((a) => (
            <div key={a.key}>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-chalk/80">{a.label}</span>
                <span className="font-mono text-gold-400">{career.player.atributos[a.key]}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="stat-track flex-1">
                  <div
                    className="stat-fill"
                    style={{ width: `${career.player.atributos[a.key]}%` }}
                  />
                </div>
                <button
                  onClick={() => treinar(a.key)}
                  disabled={career.player.pontosTreino <= 0 || career.player.atributos[a.key] >= 99}
                  className="btn-ghost px-3 py-1 rounded-md text-xs font-mono disabled:opacity-30"
                >
                  +2
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <BottomNav />
    </main>
  );
}
