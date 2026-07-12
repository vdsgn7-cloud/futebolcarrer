"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loadCareer, saveCareer } from "@/lib/storage";
import { simulateRound, simulateSelecaoRound } from "@/lib/engine";
import { getClubeEmQualquerDivisao as getTeam } from "@/lib/divisions";
import Pitch2D from "@/components/Pitch2D";

function MatchInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSelecao = searchParams.get("selecao") === "true";

  const [resultado, setResultado] = useState(null);
  const [nomeJogador, setNomeJogador] = useState("");
  const [customizacaoJogador, setCustomizacaoJogador] = useState(null);
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
    setNomeJogador(career.player.nome);
    setCustomizacaoJogador(career.player.customizacao);
    
    // Simula rodada de clube ou de seleção
    const { career: novaCareer, partida } = isSelecao
      ? simulateSelecaoRound(career)
      : simulateRound(career);
      
    saveCareer(novaCareer);
    setResultado(partida);
    if (!partida.jogadorJogou) setTerminou(true);
  }, [router, isSelecao]);

  if (!resultado) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="font-display text-2xl text-gold-400 animate-pulse">CARREGANDO PARTIDA…</div>
      </main>
    );
  }

  const mandante = getTeam(resultado.mandanteId) || { name: resultado.nomeMandante, cor: resultado.corMandante };
  const visitante = getTeam(resultado.visitanteId) || { name: resultado.nomeVisitante, cor: resultado.corVisitante };

  // rodada em que o jogador não pôde atuar: tela compacta, sem animação
  if (!resultado.jogadorJogou) {
    return (
      <main className="min-h-screen max-w-md mx-auto px-5 py-10 flex flex-col justify-center">
        <div className="card overflow-hidden">
          <div className="card-header">
            {resultado.motivoIndisponivel === "suspenso" ? "VOCÊ ESTAVA SUSPENSO" : "VOCÊ ESTAVA LESIONADO"}
          </div>
          <div className="p-6 text-center">
            <div className="font-display text-lg mb-1">
              {mandante.name} <span className="text-chalk/30">vs</span> {visitante.name}
            </div>
            <div className="font-display text-5xl my-4">
              {resultado.golsMandante} — {resultado.golsVisitante}
            </div>
            <div className="text-sm text-chalk/50">
              Seu time jogou sem você essa rodada.
            </div>
          </div>
        </div>
        <button
          onClick={() => router.push("/career")}
          className="btn-primary w-full py-3 rounded-lg font-display text-lg tracking-wide mt-4"
        >
          CONTINUAR
        </button>
      </main>
    );
  }

  const est = resultado.estatisticas;

  return (
    <main className="min-h-screen max-w-md mx-auto px-4 py-6 pb-10">
      <div className="text-center mb-3">
        <div className="font-mono text-[10px] text-gold-400/80 tracking-widest mb-1">
          {terminou ? "FIM DE JOGO" : "AO VIVO"}
        </div>
        <div className="font-display text-2xl">
          {mandante.name} <span className="text-chalk/30">vs</span> {visitante.name}
        </div>
      </div>

      <div className="card overflow-hidden mb-3">
        <div className="p-3">
          <Pitch2D
            timeline={resultado.timeline}
            isHome={resultado.isHome}
            corMandante={mandante.cor}
            corVisitante={visitante.cor}
            titularesMandante={resultado.titularesMandante}
            titularesVisitante={resultado.titularesVisitante}
            meuSlot={resultado.meuSlot}
            meuNome={nomeJogador}
            customizacaoJogador={customizacaoJogador}
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
          {resultado.cartao && (
            <div className="card overflow-hidden mb-3 border-ember/30">
              <div className="p-3 text-center text-sm">
                {resultado.cartao === "vermelho" ? "🟥" : "🟨"} Você levou cartão{" "}
                {resultado.cartao} nessa partida
                {resultado.suspensoProxima && " — vai cumprir suspensão na próxima rodada."}
              </div>
            </div>
          )}
          {resultado.lesionado && (
            <div className="card overflow-hidden mb-3 border-ember/30">
              <div className="p-3 text-center text-sm">
                🩹 Você se lesionou e vai desfalcar o time por{" "}
                {resultado.lesionado.rodadasRestantes} rodada(s).
              </div>
            </div>
          )}

          <div className="card overflow-hidden mb-3">
            <div className="card-header">DESEMPENHO DO JOGADOR</div>
            <div className="p-4 flex justify-around text-center">
              <Stat label="GOLS" value={resultado.golsJogador} />
              <Stat label="ASSISTÊNCIAS" value={resultado.assistJogador} />
              <Stat label="NOTA" value={resultado.nota.toFixed(1)} />
            </div>
          </div>

          {est && (
            <div className="card overflow-hidden mb-3">
              <div className="card-header">ESTATÍSTICAS DA PARTIDA</div>
              <div className="p-4 space-y-3">
                <StatRow label="Posse de bola" a={`${est.mandante.posse}%`} b={`${est.visitante.posse}%`} pa={est.mandante.posse} pb={est.visitante.posse} />
                <StatRow label="Chutes a gol" a={est.mandante.chutesGol} b={est.visitante.chutesGol} pa={est.mandante.chutesGol} pb={est.visitante.chutesGol} />
                <StatRow label="Chutes" a={est.mandante.chutes} b={est.visitante.chutes} pa={est.mandante.chutes} pb={est.visitante.chutes} />
                <StatRow label="Escanteios" a={est.mandante.escanteios} b={est.visitante.escanteios} pa={est.mandante.escanteios} pb={est.visitante.escanteios} />
                <StatRow label="Faltas" a={est.mandante.faltas} b={est.visitante.faltas} pa={est.mandante.faltas} pb={est.visitante.faltas} />
                <StatRow label="Cartões amarelos" a={est.mandante.cartoesAmarelos} b={est.visitante.cartoesAmarelos} pa={est.mandante.cartoesAmarelos} pb={est.visitante.cartoesAmarelos} />
              </div>
            </div>
          )}

          {resultado.eventos.length > 0 && (
            <div className="card overflow-hidden mb-4">
              <div className="card-header">LANCE A LANCE</div>
              <div className="p-4 space-y-1.5 max-h-40 overflow-y-auto">
                {resultado.eventos.map((e, i) => (
                  <div key={i} className="text-xs text-chalk/60 font-mono">
                    {e.minuto}&apos; — {e.texto}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => router.push("/career")}
            className="btn-primary w-full py-3 rounded-lg font-display text-lg tracking-wide"
          >
            CONTINUAR
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

function StatRow({ label, a, b, pa, pb }) {
  const total = Number(pa) + Number(pb) || 1;
  const widthA = (Number(pa) / total) * 100;
  const widthB = 100 - widthA;
  return (
    <div>
      <div className="flex items-center justify-between text-xs font-mono mb-1">
        <span className="text-chalk/70 w-10 text-left">{a}</span>
        <span className="text-chalk/40">{label}</span>
        <span className="text-chalk/70 w-10 text-right">{b}</span>
      </div>
      <div className="flex gap-1">
        <div className="stat-track flex-1">
          <div className="stat-fill stat-fill-alt ml-auto" style={{ width: `${widthA}%` }} />
        </div>
        <div className="stat-track flex-1">
          <div className="stat-fill" style={{ width: `${widthB}%` }} />
        </div>
      </div>
    </div>
  );
}

export default function MatchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-display text-2xl text-gold-400">CARREGANDO PARTIDA...</div>}>
      <MatchInner />
    </Suspense>
  );
}
