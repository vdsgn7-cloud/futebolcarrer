"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadCareer } from "@/lib/storage";
import { getTeam } from "@/lib/teams";
import BottomNav from "@/components/BottomNav";

export default function NoticiasPage() {
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

  const historico = [...career.historico].reverse();

  return (
    <main className="min-h-screen max-w-md mx-auto px-4 pt-6 pb-28">
      <div className="font-mono text-[10px] tracking-[0.25em] text-gold-400/80 mb-1">
        TEMPORADA {career.temporada}
      </div>
      <h1 className="font-display text-3xl mb-4">NOTÍCIAS</h1>

      {historico.length === 0 ? (
        <div className="card overflow-hidden">
          <div className="p-5 text-sm text-chalk/50">
            Ainda não há nada pra noticiar — simule sua primeira partida.
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {historico.map((h, i) => {
            const mandante = getTeam(h.mandante);
            const visitante = getTeam(h.visitante);
            return (
              <div key={i} className="card overflow-hidden">
                <div className="p-3.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono text-chalk/40">RODADA {h.rodada}</span>
                    {!h.jogou && (
                      <span className="text-[10px] font-mono text-ember">
                        {h.motivo === "suspenso" ? "Suspenso" : "Lesionado"}
                      </span>
                    )}
                  </div>
                  <div className="font-display text-lg mb-1">
                    {mandante.name} {h.golsMandante} — {h.golsVisitante} {visitante.name}
                  </div>
                  {h.jogou && (
                    <div className="text-xs text-chalk/50 font-mono">
                      {h.golsJogador > 0 && `⚽ ${h.golsJogador} gol(s) · `}
                      {h.assistJogador > 0 && `🅰️ ${h.assistJogador} assist. · `}
                      nota {h.nota}
                      {h.cartao && ` · ${h.cartao === "amarelo" ? "🟨" : "🟥"}`}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <BottomNav />
    </main>
  );
}
