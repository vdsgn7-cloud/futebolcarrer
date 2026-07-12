import { TEAMS, getTeam as getTeamSerieA } from "./teams";
import { overallForPosition, LINHAS_DE_PASSE, FORMATION_433 } from "./positions";
import { generateSchedule } from "./schedule";
import { gerarTitulares } from "./squad";
import { getTimesDaDivisao, getClubeEmQualquerDivisao, divisaoDoClube } from "./divisions";

const getTeam = getClubeEmQualquerDivisao;

const rand = (min, max) => Math.random() * (max - min) + min;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

// Amostra de uma distribuição de Poisson (algoritmo de Knuth) — usada
// pra gerar um número de gols "realista" a partir de uma média (lambda).
function poissonSample(lambda) {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > L);
  return k - 1;
}

function initialTableRow(teamId) {
  return { teamId, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, pts: 0 };
}

export function createInitialCareer(playerInfo) {
  const divisao = playerInfo.divisao || "A";
  const times = getTimesDaDivisao(divisao);
  const teamIds = times.map((t) => t.id);
  const schedule = generateSchedule(teamIds);
  const table = {};
  teamIds.forEach((id) => (table[id] = initialTableRow(id)));

  return {
    divisao,
    player: {
      nome: playerInfo.nome,
      nacionalidade: playerInfo.nacionalidade,
      posicao: playerInfo.posicao,
      idade: 17,
      clubeId: playerInfo.clubeId,
      atributos: playerInfo.atributos,
      customizacao: playerInfo.customizacao || null,
      carreira: { jogos: 0, gols: 0, assistencias: 0, somaNotas: 0 },
      cartoesAmarelos: 0, // acumulado na temporada corrente
      suspenso: false,
      lesao: null, // { rodadasRestantes, apelido }
      contrato: playerInfo.contrato || null, // { salario, temporadasRestantes }
    },
    financas: { saldoAcumulado: 0 },
    focoTreino: null, // atributo escolhido pra receber bônus de evolução na temporada
    formaRecente: [], // últimos resultados do clube do jogador: 'V' | 'E' | 'D'
    transferenciaPendente: null, // proposta aceita no Mercado, aplicada na próxima temporada
    temporada: 1,
    rodada: 0, // próxima rodada a ser jogada (index 0-based)
    schedule,
    table,
    historico: [], // resumo de partidas do jogador, temporada corrente
  };
}

// Retorna a "força" efetiva de ataque/defesa de um clube, já somando
// o efeito do jogador criado quando ele joga por esse clube (só quando
// ele está disponível pra jogar — suspenso/lesionado não conta).
function effectiveClubRatings(teamId, career, jogadorDisponivel) {
  const team = getTeam(teamId);
  let ataque = team.ataque;
  let defesa = team.defesa;

  if (teamId === career.player.clubeId && jogadorDisponivel) {
    const pos = career.player.posicao;
    const overall = overallForPosition(career.player.atributos, pos);
    const diff = overall - team.overall;
    const ataquePositions = ["ATA", "MEI", "LAT"];
    const defesaPositions = ["ZAG", "VOL", "GOL"];
    if (ataquePositions.includes(pos)) {
      ataque = clamp(ataque + diff * 0.18, 45, 99);
    }
    if (defesaPositions.includes(pos)) {
      defesa = clamp(defesa + diff * 0.18, 45, 99);
    }
  }

  return { ataque, defesa, overall: team.overall };
}

function isJogadorDisponivel(player) {
  if (player.suspenso) return false;
  if (player.lesao && player.lesao.rodadasRestantes > 0) return false;
  return true;
}

function expectedGoals(atkTeamId, defTeamId, career, isHome, jogadorDisponivel) {
  const atk = effectiveClubRatings(atkTeamId, career, jogadorDisponivel);
  const def = effectiveClubRatings(defTeamId, career, jogadorDisponivel);
  const base = 1.35;
  const diff = (atk.ataque - def.defesa) / 45;
  const homeMult = isHome ? 1.1 : 0.93;
  const lambda = base * Math.exp(diff) * homeMult;
  return clamp(lambda, 0.15, 4.2);
}

// Simulação rápida (só o placar) usada pra todas as partidas da rodada
// que não envolvem o clube do jogador.
export function simulateQuickMatch(mandanteId, visitanteId, career) {
  const lambdaA = expectedGoals(mandanteId, visitanteId, career, true, false);
  const lambdaB = expectedGoals(visitanteId, mandanteId, career, false, false);
  const golsMandante = poissonSample(lambdaA);
  const golsVisitante = poissonSample(lambdaB);
  return { golsMandante, golsVisitante };
}

function pickWeighted(items) {
  const total = items.reduce((s, i) => s + i.peso, 0);
  let r = rand(0, total);
  for (const item of items) {
    if (r < item.peso) return item;
    r -= item.peso;
  }
  return items[items.length - 1];
}

// Progresso "ofensivo" de cada slot da formação (0 = zaga/goleiro, 3 = ataque)
// — usado pra guiar a cadeia de passes sempre pra frente até o ataque.
const PROGRESSO_SLOT = [0, 0, 0, 1, 1, 1, 1, 2, 3, 3, 3];

// Gera uma cadeia de passes (índices de slot da FORMATION_433) começando
// no goleiro (slot 0) e caminhando pelas linhas de passe conectadas até
// alcançar o ataque (gol/chance) ou parar no meio-campo (buildup/jogada
// travada). É essa cadeia que o campo 2D usa pra animar a bola saltando
// de jogador em jogador — nunca "viajando" livre pelo campo.
function gerarCadeiaDePasses(tipo, favoreceSlot = null, bonusFavorecido = 0) {
  const alvoProgresso = tipo === "buildup" ? 2 : 3;
  const tamanhoMinimo = tipo === "buildup" ? 3 : 4;
  const cadeia = [0];
  let atual = 0;

  for (let passo = 0; passo < 12; passo++) {
    const vizinhos = LINHAS_DE_PASSE[atual];
    const anterior = cadeia.length > 1 ? cadeia[cadeia.length - 2] : null;
    let opcoes = vizinhos
      .filter((v) => v !== anterior)
      .map((v) => ({
        slot: v,
        peso: 1 + PROGRESSO_SLOT[v] * 1.8 + (v === favoreceSlot ? bonusFavorecido : 0),
      }));
    if (opcoes.length === 0) {
      opcoes = vizinhos.map((v) => ({ slot: v, peso: 1 }));
    }
    const escolhido = pickWeighted(opcoes).slot;
    cadeia.push(escolhido);
    atual = escolhido;
    if (atual === favoreceSlot && PROGRESSO_SLOT[atual] >= alvoProgresso - 1 && cadeia.length >= tamanhoMinimo - 1) break;
    if (PROGRESSO_SLOT[atual] >= alvoProgresso && cadeia.length >= tamanhoMinimo) break;
  }
  return cadeia;
}

