"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadCareer } from "@/lib/storage";
import { getClubeEmQualquerDivisao as getTeam } from "@/lib/divisions";
import { gerarElenco } from "@/lib/squad";
import { overallForPosition } from "@/lib/positions";
import BottomNav from "@/components/BottomNav";

const ORDEM_POS = ["GOL", "ZAG", "LAT", "VOL", "MEI", "ATA"];

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
    voce: true,
  };

  const listaCompleta = [...elenco, jogadorNaLista].sort((a, b) => b.overall - a.overall);

  return (
    <main className="min-h-screen max-w-md mx-auto px-4 pt-6 pb-28">
      <div className="font-mono text-[10px] tracking-[0.25em] text-gold-400/80 mb-1">
        {time.name.toUpperCase()}
      </div>
      <h1 className="font-display text-3xl mb-4">ELENCO</h1>

      <div className="card overflow-hidden mb-4">
        <div className="card-header">JOGADORES · {listaCompleta.length}</div>
        <div className="divide-y divide-chalk/5">
          {listaCompleta.map((j) => (
            <div
              key={j.id}
              className={`flex items-center justify-between px-4 py-2.5 ${
                j.voce ? "bg-gold-500/10" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono w-8 text-chalk/40">{j.posicao}</span>
                <div>
                  <div className={`text-sm ${j.voce ? "text-gold-400 font-semibold" : "text-chalk/85"}`}>
                    {j.nome} {j.voce && "(você)"}
                  </div>
                  <div className="text-[10px] text-chalk/40">
                    {j.nacionalidade} · {j.idade} anos
                  </div>
                </div>
              </div>
              <div className="font-display text-lg text-gold-400">{j.overall}</div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-[11px] text-chalk/35 leading-relaxed px-1">
        Elenco ilustrativo gerado automaticamente (nomes fictícios) — não representa jogadores
        reais do {time.name}.
      </p>

      <BottomNav />
    </main>
  );
}
