"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadCareer, saveCareer } from "@/lib/storage";
import { getClubeEmQualquerDivisao as getTeam, DIVISOES } from "@/lib/divisions";
import { getTableSorted, startNewSeason, statusJogador } from "@/lib/engine";
import { POSITIONS, ATTRIBUTES, overallForPosition } from "@/lib/positions";
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
  const meuTimeRow = tabela.find((t) => t.teamId === career.player.clubeId);
  const posicaoTabela = tabela.findIndex((t) => t.teamId === career.player.clubeId) + 1;
  const proximaPartida = !temporadaAcabou ? career.schedule[career.rodada] : null;
  const partidaJogador = proximaPartida?.find(
    (m) => m.mandante === career.player.clubeId || m.visitante === career.player.clubeId
  );
  
  const time = getTeam(career.player.clubeId);
  const adversarioId = partidaJogador 
    ? (partidaJogador.mandante === career.player.clubeId ? partidaJogador.visitante : partidaJogador.mandante)
    : null;
  const adversario = adversarioId ? getTeam(adversarioId) : null;

  const carreira = career.player.carreira;
  const mediaNota = career.player.carreira.jogos > 0 
    ? (career.player.carreira.somaNotas / career.player.carreira.jogos).toFixed(1) 
    : "-";
  const status = statusJogador(career.player);
  const overall = overallForPosition(career.player.atributos, career.player.posicao);

  // Felicidade baseada na classificação do time (1º lugar = 95%, 20º = 30%)
  const felicidadeVal = Math.round(95 - (posicaoTabela - 1) * 3.4);

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

  return (
    <main className="min-h-screen max-w-6xl mx-auto px-4 pt-6 pb-28 relative z-10">
      
      {/* Luzes de Estádio */}
      <div className="stadium-light-beam stadium-light-left" />
      <div className="stadium-light-beam stadium-light-right" />

      {/* Cabeçalho principal */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-extrabold text-chalk uppercase tracking-wide">MODO CARREIRA</h1>
          <div className="font-mono text-[10px] md:text-xs text-gold-400 font-semibold tracking-wider">
            TEMPORADA: {career.temporada} · {temporadaAcabou ? "ENCERRADA" : "EM ANDAMENTO"}
          </div>
        </div>
        <button onClick={() => router.push("/")} className="text-xs font-mono text-chalk/40 hover:text-chalk border border-chalk/15 px-3 py-1.5 rounded-lg transition-colors">
          SAIR DO JOGO
        </button>
      </div>

      {/* Grid Dashboard principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUNA 1: Perfil do Jogador (Esquerda) */}
        <div className="flex flex-col gap-6">
          <div className="card overflow-hidden h-full flex flex-col justify-between">
            <div className="card-header">PERFIL DO ATLETA</div>
            <div className="p-6 flex-1 flex flex-col items-center justify-center text-center gap-4">
              
              {/* Avatar grande com bandeira */}
              <div className="relative">
                <PlayerAvatar nome={career.player.nome} cor={time.cor} customizacao={career.player.customizacao} size={110} />
                <span className="absolute bottom-0 right-1 text-2xl filter drop-shadow">🇧🇷</span>
              </div>

              <div>
                <h2 className="font-display text-2xl font-bold text-chalk uppercase tracking-wide">{career.player.nome}</h2>
                <p className="text-xs text-gold-400/90 font-mono font-semibold uppercase mt-0.5">{time.name}</p>
                <p className="text-[10px] text-chalk/35 font-mono">{DIVISOES[career.divisao]}</p>
              </div>

              {/* Box de stats gerais (Overall) */}
              <div className="w-full bg-[#050d1a] border border-gold-400/15 rounded-xl p-3 flex items-center justify-around">
                <div>
                  <span className="font-display text-2xl font-black text-gold-400">{overall}</span>
                  <span className="text-[9px] text-chalk/45 font-mono uppercase block">GERAL</span>
                </div>
                <div className="w-px h-8 bg-chalk/10" />
                <div>
                  <span className="font-display text-lg font-bold text-chalk">{POSITIONS[career.player.posicao].label}</span>
                  <span className="text-[9px] text-chalk/45 font-mono uppercase block">POSIÇÃO</span>
                </div>
                <div className="w-px h-8 bg-chalk/10" />
                <div>
                  <span className="font-display text-lg font-bold text-chalk">{career.player.idade}</span>
                  <span className="text-[9px] text-chalk/45 font-mono uppercase block">IDADE</span>
                </div>
              </div>

              <div className="flex gap-2 w-full mt-2">
                <span className={`flex-1 text-[11px] font-mono py-2 rounded-lg border text-center font-bold ${
                  status.cor === "green" ? "border-green-glow/30 bg-green-glow/10 text-green-glow" : "border-ember/30 bg-ember/10 text-ember"
                }`}>
                  STATUS: {status.texto}
                </span>
                <button
                  onClick={() => setModalOpen(true)}
                  className="btn-ghost flex-1 text-[11px] font-mono py-2 rounded-lg border border-gold-400/35 hover:bg-gold-500/10 text-gold-400 font-bold transition-all"
                >
                  PERSONALIZAR
                </button>
              </div>

            </div>
          </div>
        </div>

        {/* COLUNA 2: Resumo da Época e Treino (Centro) */}
        <div className="flex flex-col gap-6">
          {/* Resumo da Época */}
          <div className="card overflow-hidden">
            <div className="card-header">RESUMO DA ÉPOCA</div>
            <div className="p-5 space-y-4">
              <StatProgressWidget label="LIGA BRASILEIRA" value={`${posicaoTabela}º Lugar | ${meuTimeRow?.pts || 0} pts`} percent={Math.round((21 - posicaoTabela) / 20 * 100)} />
              <StatProgressWidget label="COPA NACIONAL" value={posicaoTabela <= 4 ? "Semifinalista" : posicaoTabela <= 10 ? "Oitavas de Final" : "Fase de Grupos"} percent={posicaoTabela <= 4 ? 80 : posicaoTabela <= 10 ? 55 : 30} />
              <StatProgressWidget label="SALDO ACUMULADO" value={`R$ ${(career.financas.saldoAcumulado || 0).toLocaleString("pt-BR")}`} percent={Math.min(100, Math.round((career.financas.saldoAcumulado || 0) / 1000000 * 100))} colorClass="stat-fill-alt" />
            </div>
          </div>

          {/* Treinamento */}
          <div className="card overflow-hidden flex-1">
            <div className="card-header flex justify-between">
              <span>TREINAMENTO</span>
              {career.focoTreino && <span className="text-[10px] font-mono text-gold-400 uppercase">Foco: {career.focoTreino}</span>}
            </div>
            <div className="p-5 flex flex-col justify-between h-[calc(100%-2.5rem)] gap-4">
              <div className="space-y-3">
                <StatBar label="Ritmo" val={career.player.atributos.ritmo} />
                <StatBar label="Finalização" val={career.player.atributos.finalizacao} />
                <StatBar label="Passe" val={career.player.atributos.passe} />
              </div>

              <button
                onClick={() => router.push("/treino")}
                className="btn-primary w-full py-3 rounded-lg font-display text-sm tracking-wide"
              >
                MELHORAR ATRIBUTOS
              </button>
            </div>
          </div>
        </div>

        {/* COLUNA 3: Próximo Jogo e Classificação Tabela (Direita) */}
        <div className="flex flex-col gap-6">
          {/* Próximo Jogo ou Convocação */}
          {career.convocacaoPendente ? (
            <div className="card border-gold-400 overflow-hidden bg-gradient-to-b from-yellow-500/5 to-transparent">
              <div className="card-header text-yellow-400">🇧🇷 DATA FIFA - SELEÇÃO BRASILEIRA</div>
              <div className="p-5 text-center">
                <div className="flex items-center justify-between mb-4 mt-2">
                  <div className="flex flex-col items-center gap-1.5 w-24">
                    <div className="w-14 h-14 rounded-full border-2 border-yellow-400 flex items-center justify-center bg-yellow-400 font-display text-navy-950 font-black text-base shadow-md">
                      BRA
                    </div>
                    <span className="text-[11px] text-center leading-tight text-gold-400 font-semibold">Brasil</span>
                  </div>
                  <span className="font-display text-xl text-gold-400 font-bold">VS</span>
                  <div className="flex flex-col items-center gap-1.5 w-24">
                    <div className="w-14 h-14 rounded-full border-2 border-chalk/15 flex items-center justify-center bg-chalk/10 font-display text-chalk/90 font-black text-base shadow-md">
                      {career.convocacaoPendente.adversario.slice(0,3).toUpperCase()}
                    </div>
                    <span className="text-[11px] text-center leading-tight text-chalk/70">{career.convocacaoPendente.adversario}</span>
                  </div>
                </div>
                <div className="text-xs font-mono text-chalk/45 uppercase tracking-wider mb-4">AMISTOSO INTERNACIONAL</div>
                <button
                  onClick={() => router.push("/match?selecao=true")}
                  className="btn-primary w-full py-3.5 rounded-lg font-display text-base tracking-wide bg-yellow-400 hover:bg-yellow-500 text-navy-950 shadow-[0_0_15px_rgba(244,196,48,0.4)]"
                >
                  JOGAR PELA SELEÇÃO
                </button>
              </div>
            </div>
          ) : temporadaAcabou ? (
            <div className="card overflow-hidden">
              <div className="card-header">TEMPORADA ENCERRADA</div>
              <div className="p-5 text-center">
                <p className="text-sm text-chalk/70 mb-4 leading-relaxed">
                  {time.name} terminou a temporada em {posicaoTabela}º lugar.
                </p>
                <button
                  onClick={avancarTemporada}
                  className="btn-primary w-full py-3.5 rounded-lg font-display text-base tracking-wide"
                >
                  INICIAR TEMPORADA {career.temporada + 1}
                </button>
              </div>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="card-header">PRÓXIMO JOGO</div>
              <div className="p-5">
                {partidaJogador && (
                  <div className="flex items-center justify-between mb-4">
                    {/* Time Casa */}
                    <div className="flex flex-col items-center gap-1.5 w-24">
                      <div className="w-14 h-14 crest" style={{ backgroundColor: getTeam(partidaJogador.mandante).cor, borderColor: partidaJogador.mandante === career.player.clubeId ? "#F4C430" : "rgba(242,246,241,0.15)" }}>
                        <span className="text-xs text-white/90 font-bold">{getTeam(partidaJogador.mandante).name.slice(0, 3).toUpperCase()}</span>
                      </div>
                      <span className={`text-[11px] text-center font-medium ${partidaJogador.mandante === career.player.clubeId ? "text-gold-400 font-semibold" : "text-chalk/75"}`}>{getTeam(partidaJogador.mandante).name}</span>
                    </div>

                    <span className="font-display text-xl text-gold-400 font-bold">VS</span>

                    {/* Time Fora */}
                    <div className="flex flex-col items-center gap-1.5 w-24">
                      <div className="w-14 h-14 crest" style={{ backgroundColor: getTeam(partidaJogador.visitante).cor, borderColor: partidaJogador.visitante === career.player.clubeId ? "#F4C430" : "rgba(242,246,241,0.15)" }}>
                        <span className="text-xs text-white/90 font-bold">{getTeam(partidaJogador.visitante).name.slice(0, 3).toUpperCase()}</span>
                      </div>
                      <span className={`text-[11px] text-center font-medium ${partidaJogador.visitante === career.player.clubeId ? "text-gold-400 font-semibold" : "text-chalk/75"}`}>{getTeam(partidaJogador.visitante).name}</span>
                    </div>
                  </div>
                )}
                
                <div className="text-center text-xs text-chalk/45 font-mono mb-4">
                  RODADA {career.rodada + 1}/38
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex gap-1.5">
                    {career.formaRecente.length === 0 ? (
                      <span className="text-[10px] text-chalk/30 font-mono uppercase">SEM HISTÓRICO</span>
                    ) : (
                      career.formaRecente.map((r, i) => (
                        <div key={i} className={`form-dot ${r === "V" ? "form-v" : r === "D" ? "form-d" : "form-e"}`}>
                          {r}
                        </div>
                      ))
                    )}
                  </div>
                  <button
                    onClick={() => router.push("/match")}
                    className="btn-primary px-6 py-2.5 rounded-lg font-display text-sm tracking-wide"
                  >
                    {status.texto === "Disponível" ? "PARTIDA" : "SIMULAR"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Equipe Principal / Tabela rápida */}
          <div className="card overflow-hidden flex-1">
            <div className="card-header">EQUIPE PRINCIPAL</div>
            <div className="p-4 flex flex-col justify-between h-[calc(100%-2.5rem)] gap-4">
              
              {/* Tabela dos top 4 */}
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="text-chalk/45 text-left border-b border-chalk/10 pb-1 uppercase text-[9px]">
                    <th className="pb-1 pl-1">#</th>
                    <th className="pb-1">TIME</th>
                    <th className="pb-1 text-center">PTS</th>
                    <th className="pb-1 text-center">SG</th>
                  </tr>
                </thead>
                <tbody>
                  {tabela.slice(0, 4).map((row, i) => {
                    const t = getTeam(row.teamId);
                    const isPlayer = row.teamId === career.player.clubeId;
                    return (
                      <tr key={row.teamId} className={`border-b border-chalk/5 ${isPlayer ? "text-gold-400 font-bold" : "text-chalk/70"}`}>
                        <td className="py-2 pl-1">{i + 1}</td>
                        <td className="py-2 truncate max-w-[120px]">{t.name}</td>
                        <td className="py-2 text-center font-bold">{row.pts}</td>
                        <td className="py-2 text-center">{row.gp - row.gc}</td>
                      </tr>
                    );
                  })}
                  {/* Se o time do jogador não estiver no top 4, renderiza ele como uma linha extra */}
                  {posicaoTabela > 4 && (
                    <>
                      <tr className="border-b border-chalk/5"><td colSpan={4} className="py-0.5 text-center text-chalk/20 text-[9px]">•••</td></tr>
                      <tr className="text-gold-400 font-bold">
                        <td className="py-2 pl-1">{posicaoTabela}</td>
                        <td className="py-2 truncate max-w-[120px]">{time.name}</td>
                        <td className="py-2 text-center font-bold">{meuTimeRow?.pts || 0}</td>
                        <td className="py-2 text-center">{meuTimeRow ? meuTimeRow.gp - meuTimeRow.gc : 0}</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>

              {/* Barra de Felicidade */}
              <div className="pt-2 border-t border-chalk/10">
                <div className="flex justify-between text-[10px] font-mono text-chalk/50 mb-1">
                  <span>😊 FELICIDADE</span>
                  <span className="font-bold text-green-glow">{felicidadeVal}%</span>
                </div>
                <div className="stat-track">
                  <div className="stat-fill" style={{ width: `${felicidadeVal}%` }} />
                </div>
              </div>

            </div>
          </div>
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

// Widget de Progresso Simples
function StatProgressWidget({ label, value, percent, colorClass = "stat-fill" }) {
  return (
    <div>
      <div className="flex justify-between items-center text-[10px] font-mono text-chalk/50 mb-1">
        <span>{label}</span>
        <span className="font-bold text-chalk/80">{value}</span>
      </div>
      <div className="stat-track">
        <div className={`stat-fill ${colorClass}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

// Barra de Atributo Simples
function StatBar({ label, val }) {
  return (
    <div>
      <div className="flex justify-between items-center text-xs font-mono mb-1">
        <span className="text-chalk/70">{label}</span>
        <span className="font-bold text-gold-400">{val}</span>
      </div>
      <div className="stat-track">
        <div className="stat-fill" style={{ width: `${val}%` }} />
      </div>
    </div>
  );
}