// Constrói a "timeline" visual de uma partida: uma sequência de trechos
// (buildup / chance / gol) distribuídos ao longo de 90 minutos, cada um
// com uma cadeia de passes real entre jogadores da formação. Usada pelo
// componente de campo 2D pra animar.
function buildTimeline({ mandanteId, visitanteId, golsMandante, golsVisitante, career, jogadorDisponivel, meuSlot, timeDoJogador, atkOverride }) {
  const totalSequencias = Math.round(rand(20, 26));
  const golSequencias = [
    ...Array(golsMandante).fill("mandante"),
    ...Array(golsVisitante).fill("visitante"),
  ];
  const restantes = totalSequencias - golSequencias.length;

  const atkM = atkOverride ? atkOverride.mandante : effectiveClubRatings(mandanteId, career, jogadorDisponivel).ataque;
  const atkV = atkOverride ? atkOverride.visitante : effectiveClubRatings(visitanteId, career, jogadorDisponivel).ataque;
  const pesoM = atkM + 12; // leve vantagem de mando de campo na posse
  const pesoV = atkV;

  const outras = [];
  for (let i = 0; i < restantes; i++) {
    const lado = pickWeighted([
      { time: "mandante", peso: pesoM },
      { time: "visitante", peso: pesoV },
    ]).time;
    const tipo = Math.random() < 0.45 ? "chance" : "buildup";
    outras.push({ time: lado, tipo });
  }

  const sequencias = [
    ...golSequencias.map((time) => ({ time, tipo: "gol" })),
    ...outras,
  ];

  // embaralha
  for (let i = sequencias.length - 1; i > 0; i--) {
    const j = Math.floor(rand(0, i + 1));
    [sequencias[i], sequencias[j]] = [sequencias[j], sequencias[i]];
  }

  // distribui minutos crescentes com alguma folga, e anexa a cadeia de
  // passes de cada sequência — favorecendo o slot do jogador criado
  // proporcionalmente à qualidade dele, só nos lances do time dele.
  const overallJogador = jogadorDisponivel ? overallForPosition(career.player.atributos, career.player.posicao) : 0;
  const bonusFavorecido = clamp((overallJogador - 50) / 11, 0, 4.5);

  let minuto = 1;
  const passo = 90 / sequencias.length;
  const timeline = sequencias.map((s, idx) => {
    minuto = clamp(Math.round(1 + idx * passo + rand(-1.5, 1.5)), 1, 90);
    const favorece = jogadorDisponivel && s.time === timeDoJogador ? meuSlot : null;
    return { ...s, minuto, passes: gerarCadeiaDePasses(s.tipo, favorece, bonusFavorecido) };
  });
  timeline.sort((a, b) => a.minuto - b.minuto);

  return timeline;
}

// Descobre qual o slot (índice na FORMATION_433) que corresponde à posição
// do jogador criado — usado pra destacar só a bolinha certa em campo.
function slotDoJogador(posicao) {
  const idx = FORMATION_433.findIndex((s) => s.pos === posicao);
  return idx === -1 ? 7 : idx;
}

// Decide, para um gol do time do jogador, se ele foi o autor do gol,
// deu a assistência, ou não participou — com base na posição e overall.
function resolvePlayerInvolvement(career) {
  const pos = career.player.posicao;
  const overall = overallForPosition(career.player.atributos, pos);
  const chanceBase = clamp(overall / 220, 0.08, 0.5); // 0.08 a 0.5

  const golChance = { GOL: 0.0, ZAG: 0.03, LAT: 0.12, VOL: 0.1, MEI: 0.22, ATA: 0.55 }[pos];
  const assistChance = { GOL: 0.0, ZAG: 0.05, LAT: 0.22, VOL: 0.18, MEI: 0.32, ATA: 0.15 }[pos];

  const r = Math.random();
  if (r < golChance * (chanceBase * 2)) return "gol";
  if (r < golChance * (chanceBase * 2) + assistChance * (chanceBase * 2)) return "assistencia";
  return null;
}

const NOMES_GENERICOS = [
  "Marquinhos", "Léo", "Wesley", "Rafinha", "Douglas", "Ederson", "Kaique",
  "Bruno", "Vinícius", "Matheus", "Gustavo", "Renato", "Iago", "Caio",
];
function nomeGenerico() {
  return NOMES_GENERICOS[Math.floor(rand(0, NOMES_GENERICOS.length))];
}

// Chance de cartão pro jogador, por posição (defensores se expõem mais).
const CHANCE_CARTAO_POS = { GOL: 0.02, ZAG: 0.16, LAT: 0.12, VOL: 0.15, MEI: 0.08, ATA: 0.06 };

function nomeNoSlotFinal(seq, titularesMandante, titularesVisitante) {
  const titulares = seq.time === "mandante" ? titularesMandante : titularesVisitante;
  const slotFinal = seq.passes[seq.passes.length - 1];
  return titulares[slotFinal]?.nome ?? nomeGenerico();
}

// Resolve os gols de uma partida a partir da timeline (cadeias de passe):
// decide se o jogador marcou, deu assistência, ou não se envolveu em cada
// gol, usando o slot final (e penúltimo) da cadeia de passes de cada
// sequência. Devolve os eventos textuais e os totais do jogador na
// partida. Reaproveitado tanto pelas partidas da liga quanto pela
// partida-teste da peneira.
function resolverEventosDeGols({ timeline, career, timeDoJogador, minutoExpulsao, titularesMandante, titularesVisitante, meuSlot, nomeMandante, nomeVisitante }) {
  let golsJogador = 0;
  let assistJogador = 0;
  const eventos = [];

  for (const seq of timeline) {
    if (seq.tipo !== "gol") continue;
    const nomeTime = seq.time === "mandante" ? nomeMandante : nomeVisitante;
    const jogadorEmCampo = minutoExpulsao === null || seq.minuto < minutoExpulsao;
    const éSlotDoJogador = seq.passes[seq.passes.length - 1] === meuSlot;

    if (seq.time === timeDoJogador && jogadorEmCampo && éSlotDoJogador) {
      const envolvimento = resolvePlayerInvolvement(career);
      if (envolvimento === "gol") {
        golsJogador++;
        eventos.push({ minuto: seq.minuto, tipo: "gol", time: seq.time, texto: `⚽ GOL de ${career.player.nome}! (${nomeTime})` });
      } else if (envolvimento === "assistencia") {
        assistJogador++;
        const artilheiro = nomeNoSlotFinal(seq, titularesMandante, titularesVisitante);
        eventos.push({ minuto: seq.minuto, tipo: "gol", time: seq.time, texto: `⚽ Gol de ${artilheiro}, assistência de ${career.player.nome}! (${nomeTime})` });
      } else {
        eventos.push({ minuto: seq.minuto, tipo: "gol", time: seq.time, texto: `⚽ Gol de ${nomeNoSlotFinal(seq, titularesMandante, titularesVisitante)} (${nomeTime})` });
      }
    } else if (seq.time === timeDoJogador && jogadorEmCampo) {
      const slotPenultimo = seq.passes.length > 1 ? seq.passes[seq.passes.length - 2] : null;
      if (slotPenultimo === meuSlot && Math.random() < 0.6) {
        assistJogador++;
        eventos.push({ minuto: seq.minuto, tipo: "gol", time: seq.time, texto: `⚽ Gol de ${nomeNoSlotFinal(seq, titularesMandante, titularesVisitante)}, assistência de ${career.player.nome}! (${nomeTime})` });
      } else {
        eventos.push({ minuto: seq.minuto, tipo: "gol", time: seq.time, texto: `⚽ Gol de ${nomeNoSlotFinal(seq, titularesMandante, titularesVisitante)} (${nomeTime})` });
      }
    } else {
      eventos.push({ minuto: seq.minuto, tipo: "gol", time: seq.time, texto: `⚽ Gol de ${nomeNoSlotFinal(seq, titularesMandante, titularesVisitante)} (${nomeTime})` });
    }
  }

  return { eventos, golsJogador, assistJogador };
}

