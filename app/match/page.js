"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loadCareer, saveCareer } from "@/lib/storage";
import { simulateRound, simulateSelecaoRound } from "@/lib/engine";
import { getClubeEmQualquerDivisao as getTeam } from "@/lib/divisions";
import Pitch2D from "@/components/Pitch2D";
import PlayerAvatar from "@/components/PlayerAvatar";

function MatchInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSelecao = searchParams.get("selecao") === "true";

  const [resultado, setResultado] = useState(null);
  const [careerState, setCareerState] = useState(null);
  const [nomeJogador, setNomeJogador] = useState("");
  const [customizacaoJogador, setCustomizacaoJogador] = useState(null);
  const [terminou, setTerminou] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [minutoVisual, setMinutoVisual] = useState(0);
  const [placarVisual, setPlacarVisual] = useState({ mandante: 0, visitante: 0 });
  const [estatisticasAtuais, setEstatisticasAtuais] = useState(null);
  const rodou = useRef(false);

  // Nomes de estádio procedimentais
  const [estadioName, setEstadioName] = useState("ESTÁDIO LUZ");
  const estadios = [
    "ESTÁDIO DO LUZ", "ARENA DO SOL", "MARACANÃ", "ALLIANZ PARQUE", 
    "ESTÁDIO DO MORUMBI", "ARENA CONDOMÁ", "ESTÁDIO CENTENÁRIO"
  ];

  useEffect(() => {
    if (rodou.current) return;
    rodou.current = true;
    const career = loadCareer();
    if (!career) {
      router.replace("/");
      return;
    }
    setCareerState(career);
    setNomeJogador(career.player.nome);
    setCustomizacaoJogador(career.player.customizacao);
    setEstadioName(estadios[Math.floor(Math.random() * estadios.length)]);

    // Simula rodada de clube ou de seleção
    const { career: novaCareer, partida } = isSelecao
      ? simulateSelecaoRound(career)
      : simulateRound(career);
      
    saveCareer(novaCareer);
    setResultado(partida);
    setEstatisticasAtuais(partida.estatisticas);
    if (!partida.jogadorJogou) setTerminou(true);
  }, [router, isSelecao]);

  // Monitorar tempo e gols da partida vindo do Pitch2D (por hooks ou estimativa)
  useEffect(() => {
    if (!resultado || !resultado.jogadorJogou) return;
    
    // Se a partida está rolando, simulamos minutos correndo visualmente
    if (!terminou) {
      let currentMin = 0;
      const interval = setInterval(() => {
        currentMin += 1;
        if (currentMin >= 90) {
          currentMin = 90;
          setTerminou(true);
          clearInterval(interval);
        }
        setMinutoVisual(currentMin);
        
        // Atualiza gols da timeline conforme minutos passam
        const golsAteMin = resultado.timeline.filter(
          (seq) => seq.tipo === "gol" && seq.minuto <= currentMin
        );
        const golsM = golsAteMin.filter((g) => g.time === "mandante").length;
        const golsV = golsAteMin.filter((g) => g.time === "visitante").length;
        setPlacarVisual({ mandante: golsM, visitante: golsV });
      }, (40000 / 90) / speed); // Corre os 90 minutos proporcional à velocidade
      
      return () => clearInterval(interval);
    } else {
      setMinutoVisual(90);
      setPlacarVisual({ mandante: resultado.golsMandante, visitante: resultado.golsVisitante });
    }
  }, [resultado, terminou, speed]);

  if (!resultado) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#020712]">
        <div className="font-display text-2xl text-gold-400 animate-pulse">CARREGANDO PARTIDA…</div>
      </main>
    );
  }

  const mandante = getTeam(resultado.mandanteId) || { name: resultado.nomeMandante, cor: resultado.corMandante };
  const visitante = getTeam(resultado.visitanteId) || { name: resultado.nomeVisitante, cor: resultado.corVisitante };

  // Caso jogador esteja lesionado/suspenso
  if (!resultado.jogadorJogou) {
    return (
      <main className="min-h-screen max-w-md mx-auto px-5 py-10 flex flex-col justify-center bg-[#020712]">
        <div className="card overflow-hidden">
          <div className="card-header text-center">
            {resultado.motivoIndisponivel === "suspenso" ? "VOCÊ ESTAVA SUSPENSO" : "VOCÊ ESTAVA LESIONADO"}
          </div>
          <div className="p-6 text-center">
            <div className="font-display text-lg mb-1">
              {mandante.name} <span className="text-chalk/30">vs</span> {visitante.name}
            </div>
            <div className="font-display text-5xl my-4 text-gold-400">
              {resultado.golsMandante} — {resultado.golsVisitante}
            </div>
            <div className="text-sm text-chalk/50">
              Seu time jogou sem você esta rodada.
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

  const est = estatisticasAtuais || resultado.estatisticas;
  const passesCertos = resultado.nota ? Math.min(99, Math.round(74 + resultado.nota * 2.2)) : 0;
  const notaFormatada = resultado.nota ? resultado.nota.toFixed(1) : "6.0";
  const notaColor = resultado.nota >= 7.5 ? "bg-green-glow/20 border-green-glow/40 text-green-glow" : resultado.nota >= 6.0 ? "bg-gold-500/20 border-gold-500/40 text-gold-400" : "bg-ember/20 border-ember/40 text-ember";

  return (
    <main className="min-h-screen max-w-6xl mx-auto px-4 py-6 pb-24 relative z-10">
      
      {/* Luzes de Estádio de fundo decorativas */}
      <div className="stadium-light-beam stadium-light-left" />
      <div className="stadium-light-beam stadium-light-right" />

      {/* Placar Superior Premium */}
      <div className="placar-container max-w-3xl mx-auto p-4 mb-6 text-center">
        <div className="text-[10px] tracking-[0.2em] font-mono text-chalk/40 uppercase mb-1">SIMULAÇÃO DA PARTIDA</div>
        
        <div className="flex items-center justify-between px-6 max-w-2xl mx-auto">
          {/* Mandante */}
          <div className="flex items-center gap-3 w-5/12 justify-end">
            <span className="font-display text-lg md:text-xl text-chalk font-semibold truncate">{mandante.name}</span>
            <div className="w-12 h-12 crest shrink-0" style={{ backgroundColor: mandante.cor }}>
              <span className="text-xs text-white/90 font-bold">{mandante.name.slice(0, 3).toUpperCase()}</span>
            </div>
          </div>

          {/* Placar central */}
          <div className="flex flex-col items-center justify-center px-4">
            <div className="font-display text-3xl md:text-4xl text-gold-400 font-bold tracking-tight">
              {placarVisual.mandante} <span className="text-chalk/35 font-light">-</span> {placarVisual.visitante}
            </div>
            <div className="text-xs font-mono text-yellow-400 font-semibold mt-1">
              {minutoVisual}&apos; ({minutoVisual < 45 ? "1" : "2"}º TEMPO)
            </div>
          </div>

          {/* Visitante */}
          <div className="flex items-center gap-3 w-5/12 justify-start">
            <div className="w-12 h-12 crest shrink-0" style={{ backgroundColor: visitante.cor }}>
              <span className="text-xs text-white/90 font-bold">{visitante.name.slice(0, 3).toUpperCase()}</span>
            </div>
            <span className="font-display text-lg md:text-xl text-chalk font-semibold truncate">{visitante.name}</span>
          </div>
        </div>

        <div className="text-[10px] text-chalk/35 font-mono mt-2 uppercase tracking-widest">{estadioName}</div>
      </div>

      {/* Dashboard de 3 colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* COLUNA ESQUERDA: Estatísticas da Partida */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="card overflow-hidden h-full">
            <div className="card-header">ESTATÍSTICAS DA PARTIDA</div>
            {est ? (
              <div className="p-4 space-y-4 flex flex-col justify-between h-[calc(100%-2.5rem)]">
                <StatProgress label="Chutes a Gol" a={est.mandante.chutesGol} b={est.visitante.chutesGol} />
                <StatProgress label="Chutes Fora" a={est.mandante.chutes - est.mandante.chutesGol} b={est.visitante.chutes - est.visitante.chutesGol} />
                <StatProgress label="Escanteios" a={est.mandante.escanteios} b={est.visitante.escanteios} />
                <StatProgress label="Faltas" a={est.mandante.faltas} b={est.visitante.faltas} />
                <StatProgress label="Cartões Amarelos" a={est.mandante.cartoesAmarelos} b={est.visitante.cartoesAmarelos} />
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-chalk/30 font-mono h-40 flex items-center justify-center">
                Simulando estatísticas...
              </div>
            )}
          </div>
        </div>

        {/* COLUNA CENTRAL: Campo 2D */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="card p-2 bg-[#0c2014]">
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

        {/* COLUNA DIREITA: Eventos + Desempenho do Jogador */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          {/* Timeline / Lance a Lance */}
          <div className="card overflow-hidden flex-1 max-h-56 lg:max-h-none">
            <div className="card-header">LANCE A LANCE</div>
            <div className="p-4 space-y-2 overflow-y-auto max-h-44 lg:max-h-60 font-mono">
              {resultado.eventos.length === 0 ? (
                <div className="text-xs text-chalk/30 text-center py-6">Estudo tático das equipes...</div>
              ) : (
                resultado.eventos.map((e, i) => (
                  <div key={i} className="text-xs text-chalk/70 border-b border-chalk/5 pb-1 flex justify-between gap-1 items-start">
                    <span className="text-yellow-400 font-bold shrink-0">{e.minuto}&apos;</span>
                    <span className="flex-1 text-left leading-normal">{e.texto}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Desempenho do Jogador */}
          <div className="card overflow-hidden">
            <div className="card-header">DESEMPENHO DO JOGADOR</div>
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <PlayerAvatar nome={nomeJogador} cor={resultado.isSelecao ? "#F5D105" : careerState?.player.clubeId ? getTeam(careerState.player.clubeId)?.cor : "#1c3559"} customizacao={customizacaoJogador} size={54} />
                <div className="flex-1">
                  <div className="font-display font-semibold text-chalk text-base truncate">{nomeJogador}</div>
                  <div className="text-[10px] text-chalk/40 font-mono uppercase">
                    {resultado.isSelecao ? "SELEÇÃO BRASILEIRA" : careerState ? getTeam(careerState.player.clubeId)?.name : "Clube"}
                  </div>
                </div>
                {/* Nota do Jogador */}
                <div className={`w-12 h-12 rounded-lg border-2 ${notaColor} flex flex-col items-center justify-center font-display font-bold text-lg shadow-inner`}>
                  {notaFormatada}
                </div>
              </div>

              <div className="pt-3 border-t border-chalk/10 grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="font-display text-lg text-gold-400 font-bold">{resultado.golsJogador}</div>
                  <div className="text-[8px] text-chalk/45 font-mono uppercase">Gols</div>
                </div>
                <div>
                  <div className="font-display text-lg text-gold-400 font-bold">{resultado.assistJogador}</div>
                  <div className="text-[8px] text-chalk/45 font-mono uppercase">Assists</div>
                </div>
                <div>
                  <div className="font-display text-lg text-gold-400 font-bold">{passesCertos}%</div>
                  <div className="text-[8px] text-chalk/45 font-mono uppercase">P. Certos</div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Controle de Velocidade e Ações da Partida */}
      <div className="fixed bottom-0 left-0 right-0 py-3 bg-[#0a1428]/95 border-t border-gold-400/20 backdrop-blur-md z-40 flex items-center justify-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-chalk/50 uppercase">VELOCIDADE:</span>
          {[1, 2, 4].map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono border font-semibold ${
                speed === s ? "bg-gold-500 text-navy-950 border-gold-500 shadow-md" : "border-chalk/15 text-chalk/60 hover:bg-white/5"
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

        <div className="h-6 w-px bg-chalk/10" />

        <button
          onClick={() => router.push("/career")}
          disabled={!terminou}
          className="btn-primary px-8 py-2 rounded-lg font-display text-sm tracking-wide disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {terminou ? "CONTINUAR CARREIRA" : "SIMULANDO AO VIVO…"}
        </button>
      </div>

    </main>
  );
}

// Widget de Estatística com duas barras horizontais
function StatProgress({ label, a, b }) {
  const numA = Number(a) || 0;
  const numB = Number(b) || 0;
  const total = numA + numB || 1;
  const pctA = (numA / total) * 100;
  const pctB = 100 - pctA;

  return (
    <div>
      <div className="flex justify-between items-center text-xs font-mono mb-1 px-1">
        <span className="text-gold-400 font-bold w-12 text-left">{a}</span>
        <span className="text-chalk/45 uppercase text-[9px]">{label}</span>
        <span className="text-[#00FF87] font-bold w-12 text-right">{b}</span>
      </div>
      <div className="flex gap-1.5">
        <div className="stat-track flex-1">
          <div className="stat-fill stat-fill-alt ml-auto" style={{ width: `${pctA}%` }} />
        </div>
        <div className="stat-track flex-1">
          <div className="stat-fill" style={{ width: `${pctB}%` }} />
        </div>
      </div>
    </div>
  );
}

export default function MatchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-display text-2xl text-gold-400 bg-[#020712]">CARREGANDO PARTIDA...</div>}>
      <MatchInner />
    </Suspense>
  );
}
