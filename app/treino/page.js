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
    <main className="min-h-screen max-w-md mx-auto px-4 pt-6 pb-28">
      <div className="font-mono text-[10px] tracking-[0.25em] text-gold-400/80 mb-1">
        DESENVOLVIMENTO
      </div>
      <h1 className="font-display text-3xl mb-4">TREINO</h1>

      <div className="card overflow-hidden mb-4">
        <div className="card-header">FOCO DA TEMPORADA</div>
        <div className="p-4 text-xs text-chalk/50 leading-relaxed">
          Escolha um atributo pra ser o foco do seu treino essa temporada. Ele evolui mais
          quando a temporada terminar — os outros atributos também evoluem um pouco (ou
          regridem, se você já estiver ficando mais velho), mas o foco ganha um empurrão a
          mais. Dá pra trocar de foco quando quiser antes de encerrar a temporada.
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="card-header">
          ATRIBUTOS · OVERALL {overall} ({career.player.posicao})
        </div>
        <div className="p-4 space-y-4">
          {ATTRIBUTES.map((a) => {
            const ativo = career.focoTreino === a.key;
            return (
              <button
                key={a.key}
                onClick={() => escolherFoco(a.key)}
                className={`w-full text-left rounded-lg border p-3 transition-colors ${
                  ativo ? "border-green-action bg-green-action/10" : "border-chalk/10 hover:bg-white/5"
                }`}
              >
                <div className="flex justify-between text-sm mb-1.5">
                  <span className={ativo ? "text-green-action font-semibold" : "text-chalk/80"}>
                    {a.label} {ativo && "· FOCO"}
                  </span>
                  <span className="font-mono text-gold-400">{career.player.atributos[a.key]}</span>
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