// Gera estatísticas plausíveis da partida (chutes, escanteios, faltas,
// cartões, posse) a partir das forças efetivas de cada time.
function gerarEstatisticas({ atkM, defM, atkV, defV, golsMandante, golsVisitante }) {
  const posseMandante = clamp(50 + (atkM - atkV) / 3.5 + rand(-4, 4), 28, 72);
  const posseVisitante = 100 - posseMandante;

  const chutesMandante = Math.max(golsMandante + 1, Math.round(6 + atkM / 11 + golsMandante * 1.3 + rand(-2, 3)));
  const chutesVisitante = Math.max(golsVisitante + 1, Math.round(6 + atkV / 11 + golsVisitante * 1.3 + rand(-2, 3)));
  const chutesGolMandante = clamp(golsMandante + Math.round(rand(1, 4)), golsMandante, chutesMandante);
  const chutesGolVisitante = clamp(golsVisitante + Math.round(rand(1, 4)), golsVisitante, chutesVisitante);

  const escanteiosMandante = Math.round(rand(2, 4) + atkM / 30);
  const escanteiosVisitante = Math.round(rand(2, 4) + atkV / 30);

  const faltasMandante = Math.round(rand(7, 14) + (defV - defM) / 15);
  const faltasVisitante = Math.round(rand(7, 14) + (defM - defV) / 15);

  const cartoesMandante = clamp(Math.round(faltasMandante / 6 + rand(-1, 1)), 0, 5);
  const cartoesVisitante = clamp(Math.round(faltasVisitante / 6 + rand(-1, 1)), 0, 5);

  return {
    mandante: {
      posse: Math.round(posseMandante),
      chutes: chutesMandante,
      chutesGol: chutesGolMandante,
      escanteios: escanteiosMandante,
      faltas: Math.max(0, faltasMandante),
      cartoesAmarelos: cartoesMandante,
    },
    visitante: {
      posse: Math.round(posseVisitante),
      chutes: chutesVisitante,
      chutesGol: chutesGolVisitante,
      escanteios: escanteiosVisitante,
      faltas: Math.max(0, faltasVisitante),
      cartoesAmarelos: cartoesVisitante,
    },
  };
}

