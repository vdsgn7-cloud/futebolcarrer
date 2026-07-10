"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadCareer, saveCareer } from "@/lib/storage";
import { getTeam } from "@/lib/teams";
import { getTableSorted, startNewSeason, statusJogador } from "@/lib/engine";
import { POSITIONS, ATTRIBUTES } from "@/lib/positions";
import BottomNav from "@/components/BottomNav";
import PlayerAvatar from "@/components/PlayerAvatar";
import RadarChart from "@/components/RadarChart";

export default function CareerHub() {
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

  const temporadaAcabou = career.rodada >= 38;
  const tabela = getTableSorted(career);
  const posicaoTabela = tabela.findIndex((t) => t.teamId === career.player.clubeId) + 1;
  const proximaPartida = !temporadaAcabou ? career.schedule[career.rodada] : null;
  const partidaJogador = proximaPartida?.find(
    (m) => m.mandante === career.player.clubeId || m.visitante === career.player.clubeId
  );
  const time = getTeam(career.player.clubeId);
  const carreira = career.player.carreira;
  const mediaNota = carreira.jogos > 0 ? (carreira.somaNotas / carreira.jogos).toFixed(1) : "-";
  const status = statusJogador(career.player);

  function avancarTemporada() {
    const nova = startNewSeason(career);
    saveCareer(nova);
    setCareer(nova);
  }

  const radarData = ATTRIBUTES.map((a) => ({
    label: a.label.slice(0, 3).toUpperCase(),
    value: career.player.atributos[a.key],
  }));

  return (
    <main className="min-h-screen max-w-md mx-auto px-4 pt-6 pb-28">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="font-mono text-[10px] tracking-[0.25em] text-gold-400/80">
            MODO CARREIRA · TEMPORADA {career.temporada}
          </div>
          <h1 className="font-display text-3xl leading-tight">{career.player.nome}</h1>
        </div>
        <button onClick={() => router.push("/")} className="text-[10px] font-mono text-chalk/40 hover:text-chalk">
          SAIR
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* player card */}
        <div className="card overflow-hidden">
          <div className="card-header">JOGADOR</div>
          <div className="p-4 flex flex-col items-center text-center gap-2">
            <PlayerAvatar nome={career.player.nome} cor={time.cor} />
            <div className="text-xs text-chalk/60">{time.name}</div>
            <div className="text-[10px] text-chalk/40">
              {POSITIONS[career.player.posicao].label} · {career.player.idade} anos
            </div>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                status.cor === "green"
                  ? "border-green-glow/40 text-green-glow"
                  : "border-ember/40 text-ember"
              }`}
            >
              {status.texto}
            </span>
          </div>
        </div>

        {/* resumo da temporada */}
        <div className="card overflow-hidden">
          <div className="card-header">RESUMO</div>
          <div className="p-4 flex flex-col gap-3 justify-center h-[calc(100%-2.5rem)]">
            <div>
              <div className="text-[10px] text-chalk/40 font-mono">POSIÇÃO NA LIGA</div>
              <div className="font-display text-xl text-gold-400">{posicaoTabela}º lugar</div>
            </div>
            <div>
              <div className="text-[10px] text-chalk/40 font-mono">MÉDIA DE NOTA</div>
              <div className="font-display text-xl">{mediaNota}</div>
            </div>
          </div>
        </div>
      </div>

      {/* próximo jogo / fim de temporada */}
      {temporadaAcabou ? (
        <div className="card overflow-hidden mb-3">
          <div className="card-header">TEMPORADA ENCERRADA</div>
          <div className="p-4 text-center">
            <div className="text-sm text-chalk/60 mb-4">
              {time.name} terminou a temporada {career.temporada} em {posicaoTabela}º lugar.
            </div>
            <button
              onClick={avancarTemporada}
              className="btn-primary w-full py-3 rounded-lg font-display text-lg tracking-wide"
            >
              INICIAR TEMPORADA {career.temporada + 1}
            </button>
          </div>
        </div>
      ) : (
        <div className="card overflow-hidden mb-3">
          <div className="card-header">PRÓXIMO JOGO · RODADA {career.rodada + 1}/38</div>
          <div className="p-4">
            {partidaJogador && (
              <div className="flex items-center justify-between mb-4">
                <TimeChip teamId={partidaJogador.mandante} destaque={partidaJogador.mandante === career.player.clubeId} />
                <span className="font-display text-lg text-chalk/40">vs</span>
                <TimeChip teamId={partidaJogador.visitante} destaque={partidaJogador.visitante === career.player.clubeId} />
              </div>
            )}
            <button
              onClick={() => router.push("/match")}
              className="btn-primary w-full py-3.5 rounded-lg font-display text-lg tracking-wide"
            >
              {status.texto === "Disponível" ? "SIMULAR PARTIDA" : "SIMULAR (SEM O JOGADOR)"}
            </button>
          </div>
        </div>
      )}

      {/* desempenho / radar */}
      <div className="card overflow-hidden mb-3">
        <div className="card-header">DESEMPENHO DO JOGADOR</div>
        <div className="p-4 flex items-center gap-3">
          <RadarChart data={radarData} size={150} />
          <div className="flex-1 grid grid-cols-2 gap-y-3 text-center">
            <Stat label="JOGOS" value={carreira.jogos} />
            <Stat label="GOLS" value={carreira.gols} />
            <Stat label="ASSIST." value={carreira.assistencias} />
            <Stat label="AMARELOS" value={career.player.cartoesAmarelos} />
          </div>
        </div>
      </div>

      {/* tabela */}
      <div className="card overflow-hidden">
        <div className="card-header">TABELA · SÉRIE A</div>
        <div className="p-4 overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="text-chalk/40 text-left">
                <th className="pb-2 pl-1">#</th>
                <th className="pb-2">TIME</th>
                <th className="pb-2 text-center">P</th>
                <th className="pb-2 text-center">J</th>
                <th className="pb-2 text-center">SG</th>
              </tr>
            </thead>
            <tbody>
              {tabela.map((row, i) => {
                const t = getTeam(row.teamId);
                const isPlayer = row.teamId === career.player.clubeId;
                return (
                  <tr
                    key={row.teamId}
                    className={`border-t border-chalk/5 ${isPlayer ? "text-gold-400" : "text-chalk/70"}`}
                  >
                    <td className="py-1.5 pl-1">{i + 1}</td>
                    <td className="py-1.5 truncate max-w-[110px]">{t.name}</td>
                    <td className="py-1.5 text-center font-semibold">{row.pts}</td>
                    <td className="py-1.5 text-center">{row.j}</td>
                    <td className="py-1.5 text-center">{row.gp - row.gc}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <BottomNav />
    </main>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="font-display text-xl text-gold-400">{value}</div>
      <div className="text-[9px] text-chalk/40 font-mono">{label}</div>
    </div>
  );
}

function TimeChip({ teamId, destaque }) {
  const time = getTeam(teamId);
  return (
    <div className="flex flex-col items-center gap-1 w-24">
      <div
        className="w-8 h-8 crest"
        style={{ background: time.cor, borderColor: destaque ? "#e8c468" : "rgba(242,246,241,0.15)" }}
      />
      <span className={`text-[11px] text-center leading-tight ${destaque ? "text-gold-400" : "text-chalk/70"}`}>
        {time.name}
      </span>
    </div>
  );
}
