"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadCareer, saveCareer } from "@/lib/storage";
import { getTeam } from "@/lib/teams";
import { getTableSorted, startNewSeason } from "@/lib/engine";
import { POSITIONS } from "@/lib/positions";

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

  if (career === undefined) return null;
  if (!career) return null;

  const temporadaAcabou = career.rodada >= 38;
  const tabela = getTableSorted(career);
  const posicaoTabela = tabela.findIndex((t) => t.teamId === career.player.clubeId) + 1;
  const proximaPartida = !temporadaAcabou ? career.schedule[career.rodada] : null;
  const partidaJogador = proximaPartida?.find(
    (m) => m.mandante === career.player.clubeId || m.visitante === career.player.clubeId
  );

  const carreira = career.player.carreira;
  const mediaNota = carreira.jogos > 0 ? (carreira.somaNotas / carreira.jogos).toFixed(1) : "-";

  function avancarTemporada() {
    const nova = startNewSeason(career);
    saveCareer(nova);
    setCareer(nova);
  }

  return (
    <main className="min-h-screen max-w-md mx-auto px-5 py-8 pb-16">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="font-mono text-xs text-gold-400/80 tracking-widest">
            TEMPORADA {career.temporada}
          </div>
          <h1 className="font-display text-3xl">{career.player.nome}</h1>
        </div>
        <button onClick={() => router.push("/")} className="text-xs text-chalk/40 hover:text-chalk">
          ← menu
        </button>
      </div>

      {/* player card */}
      <div className="card p-4 mb-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-chalk/60">
              {getTeam(career.player.clubeId)?.name} · {POSITIONS[career.player.posicao].label}
            </div>
            <div className="text-xs text-chalk/40">
              {career.player.nacionalidade} · {career.player.idade} anos
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-xs text-chalk/40">MÉDIA</div>
            <div className="font-display text-2xl text-gold-400">{mediaNota}</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4 text-center">
          <div>
            <div className="font-display text-xl">{carreira.jogos}</div>
            <div className="text-[10px] text-chalk/40 font-mono">JOGOS</div>
          </div>
          <div>
            <div className="font-display text-xl">{carreira.gols}</div>
            <div className="text-[10px] text-chalk/40 font-mono">GOLS</div>
          </div>
          <div>
            <div className="font-display text-xl">{carreira.assistencias}</div>
            <div className="text-[10px] text-chalk/40 font-mono">ASSISTÊNCIAS</div>
          </div>
        </div>
      </div>

      {temporadaAcabou ? (
        <div className="card p-5 mb-5 text-center">
          <div className="font-display text-2xl text-gold-400 mb-1">TEMPORADA ENCERRADA</div>
          <div className="text-sm text-chalk/60 mb-4">
            {getTeam(career.player.clubeId)?.name} terminou em {posicaoTabela}º lugar.
          </div>
          <button
            onClick={avancarTemporada}
            className="btn-primary w-full py-3 rounded-lg font-display text-lg tracking-wide"
          >
            INICIAR TEMPORADA {career.temporada + 1}
          </button>
        </div>
      ) : (
        <div className="card p-4 mb-5">
          <div className="font-mono text-xs text-chalk/50 mb-2">
            RODADA {career.rodada + 1}/38
          </div>
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
            SIMULAR PARTIDA
          </button>
        </div>
      )}

      {/* tabela */}
      <div className="card p-4">
        <div className="font-display text-lg text-gold-400 mb-3 tracking-wide">TABELA</div>
        <div className="overflow-x-auto">
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
                const time = getTeam(row.teamId);
                const isPlayer = row.teamId === career.player.clubeId;
                return (
                  <tr
                    key={row.teamId}
                    className={`border-t border-chalk/5 ${isPlayer ? "text-gold-400" : "text-chalk/70"}`}
                  >
                    <td className="py-1.5 pl-1">{i + 1}</td>
                    <td className="py-1.5 truncate max-w-[110px]">{time.name}</td>
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
    </main>
  );
}

function TimeChip({ teamId, destaque }) {
  const time = getTeam(teamId);
  return (
    <div className="flex flex-col items-center gap-1 w-24">
      <div
        className="w-8 h-8 rounded-full border-2"
        style={{ background: time.cor, borderColor: destaque ? "#e8c468" : "rgba(242,246,241,0.15)" }}
      />
      <span className={`text-[11px] text-center leading-tight ${destaque ? "text-gold-400" : "text-chalk/70"}`}>
        {time.name}
      </span>
    </div>
  );
}