// Simula a rodada inteira: a partida do jogador em detalhe (com timeline
// pro campo 2D) e todas as outras partidas de forma rápida. Atualiza a
// tabela e devolve tanto a carreira atualizada quanto os dados da partida
// do jogador pra tela de partida animar.
export function simulateRound(career) {
  const rodadaIdx = career.rodada;
  const partidas = career.schedule[rodadaIdx];
  const clubeId = career.player.clubeId;
  const table = JSON.parse(JSON.stringify(career.table));

  const jogadorDisponivel = isJogadorDisponivel(career.player);
  const motivoIndisponivel = career.player.suspenso
    ? "suspenso"
    : career.player.lesao && career.player.lesao.rodadasRestantes > 0
    ? "lesionado"
    : null;

  let partidaJogador = null;
  let resultadoJogador = null;

  for (const partida of partidas) {
    const envolveJogador = partida.mandante === clubeId || partida.visitante === clubeId;

    let golsMandante, golsVisitante;
    if (envolveJogador) {
      const lambdaM = expectedGoals(partida.mandante, partida.visitante, career, true, jogadorDisponivel);
      const lambdaV = expectedGoals(partida.visitante, partida.mandante, career, false, jogadorDisponivel);
      golsMandante = poissonSample(lambdaM);
      golsVisitante = poissonSample(lambdaV);
      partidaJogador = partida;
      resultadoJogador = { golsMandante, golsVisitante };
    } else {
      const r = simulateQuickMatch(partida.mandante, partida.visitante, career);
      golsMandante = r.golsMandante;
      golsVisitante = r.golsVisitante;
    }

    // atualiza tabela
    const m = table[partida.mandante];
    const v = table[partida.visitante];
    m.j++; v.j++;
    m.gp += golsMandante; m.gc += golsVisitante;
    v.gp += golsVisitante; v.gc += golsMandante;
    if (golsMandante > golsVisitante) { m.v++; m.pts += 3; v.d++; }
    else if (golsMandante < golsVisitante) { v.v++; v.pts += 3; m.d++; }
    else { m.e++; v.e++; m.pts += 1; v.pts += 1; }
  }

  const isHome = partidaJogador.mandante === clubeId;

  // se o jogador não pôde jogar, entrega um resultado "resumido" sem
  // timeline/animação — a tela de partida mostra só o placar final.
  if (!jogadorDisponivel) {
    const novoLesao = career.player.lesao
      ? { ...career.player.lesao, rodadasRestantes: Math.max(0, career.player.lesao.rodadasRestantes - 1) }
      : null;

    const resultadoTime = isHome
      ? resultadoJogador.golsMandante > resultadoJogador.golsVisitante ? "V" : resultadoJogador.golsMandante < resultadoJogador.golsVisitante ? "D" : "E"
      : resultadoJogador.golsVisitante > resultadoJogador.golsMandante ? "V" : resultadoJogador.golsVisitante < resultadoJogador.golsMandante ? "D" : "E";
    const novaRodada = career.rodada + 1;
    const playerAtualizado = {
      ...career.player,
      suspenso: false, // suspensão é sempre cumprida em 1 rodada
      lesao: novoLesao && novoLesao.rodadasRestantes > 0 ? novoLesao : null,
    };
    const convocacaoPendente = verificarConvocacao(playerAtualizado, novaRodada);

    const novaCareer = {
      ...career,
      table,
      rodada: novaRodada,
      formaRecente: [...career.formaRecente, resultadoTime].slice(-5),
      convocacaoPendente,
      player: playerAtualizado,
      historico: [
        ...career.historico,
        {
          rodada: rodadaIdx + 1,
          mandante: partidaJogador.mandante,
          visitante: partidaJogador.visitante,
          golsMandante: resultadoJogador.golsMandante,
          golsVisitante: resultadoJogador.golsVisitante,
          golsJogador: 0,
          assistJogador: 0,
          nota: null,
          jogou: false,
          motivo: motivoIndisponivel,
        },
      ],
    };

    return {
      career: novaCareer,
      partida: {
        mandanteId: partidaJogador.mandante,
        visitanteId: partidaJogador.visitante,
        isHome,
        golsMandante: resultadoJogador.golsMandante,
        golsVisitante: resultadoJogador.golsVisitante,
        jogadorJogou: false,
        motivoIndisponivel,
        timeline: [],
        eventos: [],
        estatisticas: null,
        golsJogador: 0,
        assistJogador: 0,
        nota: null,
      },
    };
  }

  const meuSlot = slotDoJogador(career.player.posicao);
  const timeDoJogador = isHome ? "mandante" : "visitante";

  const timeline = buildTimeline({
    mandanteId: partidaJogador.mandante,
    visitanteId: partidaJogador.visitante,
    golsMandante: resultadoJogador.golsMandante,
    golsVisitante: resultadoJogador.golsVisitante,
    career,
    jogadorDisponivel,
    meuSlot,
    timeDoJogador,
  });

  const titularesMandante = gerarTitulares(partidaJogador.mandante);
  const titularesVisitante = gerarTitulares(partidaJogador.visitante);

  // decide, ANTES de resolver os gols, se o jogador leva cartão e em que
  // minuto — pra podermos "desligar" o envolvimento dele depois da expulsão.
  const chanceCartao = CHANCE_CARTAO_POS[career.player.posicao] ?? 0.1;
  let minutoCartao = null;
  let tipoCartao = null; // 'amarelo' | 'vermelho'
  if (Math.random() < chanceCartao) {
    minutoCartao = Math.round(rand(5, 90));
    tipoCartao = Math.random() < 0.08 ? "vermelho" : "amarelo";
  }
  let minutoExpulsao = null;
  if (tipoCartao === "vermelho") minutoExpulsao = minutoCartao;

  const { eventos, golsJogador, assistJogador } = resolverEventosDeGols({
    timeline,
    career,
    timeDoJogador,
    minutoExpulsao,
    titularesMandante,
    titularesVisitante,
    meuSlot,
    nomeMandante: getTeam(partidaJogador.mandante).name,
    nomeVisitante: getTeam(partidaJogador.visitante).name,
  });

  if (tipoCartao) {
    const emoji = tipoCartao === "vermelho" ? "🟥" : "🟨";
    eventos.push({
      minuto: minutoCartao,
      tipo: "cartao",
      time: timeDoJogador,
      texto: `${emoji} Cartão ${tipoCartao} pra ${career.player.nome}`,
    });
  }

  // substituições de enfeite (não afetam a simulação, só o placar de eventos)
  if (Math.random() < 0.7) {
    const ladoSubs = Math.random() < 0.5 ? "mandante" : "visitante";
    const timeSubs = ladoSubs === "mandante" ? partidaJogador.mandante : partidaJogador.visitante;
    eventos.push({
      minuto: Math.round(rand(58, 82)),
      tipo: "substituicao",
      time: ladoSubs,
      texto: `🔄 Substituição no ${getTeam(timeSubs).name}`,
    });
  }

  eventos.sort((a, b) => a.minuto - b.minuto);

  // lesão: só rola se o jogador não foi expulso antes (senão já saiu de campo)
  let novaLesao = career.player.lesao;
  if (minutoExpulsao === null && Math.random() < 0.025) {
    const grave = Math.random() < 0.3;
    const rodadasRestantes = grave ? Math.round(rand(3, 6)) : Math.round(rand(1, 2));
    novaLesao = { rodadasRestantes, grave };
    eventos.push({
      minuto: Math.round(rand(10, 88)),
      tipo: "lesao",
      time: timeDoJogador,
      texto: `🩹 ${career.player.nome} sentiu uma lesão e desfalca o time por ${rodadasRestantes} rodada(s)`,
    });
    eventos.sort((a, b) => a.minuto - b.minuto);
  }

  // cartões amarelos acumulados -> suspensão automática ao bater 3
  let cartoesAmarelos = career.player.cartoesAmarelos;
  let suspensoProxima = false;
  if (tipoCartao === "amarelo") {
    cartoesAmarelos++;
    if (cartoesAmarelos >= 3) {
      suspensoProxima = true;
      cartoesAmarelos = 0;
    }
  } else if (tipoCartao === "vermelho") {
    suspensoProxima = true;
  }

  // nota do jogador na partida
  const vitoria = (isHome && resultadoJogador.golsMandante > resultadoJogador.golsVisitante) ||
                   (!isHome && resultadoJogador.golsVisitante > resultadoJogador.golsMandante);
  const empate = resultadoJogador.golsMandante === resultadoJogador.golsVisitante;
  const golsSofridos = isHome ? resultadoJogador.golsVisitante : resultadoJogador.golsMandante;

  let nota = 6.0 + golsJogador * 0.9 + assistJogador * 0.5;
  nota += vitoria ? 0.5 : empate ? 0.1 : -0.3;
  if (["GOL", "ZAG", "VOL"].includes(career.player.posicao) && golsSofridos === 0) nota += 0.5;
  if (tipoCartao === "vermelho") nota -= 1.2;
  else if (tipoCartao === "amarelo") nota -= 0.2;
  nota += rand(-0.3, 0.3);
  nota = clamp(Math.round(nota * 10) / 10, 3.0, 10.0);

  const ratingsM = effectiveClubRatings(partidaJogador.mandante, career, jogadorDisponivel);
  const ratingsV = effectiveClubRatings(partidaJogador.visitante, career, jogadorDisponivel);
  const estatisticas = gerarEstatisticas({
    atkM: ratingsM.ataque, defM: ratingsM.defesa,
    atkV: ratingsV.ataque, defV: ratingsV.defesa,
    golsMandante: resultadoJogador.golsMandante,
    golsVisitante: resultadoJogador.golsVisitante,
  });

  const novaRodada = career.rodada + 1;
  const playerAtualizado = {
    ...career.player,
    cartoesAmarelos,
    suspenso: suspensoProxima,
    lesao: novaLesao,
    carreira: {
      jogos: career.player.carreira.jogos + 1,
      gols: career.player.carreira.gols + golsJogador,
      assistencias: career.player.carreira.assistencias + assistJogador,
      somaNotas: career.player.carreira.somaNotas + nota,
    },
  };
  const convocacaoPendente = verificarConvocacao(playerAtualizado, novaRodada);

  const novaCareer = {
    ...career,
    table,
    rodada: novaRodada,
    formaRecente: [...career.formaRecente, vitoria ? "V" : empate ? "E" : "D"].slice(-5),
    convocacaoPendente,
    player: playerAtualizado,
    historico: [
      ...career.historico,
      {
        rodada: rodadaIdx + 1,
        mandante: partidaJogador.mandante,
        visitante: partidaJogador.visitante,
        golsMandante: resultadoJogador.golsMandante,
        golsVisitante: resultadoJogador.golsVisitante,
        golsJogador,
        assistJogador,
        nota,
        jogou: true,
        cartao: tipoCartao,
      },
    ],
  };

  return {
    career: novaCareer,
    partida: {
      mandanteId: partidaJogador.mandante,
      visitanteId: partidaJogador.visitante,
      isHome,
      golsMandante: resultadoJogador.golsMandante,
      golsVisitante: resultadoJogador.golsVisitante,
      jogadorJogou: true,
      timeline,
      titularesMandante,
      titularesVisitante,
      meuSlot,
      eventos,
      estatisticas,
      golsJogador,
      assistJogador,
      nota,
      cartao: tipoCartao,
      suspensoProxima,
      lesionado: novaLesao && novaLesao.rodadasRestantes > 0 ? novaLesao : null,
    },
  };
}

// Crescimento (ou declínio) de UM atributo ao virar a temporada, de
// acordo com a idade — jovens evoluem mais rápido, acima dos 30 o
// jogador tende a estagnar ou regredir levemente. O atributo escolhido
// como foco de treino da temporada recebe um bônus extra.
function calcularCrescimentoAtributo(idade, ehFoco) {
  let min, max;
  if (idade <= 21) { min = 0; max = 2; }
  else if (idade <= 25) { min = 0; max = 1; }
  else if (idade <= 29) { min = -1; max = 1; }
  else { min = -2; max = 0; }

  let delta = Math.round(rand(min, max));
  if (ehFoco) delta += Math.round(rand(1, 3));
  return delta;
}

