"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadCareer, saveCareer } from "@/lib/storage";
import { getClubeEmQualquerDivisao as getTeam, DIVISOES } from "@/lib/divisions";
import { getTableSorted, startNewSeason, statusJogador } from "@/lib/engine";
import { POSITIONS, ATTRIBUTES } from "@/lib/positions";
import BottomNav from "@/components/BottomNav";
import PlayerAvatar from "@/components/PlayerAvatar";
import RadarChart from "@/components/RadarChart";

const PELE_OPTIONS = [
  { label: "Clara", value: "#FFD1B3" },
  { label: "Morena", value: "#E0A96D" },
  { label: "Negra", value: "#8D5524" },
  { label: "Escura", value: "#5C3818" }
];

const CABELO_ESTILOS = [
  { label: "Curto", value: "curto" },
  { label: "Longo", value: "longo" },
  { label: "Black Power", value: "black" },
  { label: "Careca", value: "careca" }
];

const CABELO_CORES = [
  { label: "Preto", value: "#000000" },
  { label: "Castanho", value: "#4A3B32" },
  { label: "Loiro", value: "#B8860B" },
  { label: "Ruivo", value: "#8B0000" },
  { label: "Platinado", value: "#D3D3D3" }
];

const CHUTEIRA_CORES = [
  { label: "Preto", value: "#000000" },
  { label: "Branco", value: "#FFFFFF" },
  { label: "Verde", value: "#32CD32" },
  { label: "Rosa", value: "#FF69B4" },
  { label: "Dourado", value: "#FFD700" }
];

