"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadCareer } from "@/lib/storage";
import { getClubeEmQualquerDivisao as getTeam } from "@/lib/divisions";
import { gerarElenco } from "@/lib/squad";
import { overallForPosition } from "@/lib/positions";
import BottomNav from "@/components/BottomNav";
import PlayerAvatar from "@/components/PlayerAvatar";

export default function ElencoPage() {
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

  const time = getTeam(career.player.clubeId);
  const elenco = gerarElenco(career.player.clubeId);
  const overallJogador = overallForPosition(career.player.atributos, career.player.posicao);

  const jogadorNaLista = {
    id: "voce",
    nome: career.player.nome,
    posicao: career.player.posicao,
    overall: overallJogador,
    idade: career.player.idade,
    nacionalidade: career.player.nacionalidade,
    numero: career.player.customizacao?.numero || 10,
    voce: true,
  };

  const listaCompleta = [...elenco, jogadorNaLista].sort((a, b) => b.overall - a.overall);

  return (
    <main className="min-h-screen max-w-2xl mx-auto px-4 pt-6 pb-28 relative z-10">
      
      {/* Luzes de Estádio de fundo */}
      <div className="stadium-light-beam stadium-light-left" />
      <div className="stadium-light-beam stadium-light-right" />

      <div className="font-mono text-[10px] tracking-[0.25em] text-gold-400/80 mb-1">
        {time.name.toUpperCase()}
      </div>
      <h1 className="font-display text-3xl mb-4 uppercase font-extrabold text-chalk tracking-wide">ELENCO</h1>

      <div className="card overflow-hidden mb-4">
        <div className="card-header">JOGADORES · {listaCompleta.length}</div>
        <div className="divide-y divide-chalk/5">
          {listaCompleta.map((j) => (
            <div
              key={j.id}
              className={`flex items-center justify-between px-4 py-3 transition-colors hover:bg-white/5 ${
                j.voce ? "bg-gold-500/5 border-l-4 border-gold-400" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Avatar do bonequinho do elenco */}
                <PlayerAvatar 
                  nome={j.nome} 
                  cor={time.cor} 
                  customizacao={j.voce ? career.player.customizacao : j.customizacao} 
                  size={42} 
                />
                
                <div>
                  <div className={`text-sm ${j.voce ? "text-gold-400 font-semibold" : "text-chalk/85"}`}>
                    {j.nome} {j.voce && <span className="text-gold-400 font-mono text-[10px] bg-gold-400/10 px-1.5 py-0.5 rounded ml-1">VOCÊ</span>}
                  </div>
                  <div className="text-[10px] text-chalk/45 font-mono">
                    Nº {j.numero} · {j.posicao} · {j.nacionalidade} · {j.idade} anos
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-chalk/35 font-mono uppercase mr-1">OVERALL</span>
                <span className="font-display text-lg text-gold-400 font-bold w-6 text-right">{j.overall}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-[10px] text-chalk/35 leading-relaxed px-1 font-mono uppercase">
        * Elenco com nomes reais para times da primeira divisão e gerados procedimentalmente para divisões de acesso.
      </p>

      <BottomNav />
    </main>
  );
}