// Encerra a temporada: o jogador envelhece 1 ano e seus atributos evoluem
// (ou regridem, se estiver ficando mais velho) — o foco de treino
// escolhido na aba TREINO ganha um bônus extra. Gera um novo calendário e
// zera a tabela pra próxima temporada.
export function startNewSeason(career) {
  // aplica transferência aceita no Mercado (se houver) antes de tudo
  const transferencia = career.transferenciaPendente;
  const divisao = transferencia ? transferencia.divisao : career.divisao;
  const clubeId = transferencia ? transferencia.clubeId : career.player.clubeId;
  const contrato = transferencia
    ? { salario: transferencia.salario, temporadasRestantes: transferencia.temporadasContrato }
    : career.player.contrato
    ? { ...career.player.contrato, temporadasRestantes: career.player.contrato.temporadasRestantes - 1 }
    : null;

  const times = getTimesDaDivisao(divisao);
  const teamIds = times.map((t) => t.id);
  const schedule = generateSchedule(teamIds);
  const table = {};
  teamIds.forEach((id) => (table[id] = initialTableRow(id)));

  const idade = career.player.idade + 1;
  const atributos = { ...career.player.atributos };
  for (const key of Object.keys(atributos)) {
    const delta = calcularCrescimentoAtributo(idade, key === career.focoTreino);
    atributos[key] = clamp(atributos[key] + delta, 1, 99);
  }

  // salário acumulado na temporada que terminou (12 "meses" simplificados)
  const salarioAcumulado = (career.player.contrato?.salario || 0) * 12;

  return {
    ...career,
    divisao,
    temporada: career.temporada + 1,
    rodada: 0,
    schedule,
    table,
    historico: [],
    focoTreino: null, // escolhe de novo a cada temporada
    transferenciaPendente: null,
    financas: {
      saldoAcumulado: career.financas.saldoAcumulado + salarioAcumulado,
    },
    player: {
      ...career.player,
      clubeId,
      contrato,
      idade,
      atributos,
      cartoesAmarelos: 0,
      suspenso: false,
      // lesões continuam entre temporadas (realista) — só zeram cartões
    },
  };
}

export function getTableSorted(career) {
  return Object.values(career.table).sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    const gdA = a.gp - a.gc;
    const gdB = b.gp - b.gc;
    if (gdB !== gdA) return gdB - gdA;
    return b.gp - a.gp;
  });
}

// Define o atributo em foco de treino pra temporada corrente — o efeito
// só é aplicado quando a temporada vira (ver startNewSeason). Pode ser
// trocado quantas vezes quiser antes disso.
export function definirFocoTreino(career, atributoKey) {
  return { ...career, focoTreino: atributoKey };
}

export function statusJogador(player) {
  if (player.suspenso) return { texto: "Suspenso", cor: "ember" };
  if (player.lesao && player.lesao.rodadasRestantes > 0) {
    return { texto: `Lesionado (${player.lesao.rodadasRestantes} rod.)`, cor: "ember" };
  }
  return { texto: "Disponível", cor: "green" };
}

// ---------------------------------------------------------------------
// Peneira, propostas de contrato e transferências
// ---------------------------------------------------------------------

// Simula a partida-teste da peneira: o jogador criado (ainda sem clube)
// joga por um "combinado" de testes contra uma escolinha regional. É a
// mesma engine visual da liga (cadeias de passe reais), só que os dois
// times são improvisados.
export function simulatePeneira(nome, atributos, posicao, customizacao) {
  const overallJogador = overallForPosition(atributos, posicao);
  const baseScratch = 52;
  const rivalOverall = 58;
  const ataquePositions = ["ATA", "MEI", "LAT"];
  let ataque = baseScratch;
  let defesa = baseScratch;
  const diff = overallJogador - baseScratch;
  if (ataquePositions.includes(posicao)) ataque = clamp(baseScratch + diff * 0.4, 25, 92);
  else defesa = clamp(baseScratch + diff * 0.4, 25, 92);

  const lambdaMeu = clamp(1.25 * Math.exp((ataque - rivalOverall) / 45), 0.2, 4);
  const lambdaRival = clamp(1.25 * Math.exp((rivalOverall - defesa) / 45), 0.2, 4);
  const golsMeu = poissonSample(lambdaMeu);
  const golsRival = poissonSample(lambdaRival);

  const meuSlot = slotDoJogador(posicao);
  const timeDoJogador = "mandante";
  const pseudoCareer = { player: { nome, atributos, posicao, clubeId: null, customizacao } };

  const timeline = buildTimeline({
    mandanteId: "peneira-voce",
    visitanteId: "peneira-rival",
    golsMandante: golsMeu,
    golsVisitante: golsRival,
    career: pseudoCareer,
    jogadorDisponivel: true,
    meuSlot,
    timeDoJogador,
    atkOverride: { mandante: ataque, visitante: rivalOverall },
  });

  const titularesMandante = gerarTitulares("peneira-voce", { overall: baseScratch, name: "Seu Combinado" });
  const titularesVisitante = gerarTitulares("peneira-rival", { overall: rivalOverall, name: "Escolinha Regional" });

  const { eventos, golsJogador, assistJogador } = resolverEventosDeGols({
    timeline,
    career: pseudoCareer,
    timeDoJogador,
    minutoExpulsao: null,
    titularesMandante,
    titularesVisitante,
    meuSlot,
    nomeMandante: "Seu Combinado",
    nomeVisitante: "Escolinha Regional",
  });

  let nota = 6.0 + golsJogador * 0.9 + assistJogador * 0.5;
  if (golsMeu > golsRival) nota += 0.5;
  else if (golsMeu === golsRival) nota += 0.1;
  else nota -= 0.2;
  nota += rand(-0.4, 0.5); // dia de peneira tem mais variância (nervosismo, sorte)
  nota = clamp(Math.round(nota * 10) / 10, 3.5, 10.0);

  return {
    golsMeu, golsRival, timeline, eventos, golsJogador, assistJogador, nota,
    titularesMandante, titularesVisitante, meuSlot, isHome: true,
    mandanteId: "peneira-voce", visitanteId: "peneira-rival",
    nomeMandante: "Seu Combinado", nomeVisitante: "Escolinha Regional",
  };
}

function salarioMensal(divisao, overallClube) {
  const faixas = { A: [12000, 90000], B: [4000, 22000], C: [1500, 8000], D: [600, 3000] };
  const limites = { A: [58, 90], B: [58, 72], C: [44, 58], D: [32, 46] };
  const [min, max] = faixas[divisao];
  const [omin, omax] = limites[divisao];
  const t = clamp((overallClube - omin) / (omax - omin), 0, 1);
  return Math.round((min + t * (max - min)) / 100) * 100;
}

// Monta propostas de contrato a partir de um índice de "reputação" (0-99)
// do jogador — clubes com força parecida com a reputação entram na lista
// de candidatos; times muito acima ou muito abaixo não aparecem.
function ofertasPorReputacao(reputacao, clubeAtualId) {
  const candidatos = [];
  for (const divisao of ["A", "B", "C", "D"]) {
    for (const time of getTimesDaDivisao(divisao)) {
      if (time.id === clubeAtualId) continue;
      const distancia = Math.abs(time.overall - reputacao);
      if (distancia <= 22) candidatos.push({ time, divisao, distancia });
    }
  }
  candidatos.sort((a, b) => a.distancia - b.distancia);

  const escolhidos = [];
  const usados = new Set();
  for (const c of candidatos) {
    if (escolhidos.length >= 4) break;
    if (usados.has(c.time.id)) continue;
    if (escolhidos.length === 0 || Math.random() < 0.55) {
      escolhidos.push(c);
      usados.add(c.time.id);
    }
  }
  while (escolhidos.length < 2) {
    const proximo = candidatos.find((c) => !usados.has(c.time.id));
    if (!proximo) break;
    escolhidos.push(proximo);
    usados.add(proximo.time.id);
  }

  return escolhidos
    .sort((a, b) => b.time.overall - a.time.overall)
    .map((c) => ({
      clubeId: c.time.id,
      nomeClube: c.time.name,
      divisao: c.divisao,
      overallClube: c.time.overall,
      salario: salarioMensal(c.divisao, c.time.overall),
      temporadasContrato: 1 + Math.floor(rand(0, 3)),
    }));
}

