"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { loadDraft, clearDraft, saveCareer } from "@/lib/storage";
import { simulatePeneira, gerarOfertasPeneira, createInitialCareer } from "@/lib/engine";
import { DIVISOES } from "@/lib/divisions";
import Pitch2D from "@/components/Pitch2D";

export default function PeneiraPage() {
  const router = useRouter();
  const [draft, setDraft] = useState(undefined);
  const [resultado, setResultado] = useState(null);
  const [ofertas, setOfertas] = useState(null);
  const [terminou, setTerminou] = useState(false);
  const [speed, setSpeed] = useState(1);
  const rodou = useRef(false);

  useEffect(() => {
    if (rodou.current) return;
    rodou.current = true;
    const d = loadDraft();
    if (!d) {
      router.replace("/create-player");
      return;
    }
    setDraft(d);
    const r = simulatePeneira(d.nome, d.atributos, d.posicao, d.customizacao);
    setResultado(r);
  }, [router]);

  useEffect(() => {
    if (terminou && draft && resultado && !ofertas) {
      setOfertas(gerarOfertasPeneira(draft.atributos, draft.posicao, resultado.nota));
    }
  }, [terminou, draft, resultado, ofertas]);

  function tentarDeNovo() {
    setResultado(simulatePeneira(draft.nome, draft.atributos, draft.posicao));
    setOfertas(null);
    setTerminou(false);
  }

  function assinar(oferta) {
    const career = createInitialCareer({
      nome: draft.nome,
      nacionalidade: draft.nacionalidade,
      posicao: draft.posicao,
      atributos: draft.atributos,
      clubeId: oferta.clubeId,
      divisao: oferta.divisao,
      contrato: { salario: oferta.salario, temporadasRestantes: oferta.temporadasContrato },
    });
    saveCareer(career);
    clearDraft();
    router.push("/career");
  }

  if (!draft || !resultado) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="font-display text-2xl text-gold-400 animate-pulse">CHEGANDO NO CENTRO DE TREINAMENTO…</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen max-w-md mx-auto px-4 py-6 pb-16">
      <div className="text-center mb-3">
        <div className="font-mono text-[10px] text-gold-400/80 tracking-widest mb-1">PENEIRA</div>
        <div className="font-display text-2xl">
          Seu Combinado <span className="text-chalk/30">vs</span> Escolinha Regional
        </div>
        <div className="text-xs text-chalk/40 mt-1">Olheiros de vários clubes estão observando essa partida-teste.</div>
      </div>

      <div className="card overflow-hidden mb-3">
        <div className="p-3">
          <Pitch2D
            timeline={resultado.timeline}
            isHome={resultado.isHome}
            corMandante="#1c3559"
            corVisitante="#4a4a4a"
            titularesMandante={resultado.titularesMandante}
            titularesVisitante={resultado.titularesVisitante}
            meuSlot={resultado.meuSlot}
            meuNome={draft.nome}
            customizacaoJogador={draft.customizacao}
            speed={speed}
            onFinish={() => setTerminou(true)}
          />
        </div>
      </div>

      {!terminou && (
        <div className="flex gap-2 justify-center mb-4">
          {[1, 2, 4].map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-mono border ${
                speed === s ? "bg-gold-500 text-navy-950 border-gold-500" : "border-chalk/15 text-chalk/60"
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      )}

      {terminou && (
        <>
          <div className="card overflow-hidden mb-3">
            <div className="card-header">SEU DESEMPENHO NA PENEIRA</div>
            <div className="p-4 flex justify-around text-center">
              <Stat label="GOLS" value={resultado.golsJogador} />
              <Stat label="ASSISTÊNCIAS" value={resultado.assistJogador} />
              <Stat label="NOTA DOS OLHEIROS" value={resultado.nota.toFixed(1)} />
            </div>
          </div>

          {resultado.eventos.length > 0 && (
            <div className="card overflow-hidden mb-4">
              <div className="card-header">LANCE A LANCE</div>
              <div className="p-4 space-y-1.5 max-h-32 overflow-y-auto">
                {resultado.eventos.map((e, i) => (
                  <div key={i} className="text-xs text-chalk/60 font-mono">
                    {e.minuto}&apos; · {e.texto}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card overflow-hidden mb-4">
            <div className="card-header">PROPOSTAS DOS OLHEIROS</div>
            <div className="p-4">
              {!ofertas ? (
                <div className="text-sm text-chalk/50">Aguardando retorno dos clubes…</div>
              ) : ofertas.length === 0 ? (
                <div className="text-sm text-chalk/50">
                  Nenhum clube chamou dessa vez. Que tal tentar a peneira de novo?
                </div>
              ) : (
                <div className="space-y-2.5">
                  {ofertas.map((o) => (
                    <button
                      key={o.clubeId}
                      onClick={() => assinar(o)}
                      className="w-full text-left border border-chalk/10 hover:border-green-action/50 hover:bg-green-action/5 rounded-lg p-3 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-display text-lg">{o.nomeClube}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-gold-400/40 text-gold-400">
                          {DIVISOES[o.divisao]}
                        </span>
                      </div>
                      <div className="text-xs text-chalk/50 font-mono">
                        R$ {o.salario.toLocaleString("pt-BR")}/mês · {o.temporadasContrato} temporada(s) de contrato
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button onClick={tentarDeNovo} className="btn-ghost w-full py-2.5 rounded-lg text-sm font-mono">
            Tentar a peneira de novo
          </button>
        </>
      )}
    </main>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="font-display text-2xl text-gold-400">{value}</div>
      <div className="text-[9px] text-chalk/40 font-mono">{label}</div>
    </div>
  );
}