export default function CareerHub() {
  const router = useRouter();
  const [career, setCareer] = useState(undefined);

  // Estados de Edição da Personalização
  const [modalOpen, setModalOpen] = useState(false);
  const [editNome, setEditNome] = useState("");
  const [editPele, setEditPele] = useState("#FFD1B3");
  const [editCabeloEstilo, setEditCabeloEstilo] = useState("curto");
  const [editCabeloCor, setEditCabeloCor] = useState("#000000");
  const [editChuteira, setEditChuteira] = useState("#FFFFFF");
  const [editNumero, setEditNumero] = useState(10);

  useEffect(() => {
    const c = loadCareer();
    if (!c) {
      router.replace("/");
      return;
    }
    setCareer(c);
    setEditNome(c.player.nome);
    setEditPele(c.player.customizacao?.pele || "#FFD1B3");
    setEditCabeloEstilo(c.player.customizacao?.cabeloEstilo || "curto");
    setEditCabeloCor(c.player.customizacao?.cabeloCor || "#000000");
    setEditChuteira(c.player.customizacao?.chuteira || "#FFFFFF");
    setEditNumero(c.player.customizacao?.numero || 10);
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

  function salvarPersonalizacao() {
    const nova = {
      ...career,
      player: {
        ...career.player,
        nome: editNome.trim(),
        customizacao: {
          pele: editPele,
          cabeloEstilo: editCabeloEstilo,
          cabeloCor: editCabeloCor,
          chuteira: editChuteira,
          numero: Number(editNumero)
        }
      }
    };
    saveCareer(nova);
    setCareer(nova);
    setModalOpen(false);
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
            <PlayerAvatar nome={career.player.nome} cor={time.cor} customizacao={career.player.customizacao} />
            <div className="text-xs text-chalk/60">{time.name}</div>
            <div className="text-[9px] text-chalk/35 font-mono">{DIVISOES[career.divisao]}</div>
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
            <button
              onClick={() => setModalOpen(true)}
              className="mt-1 text-[8px] font-mono border border-gold-400/30 text-gold-400 px-2 py-1 rounded hover:bg-gold-400/10 transition-colors"
            >
              PERSONALIZAR
            </button>
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

      {/* próximo jogo / convocação / fim de temporada */}
      {career.convocacaoPendente ? (
        <div className="card border-gold-400 overflow-hidden mb-3 bg-gradient-to-b from-yellow-500/5 to-transparent">
          <div className="card-header text-yellow-400 flex items-center justify-between">
            <span>🇧🇷 SELEÇÃO BRASILEIRA</span>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded-full border border-yellow-400/40 text-yellow-400 animate-pulse">CONVOCADO</span>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between mb-4 mt-2">
              {/* Brasil */}
              <div className="flex flex-col items-center gap-1.5 w-24">
                <div className="w-14 h-14 rounded-full border-2 border-yellow-400 flex items-center justify-center bg-yellow-400 font-display text-navy-950 font-bold text-base shadow-md">
                  BRA
                </div>
                <span className="text-[11px] text-center leading-tight text-gold-400 font-semibold">Brasil</span>
              </div>
              <span className="font-display text-xl text-gold-400">VS</span>
              {/* Adversário */}
              <div className="flex flex-col items-center gap-1.5 w-24">
                <div className="w-14 h-14 rounded-full border-2 border-chalk/15 flex items-center justify-center bg-chalk/10 font-display text-chalk/90 font-bold text-base shadow-md">
                  {career.convocacaoPendente.adversario.slice(0,3).toUpperCase()}
                </div>
                <span className="text-[11px] text-center leading-tight text-chalk/70">{career.convocacaoPendente.adversario}</span>
              </div>
            </div>
            <div className="text-center text-xs text-chalk/40 font-mono mb-4">
              AMISTOSO INTERNACIONAL
            </div>
            <button
              onClick={() => router.push("/match?selecao=true")}
              className="btn-primary w-full py-3 rounded-lg font-display text-lg tracking-wide bg-yellow-400 hover:bg-yellow-500 text-navy-950"
            >
              JOGAR PELA SELEÇÃO
            </button>
          </div>
        </div>
      ) : temporadaAcabou ? (
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
          <div className="card-header">PRÓXIMO JOGO</div>
          <div className="p-4">
            {partidaJogador && (
              <div className="flex items-center justify-between mb-3">
                <TimeChip teamId={partidaJogador.mandante} destaque={partidaJogador.mandante === career.player.clubeId} />
                <span className="font-display text-xl text-gold-400">VS</span>
                <TimeChip teamId={partidaJogador.visitante} destaque={partidaJogador.visitante === career.player.clubeId} />
              </div>
            )}
            <div className="text-center text-xs text-chalk/40 font-mono mb-4">
              RODADA {career.rodada + 1}/38
            </div>
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                {career.formaRecente.length === 0 ? (
                  <span className="text-[10px] text-chalk/30 font-mono">SEM HISTÓRICO</span>
                ) : (
                  career.formaRecente.map((r, i) => (
                    <div
                      key={i}
                      className={`form-dot ${r === "V" ? "form-v" : r === "D" ? "form-d" : "form-e"}`}
                    >
                      {r}
                    </div>
                  ))
                )}
              </div>
              <button
                onClick={() => router.push("/match")}
                className="btn-primary px-6 py-2.5 rounded-lg font-display text-base tracking-wide"
              >
                {status.texto === "Disponível" ? "PARTIDA" : "SIMULAR"}
              </button>
            </div>
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
        <div className="card-header">TABELA · {DIVISOES[career.divisao]}</div>
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

      {/* Modal de Personalização */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-sm max-h-[90vh] overflow-y-auto p-5 border-gold-400">
            <div className="card-header flex justify-between items-center mb-4">
              <span>PERSONALIZAR APARÊNCIA</span>
              <button onClick={() => setModalOpen(false)} className="text-xs text-chalk/40 hover:text-chalk font-mono">FECHAR</button>
            </div>
            
            <div className="flex flex-col items-center justify-center mb-4 gap-2">
              <PlayerAvatar nome={editNome} cor={time.cor} customizacao={{ pele: editPele, cabeloEstilo: editCabeloEstilo, cabeloCor: editCabeloCor, chuteira: editChuteira }} size={90} />
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-chalk/50 font-mono block mb-1">NOME</label>
                <input
                  value={editNome}
                  onChange={(e) => setEditNome(e.target.value)}
                  className="w-full bg-white/5 border border-chalk/15 rounded-lg px-3 py-2 text-chalk focus:outline-none focus:border-gold-500 text-sm"
                />
              </div>

              <div>
                <label className="text-[10px] text-chalk/50 font-mono block mb-1.5">TOM DE PELE</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {PELE_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      onClick={() => setEditPele(o.value)}
                      style={{ backgroundColor: o.value }}
                      className={`py-1 rounded-md text-[9px] font-semibold border text-navy-950 ${
                        editPele === o.value ? "border-gold-400 ring-1 ring-gold-400" : "border-transparent"
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] text-chalk/50 font-mono block mb-1.5">ESTILO DE CABELO</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {CABELO_ESTILOS.map((o) => (
                    <button
                      key={o.value}
                      onClick={() => setEditCabeloEstilo(o.value)}
                      className={`py-1.5 rounded-md text-[9px] font-semibold border transition-colors ${
                        editCabeloEstilo === o.value
                          ? "bg-gold-500 border-gold-500 text-navy-950"
                          : "bg-white/5 border-chalk/15 text-chalk/70 hover:bg-white/10"
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] text-chalk/50 font-mono block mb-1.5">COR DE CABELO</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {CABELO_CORES.map((o) => (
                    <button
                      key={o.value}
                      onClick={() => setEditCabeloCor(o.value)}
                      className={`py-1 rounded-md text-[8px] font-semibold border transition-colors ${
                        editCabeloCor === o.value
                          ? "bg-gold-500 border-gold-500 text-navy-950"
                          : "bg-white/5 border-chalk/15 text-chalk/70 hover:bg-white/10"
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] text-chalk/50 font-mono block mb-1.5">COR DA CHUTEIRA</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {CHUTEIRA_CORES.map((o) => (
                    <button
                      key={o.value}
                      onClick={() => setEditChuteira(o.value)}
                      className={`py-1.5 rounded-md text-[8px] font-semibold border transition-colors ${
                        editChuteira === o.value
                          ? "bg-gold-500 border-gold-500 text-navy-950"
                          : "bg-white/5 border-chalk/15 text-chalk/70 hover:bg-white/10"
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] text-chalk/50 font-mono block mb-1">NÚMERO DA CAMISA</label>
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={editNumero}
                  onChange={(e) => setEditNumero(Math.max(1, Math.min(99, Number(e.target.value) || 10)))}
                  className="w-20 bg-white/5 border border-chalk/15 rounded-lg px-3 py-1.5 text-chalk focus:outline-none focus:border-gold-500 text-sm"
                />
              </div>

              <button
                onClick={salvarPersonalizacao}
                className="btn-primary w-full py-3 rounded-lg font-display text-base tracking-wide mt-4"
              >
                SALVAR ALTERAÇÕES
              </button>
            </div>
          </div>
        </div>
      )}
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
    <div className="flex flex-col items-center gap-1.5 w-24">
      <div
        className="w-14 h-14 crest"
        style={{ background: time.cor, borderColor: destaque ? "#F4C430" : "rgba(242,246,241,0.15)" }}
      >
        <span className="text-xs text-white/90" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>
          {time.name.slice(0, 3).toUpperCase()}
        </span>
      </div>
      <span className={`text-[11px] text-center leading-tight ${destaque ? "text-gold-400" : "text-chalk/70"}`}>
        {time.name}
      </span>
    </div>
  );
}