// Propostas pro jogador logo depois da peneira — a reputação inicial vem
// quase toda do desempenho na partida-teste, já que ele ainda não tem
// currículo nenhum.
export function gerarOfertasPeneira(atributos, posicao, notaPeneira) {
  const overallJogador = overallForPosition(atributos, posicao);
  const reputacao = clamp(overallJogador * 0.5 + (notaPeneira - 6) * 14, 10, 75);
  return ofertasPorReputacao(reputacao, null);
}

// Propostas pro jogador já em carreira — a reputação aqui reflete o
// overall atual e a média de notas da temporada.
export function gerarOfertasMercado(career) {
  const overall = overallForPosition(career.player.atributos, career.player.posicao);
  const mediaNota = career.player.carreira.jogos > 0
    ? career.player.carreira.somaNotas / career.player.carreira.jogos
    : 6.2;
  const reputacao = clamp(overall * 0.65 + (mediaNota - 6) * 10, 15, 99);
  return ofertasPorReputacao(reputacao, career.player.clubeId);
}

// Aceita uma proposta — o agente fecha o contrato, mas a mudança de
// clube só é efetivada na virada de temporada (ver startNewSeason).
export function aceitarOferta(career, oferta) {
  return { ...career, transferenciaPendente: oferta };
}

export function cancelarTransferenciaPendente(career) {
  return { ...career, transferenciaPendente: null };
}

// ---------------------------------------------------------------------
// Sistema de Convocações e Partidas de Seleção
// ---------------------------------------------------------------------

function verificarConvocacao(player, rodada) {
  if (rodada === 10 || rodada === 20 || rodada === 30 || rodada === 38) {
    const overall = overallForPosition(player.atributos, player.posicao);
    const mediaNota = player.carreira.jogos > 0
      ? player.carreira.somaNotas / player.carreira.jogos
      : 6.0;
    
    if (overall >= 72 && (player.carreira.jogos === 0 || mediaNota >= 6.8)) {
      const adversarios = ["Argentina", "Uruguai", "França", "Alemanha", "Itália"];
      const adversario = adversarios[Math.floor(rand(0, adversarios.length))];
      return { adversario };
    }
  }
  return null;
}

function obterTitularesBrasil(player) {
  const astros = [
    { nome: "Alisson", posicao: "GOL", overall: 87, numero: 1, customizacao: { pele: "#FFD1B3", cabeloCor: "#4A3B32", cabeloEstilo: "curto", chuteira: "#FFFFFF" } },
    { nome: "Marquinhos", posicao: "ZAG", overall: 85, numero: 3, customizacao: { pele: "#8D5524", cabeloCor: "#000000", cabeloEstilo: "curto", chuteira: "#000000" } },
    { nome: "G. Magalhães", posicao: "ZAG", overall: 84, numero: 4, customizacao: { pele: "#E0A96D", cabeloCor: "#000000", cabeloEstilo: "curto", chuteira: "#32CD32" } },
    { nome: "Guilherme Arana", posicao: "LAT", overall: 81, numero: 6, customizacao: { pele: "#E0A96D", cabeloCor: "#4A3B32", cabeloEstilo: "curto", chuteira: "#FF69B4" } },
    { nome: "Danilo", posicao: "LAT", overall: 78, numero: 2, customizacao: { pele: "#8D5524", cabeloCor: "#000000", cabeloEstilo: "curto", chuteira: "#000000" } },
    { nome: "B. Guimarães", posicao: "VOL", overall: 85, numero: 5, customizacao: { pele: "#FFD1B3", cabeloCor: "#B8860B", cabeloEstilo: "curto", chuteira: "#FFFFFF" } },
    { nome: "João Gomes", posicao: "VOL", overall: 80, numero: 15, customizacao: { pele: "#E0A96D", cabeloCor: "#000000", cabeloEstilo: "curto", chuteira: "#32CD32" } },
    { nome: "Lucas Paquetá", posicao: "MEI", overall: 82, numero: 8, customizacao: { pele: "#E0A96D", cabeloCor: "#4A3B32", cabeloEstilo: "curto", chuteira: "#FF69B4" } },
    { nome: "Vinícius Jr", posicao: "ATA", overall: 89, numero: 10, customizacao: { pele: "#5C3818", cabeloCor: "#000000", cabeloEstilo: "curto", chuteira: "#FF69B4" } },
    { nome: "Rodrygo", posicao: "ATA", overall: 86, numero: 11, customizacao: { pele: "#8D5524", cabeloCor: "#000000", cabeloEstilo: "curto", chuteira: "#FFD700" } },
    { nome: "Raphinha", posicao: "ATA", overall: 84, numero: 7, customizacao: { pele: "#E0A96D", cabeloCor: "#B8860B", cabeloEstilo: "curto", chuteira: "#FFFFFF" } }
  ];

  const meuSlot = slotDoJogador(player.posicao);
  const time = [...astros];
  time[meuSlot] = {
    nome: player.nome,
    posicao: player.posicao,
    overall: overallForPosition(player.atributos, player.posicao),
    numero: player.customizacao?.numero || 10,
    customizacao: player.customizacao || { pele: "#FFD1B3", cabeloCor: "#000000", cabeloEstilo: "curto", chuteira: "#FFFFFF" }
  };
  return time;
}

function obterTitularesRival(rival) {
  const rivalData = {
    "Argentina": [
      { nome: "E. Martínez", posicao: "GOL", overall: 86, customizacao: { pele: "#FFD1B3", cabeloCor: "#4A3B32", cabeloEstilo: "curto", chuteira: "#32CD32" } },
      { nome: "C. Romero", posicao: "ZAG", overall: 85, customizacao: { pele: "#FFD1B3", cabeloCor: "#000000", cabeloEstilo: "curto", chuteira: "#000000" } },
      { nome: "Otamendi", posicao: "ZAG", overall: 81, customizacao: { pele: "#E0A96D", cabeloCor: "#4A3B32", cabeloEstilo: "curto", chuteira: "#000000" } },
      { nome: "Tagliafico", posicao: "LAT", overall: 79, customizacao: { pele: "#FFD1B3", cabeloCor: "#000000", cabeloEstilo: "curto", chuteira: "#FFFFFF" } },
      { nome: "Molina", posicao: "LAT", overall: 79, customizacao: { pele: "#E0A96D", cabeloCor: "#4A3B32", cabeloEstilo: "curto", chuteira: "#32CD32" } },
      { nome: "De Paul", posicao: "VOL", overall: 83, customizacao: { pele: "#FFD1B3", cabeloCor: "#B8860B", cabeloEstilo: "curto", chuteira: "#FFD700" } },
      { nome: "Mac Allister", posicao: "VOL", overall: 84, customizacao: { pele: "#FFD1B3", cabeloCor: "#4A3B32", cabeloEstilo: "curto", chuteira: "#FFFFFF" } },
      { nome: "Enzo F.", posicao: "MEI", overall: 82, customizacao: { pele: "#FFD1B3", cabeloCor: "#4A3B32", cabeloEstilo: "curto", chuteira: "#FF69B4" } },
      { nome: "L. Messi", posicao: "ATA", overall: 88, customizacao: { pele: "#FFD1B3", cabeloCor: "#4A3B32", cabeloEstilo: "curto", chuteira: "#FFD700" } },
      { nome: "Lautaro M.", posicao: "ATA", overall: 87, customizacao: { pele: "#E0A96D", cabeloCor: "#000000", cabeloEstilo: "curto", chuteira: "#FFFFFF" } },
      { nome: "J. Álvarez", posicao: "ATA", overall: 84, customizacao: { pele: "#FFD1B3", cabeloCor: "#4A3B32", cabeloEstilo: "curto", chuteira: "#32CD32" } }
    ],
    "França": [
      { nome: "Maignan", posicao: "GOL", overall: 85, customizacao: { pele: "#5C3818", cabeloCor: "#000000", cabeloEstilo: "careca", chuteira: "#FFFFFF" } },
      { nome: "Saliba", posicao: "ZAG", overall: 87, customizacao: { pele: "#8D5524", cabeloCor: "#000000", cabeloEstilo: "curto", chuteira: "#000000" } },
      { nome: "Upamecano", posicao: "ZAG", overall: 82, customizacao: { pele: "#8D5524", cabeloCor: "#000000", cabeloEstilo: "curto", chuteira: "#FF69B4" } },
      { nome: "Theo H.", posicao: "LAT", overall: 85, customizacao: { pele: "#FFD1B3", cabeloCor: "#4A3B32", cabeloEstilo: "curto", chuteira: "#FFFFFF" } },
      { nome: "Koundé", posicao: "LAT", overall: 83, customizacao: { pele: "#8D5524", cabeloCor: "#000000", cabeloEstilo: "black", chuteira: "#32CD32" } },
      { nome: "Tchouaméni", posicao: "VOL", overall: 84, customizacao: { pele: "#8D5524", cabeloCor: "#000000", cabeloEstilo: "curto", chuteira: "#FFFFFF" } },
      { nome: "Camavinga", posicao: "VOL", overall: 83, customizacao: { pele: "#8D5524", cabeloCor: "#000000", cabeloEstilo: "longo", chuteira: "#FFD700" } },
      { nome: "Griezmann", posicao: "MEI", overall: 85, customizacao: { pele: "#FFD1B3", cabeloCor: "#B8860B", cabeloEstilo: "curto", chuteira: "#FF69B4" } },
      { nome: "K. Mbappé", posicao: "ATA", overall: 91, customizacao: { pele: "#8D5524", cabeloCor: "#000000", cabeloEstilo: "curto", chuteira: "#FF69B4" } },
      { nome: "Dembélé", posicao: "ATA", overall: 84, customizacao: { pele: "#8D5524", cabeloCor: "#000000", cabeloEstilo: "curto", chuteira: "#FFFFFF" } },
      { nome: "M. Thuram", posicao: "ATA", overall: 83, customizacao: { pele: "#8D5524", cabeloCor: "#000000", cabeloEstilo: "curto", chuteira: "#32CD32" } }
    ],
    "Alemanha": [
      { nome: "Ter Stegen", posicao: "GOL", overall: 86, customizacao: { pele: "#FFD1B3", cabeloCor: "#4A3B32", cabeloEstilo: "curto", chuteira: "#FFFFFF" } },
      { nome: "Rüdiger", posicao: "ZAG", overall: 86, customizacao: { pele: "#8D5524", cabeloCor: "#000000", cabeloEstilo: "careca", chuteira: "#000000" } },
      { nome: "Jonathan Tah", posicao: "ZAG", overall: 84, customizacao: { pele: "#8D5524", cabeloCor: "#000000", cabeloEstilo: "curto", chuteira: "#32CD32" } },
      { nome: "Raum", posicao: "LAT", overall: 80, customizacao: { pele: "#FFD1B3", cabeloCor: "#4A3B32", cabeloEstilo: "curto", chuteira: "#FFFFFF" } },
      { nome: "Kimmich", posicao: "LAT", overall: 84, customizacao: { pele: "#FFD1B3", cabeloCor: "#4A3B32", cabeloEstilo: "curto", chuteira: "#000000" } },
      { nome: "Andrich", posicao: "VOL", overall: 80, customizacao: { pele: "#FFD1B3", cabeloCor: "#D3D3D3", cabeloEstilo: "curto", chuteira: "#FFFFFF" } },
      { nome: "Gross", posicao: "VOL", overall: 80, customizacao: { pele: "#FFD1B3", cabeloCor: "#4A3B32", cabeloEstilo: "curto", chuteira: "#000000" } },
      { nome: "F. Wirtz", posicao: "MEI", overall: 87, customizacao: { pele: "#FFD1B3", cabeloCor: "#4A3B32", cabeloEstilo: "curto", chuteira: "#FF69B4" } },
      { nome: "J. Musiala", posicao: "ATA", overall: 87, customizacao: { pele: "#8D5524", cabeloCor: "#000000", cabeloEstilo: "curto", chuteira: "#FFFFFF" } },
      { nome: "K. Havertz", posicao: "ATA", overall: 84, customizacao: { pele: "#FFD1B3", cabeloCor: "#4A3B32", cabeloEstilo: "curto", chuteira: "#32CD32" } },
      { nome: "L. Sané", posicao: "ATA", overall: 83, customizacao: { pele: "#8D5524", cabeloCor: "#000000", cabeloEstilo: "curto", chuteira: "#FF69B4" } }
    ],
    "Uruguai": [
      { nome: "Rochet", posicao: "GOL", overall: 81, customizacao: { pele: "#E0A96D", cabeloCor: "#000000", cabeloEstilo: "curto", chuteira: "#FFFFFF" } },
      { nome: "R. Araújo", posicao: "ZAG", overall: 83, customizacao: { pele: "#8D5524", cabeloCor: "#000000", cabeloEstilo: "curto", chuteira: "#000000" } },
      { nome: "Giménez", posicao: "ZAG", overall: 80, customizacao: { pele: "#FFD1B3", cabeloCor: "#4A3B32", cabeloEstilo: "curto", chuteira: "#000000" } },
      { nome: "M. Olivera", posicao: "LAT", overall: 79, customizacao: { pele: "#FFD1B3", cabeloCor: "#000000", cabeloEstilo: "curto", chuteira: "#FFFFFF" } },
      { nome: "Nández", posicao: "LAT", overall: 78, customizacao: { pele: "#E0A96D", cabeloCor: "#4A3B32", cabeloEstilo: "curto", chuteira: "#32CD32" } },
      { nome: "Valverde", posicao: "VOL", overall: 87, customizacao: { pele: "#FFD1B3", cabeloCor: "#4A3B32", cabeloEstilo: "curto", chuteira: "#FFD700" } },
      { nome: "Ugarte", posicao: "VOL", overall: 82, customizacao: { pele: "#FFD1B3", cabeloCor: "#000000", cabeloEstilo: "curto", chuteira: "#FFFFFF" } },
      { nome: "Arrascaeta", posicao: "MEI", overall: 84, customizacao: { pele: "#E0A96D", cabeloCor: "#4A3B32", cabeloEstilo: "curto", chuteira: "#FF69B4" } },
      { nome: "De la Cruz", posicao: "MEI", overall: 83, customizacao: { pele: "#8D5524", cabeloCor: "#000000", cabeloEstilo: "curto", chuteira: "#FFFFFF" } },
      { nome: "Darwin Núñez", posicao: "ATA", overall: 82, customizacao: { pele: "#E0A96D", cabeloCor: "#4A3B32", cabeloEstilo: "longo", chuteira: "#FF69B4" } },
      { nome: "Pellistri", posicao: "ATA", overall: 77, customizacao: { pele: "#FFD1B3", cabeloCor: "#4A3B32", cabeloEstilo: "curto", chuteira: "#32CD32" } }
    ],
    "Itália": [
      { nome: "Donnarumma", posicao: "GOL", overall: 87, customizacao: { pele: "#FFD1B3", cabeloCor: "#4A3B32", cabeloEstilo: "curto", chuteira: "#FFFFFF" } },
      { nome: "Bastoni", posicao: "ZAG", overall: 86, customizacao: { pele: "#FFD1B3", cabeloCor: "#4A3B32", cabeloEstilo: "curto", chuteira: "#000000" } },
      { nome: "Calafiori", posicao: "ZAG", overall: 82, customizacao: { pele: "#FFD1B3", cabeloCor: "#4A3B32", cabeloEstilo: "longo", chuteira: "#FFFFFF" } },
      { nome: "Dimarco", posicao: "LAT", overall: 84, customizacao: { pele: "#FFD1B3", cabeloCor: "#B8860B", cabeloEstilo: "curto", chuteira: "#FF69B4" } },
      { nome: "Di Lorenzo", posicao: "LAT", overall: 80, customizacao: { pele: "#FFD1B3", cabeloCor: "#000000", cabeloEstilo: "curto", chuteira: "#000000" } },
      { nome: "Barella", posicao: "VOL", overall: 86, customizacao: { pele: "#FFD1B3", cabeloCor: "#4A3B32", cabeloEstilo: "curto", chuteira: "#FFD700" } },
      { nome: "Jorginho", posicao: "VOL", overall: 80, customizacao: { pele: "#FFD1B3", cabeloCor: "#000000", cabeloEstilo: "curto", chuteira: "#FFFFFF" } },
      { nome: "Pellegrini", posicao: "MEI", overall: 81, customizacao: { pele: "#FFD1B3", cabeloCor: "#4A3B32", cabeloEstilo: "curto", chuteira: "#32CD32" } },
      { nome: "Retegui", posicao: "ATA", overall: 79, customizacao: { pele: "#FFD1B3", cabeloCor: "#4A3B32", cabeloEstilo: "curto", chuteira: "#FFFFFF" } },
      { nome: "Chiesa", posicao: "ATA", overall: 82, customizacao: { pele: "#FFD1B3", cabeloCor: "#4A3B32", cabeloEstilo: "curto", chuteira: "#FF69B4" } },
      { nome: "Zaccagni", posicao: "ATA", overall: 79, customizacao: { pele: "#FFD1B3", cabeloCor: "#000000", cabeloEstilo: "curto", chuteira: "#32CD32" } }
    ]
  };

  const list = rivalData[rival] || rivalData["Argentina"];
  return list.map((p, idx) => ({
    id: `rival-${idx}`,
    nome: p.nome,
    posicao: p.posicao,
    nacionalidade: rival,
    overall: p.overall,
    numero: idx === 0 ? 1 : idx === 5 ? 5 : idx === 8 ? 10 : idx === 9 ? 9 : 2 + idx,
    customizacao: p.customizacao
  }));
}

export function simulateSelecaoRound(career) {
  const convocacao = career.convocacaoPendente;
  if (!convocacao) return null;

  const rival = convocacao.adversario;
  const isHome = Math.random() < 0.5;
  const mandanteName = isHome ? "Brasil" : rival;
  const visitanteName = isHome ? rival : "Brasil";
  const mandanteId = isHome ? "bra-selecao" : "rival-selecao";
  const visitanteId = isHome ? "rival-selecao" : "bra-selecao";
  
  const corBrasil = "#F5D105"; // Amarelo seleção
  const corRival = {
    "Argentina": "#75AADB",
    "Uruguai": "#0081C9",
    "França": "#0F2042",
    "Alemanha": "#FFFFFF",
    "Itália": "#0054A6"
  }[rival] || "#A0A0A0";

  const corMandante = isHome ? corBrasil : corRival;
  const corVisitante = isHome ? corRival : corBrasil;

  const timeDoJogador = isHome ? "mandante" : "visitante";
  
  const titularesBrasil = obterTitularesBrasil(career.player);
  const titularesRival = obterTitularesRival(rival);

  const overallJogador = overallForPosition(career.player.atributos, career.player.posicao);
  const baseBrasil = 84;
  const baseRival = { "Argentina": 85, "Uruguai": 81, "França": 86, "Alemanha": 84, "Itália": 82 }[rival] || 82;

  const diff = overallJogador - baseBrasil;
  const ataqueBrasil = clamp(baseBrasil + diff * 0.15, 60, 99);
  const defesaBrasil = clamp(baseBrasil + diff * 0.15, 60, 99);

  const ataqueRival = baseRival;
  const defesaRival = baseRival;

  const lambdaBrasil = clamp(1.4 * Math.exp((ataqueBrasil - defesaRival) / 45), 0.2, 4);
  const lambdaRival = clamp(1.4 * Math.exp((ataqueRival - defesaBrasil) / 45), 0.2, 4);

  const golsBrasil = poissonSample(lambdaBrasil);
  const golsRival = poissonSample(lambdaRival);

  const golsMandante = isHome ? golsBrasil : golsRival;
  const golsVisitante = isHome ? golsRival : golsBrasil;

  const meuSlot = slotDoJogador(career.player.posicao);
  const pseudoCareer = { player: career.player };

  const timeline = buildTimeline({
    mandanteId,
    visitanteId,
    golsMandante,
    golsVisitante,
    career: pseudoCareer,
    jogadorDisponivel: true,
    meuSlot,
    timeDoJogador,
    atkOverride: {
      mandante: isHome ? ataqueBrasil : ataqueRival,
      visitante: isHome ? ataqueRival : ataqueBrasil
    }
  });

  const { eventos, golsJogador, assistJogador } = resolverEventosDeGols({
    timeline,
    career: pseudoCareer,
    timeDoJogador,
    minutoExpulsao: null,
    titularesMandante: isHome ? titularesBrasil : titularesRival,
    titularesVisitante: isHome ? titularesRival : titularesBrasil,
    meuSlot,
    nomeMandante: mandanteName,
    nomeVisitante: visitanteName
  });

  // Nota do jogador
  const vitoria = golsBrasil > golsRival;
  const empate = golsBrasil === golsRival;
  let nota = 6.0 + golsJogador * 1.0 + assistJogador * 0.6;
  nota += vitoria ? 0.6 : empate ? 0.2 : -0.2;
  nota += rand(-0.3, 0.4);
  nota = clamp(Math.round(nota * 10) / 10, 4.0, 10.0);

  const estatisticas = gerarEstatisticas({
    atkM: isHome ? ataqueBrasil : ataqueRival,
    defM: isHome ? defesaBrasil : defesaRival,
    atkV: isHome ? ataqueRival : ataqueBrasil,
    defV: isHome ? defesaRival : defesaBrasil,
    golsMandante,
    golsVisitante
  });

  const novaCareer = {
    ...career,
    convocacaoPendente: null,
    player: {
      ...career.player,
      carreira: {
        jogos: career.player.carreira.jogos + 1,
        gols: career.player.carreira.gols + golsJogador,
        assistencias: career.player.carreira.assistencias + assistJogador,
        somaNotas: career.player.carreira.somaNotas + nota,
      }
    },
    historico: [
      ...career.historico,
      {
        rodada: `Data FIFA`,
        mandante: mandanteName,
        visitante: visitanteName,
        golsMandante,
        golsVisitante,
        golsJogador,
        assistJogador,
        nota,
        jogou: true,
        isSelecao: true
      }
    ]
  };

  return {
    career: novaCareer,
    partida: {
      mandanteId,
      visitanteId,
      isHome,
      golsMandante,
      golsVisitante,
      jogadorJogou: true,
      timeline,
      titularesMandante: isHome ? titularesBrasil : titularesRival,
      titularesVisitante: isHome ? titularesRival : titularesBrasil,
      meuSlot,
      eventos,
      estatisticas,
      golsJogador,
      assistJogador,
      nota,
      isSelecao: true,
      nomeMandante: mandanteName,
      nomeVisitante: visitanteName,
      corMandante,
      corVisitante
    }
  };
}
