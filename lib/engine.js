import { TEAMS, getTeam } from "./teams";
import { POSITIONS, overallForPosition } from "./positions";
import { generateSchedule } from "./schedule";

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
  const teamIds = TEAMS.map((t) => t.id);
  const schedule = generateSchedule(teamIds);
  const table = {};
  teamIds.forEach((id) => (table[id] = initialTableRow(id)));

  return {
    player: {
      nome: playerInfo.nome,
      nacionalidade: playerInfo.nacionalidade,
      posicao: playerInfo.posicao,
      idade: 17,
      clubeId: playerInfo.clubeId,
      atributos: playerInfo.atributos,
      carreira: { jogos: 0, gols: 0, assistencias: 0, somaNotas: 0 },
    },
    temporada: 1,
    rodada: 0, // próxima rodada a ser jogada (index 0-based)
    schedule,
    table,
    historico: [], // resumo de partidas do jogador, temporada corrente
  };
}

// Retorna a "força" efetiva de ataque/defesa de um clube, já somando
// o efeito do jogador criado quando ele joga por esse clube.
function effectiveClubRatings(teamId, career) {
  const team = getTeam(teamId);
  let ataque = team.ataque;
  let defesa = team.defesa;

  if (teamId === career.player.clubeId) {
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

function expectedGoals(atkTeamId, defTeamId, career, isHome) {
  const atk = effectiveClubRatings(atkTeamId, career);
  const def = effectiveClubRatings(defTeamId, career);
  const base = 1.35;
  const diff = (atk.ataque - def.defesa) / 45;
  const homeMult = isHome ? 1.1 : 0.93;
  const lambda = base * Math.exp(diff) * homeMult;
  return clamp(lambda, 0.15, 4.2);
}

// Simulação rápida (só o placar) usada pra todas as partidas da rodada
// que não envolvem o clube do jogador.
export function simulateQuickMatch(mandanteId, visitanteId, career) {
  const lambdaA = expectedGoals(mandanteId, visitanteId, career, true);
  const lambdaB = expectedGoals(visitanteId, mandanteId, career, false);
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

// Constrói a "timeline" visual de uma partida: uma sequência de trechos
// (buildup / chance / gol) distribuídos ao longo de 90 minutos, cada um
// atribuído a um time. Usada pelo componente de campo 2D pra animar.
function buildTimeline({ mandanteId, visitanteId, golsMandante, golsVisitante, career }) {
  const totalSequencias = Math.round(rand(20, 26));
  const golSequencias = [
    ...Array(golsMandante).fill("mandante"),
    ...Array(golsVisitante).fill("visitante"),
  ];
  const restantes = totalSequencias - golSequencias.length;

  const atkM = effectiveClubRatings(mandanteId, career).ataque;
  const atkV = effectiveClubRatings(visitanteId, career).ataque;
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

  // distribui minutos crescentes com alguma folga
  let minuto = 1;
  const passo = 90 / sequencias.length;
  const timeline = sequencias.map((s, idx) => {
    minuto = clamp(Math.round(1 + idx * passo + rand(-1.5, 1.5)), 1, 90);
    return { ...s, minuto };
  });
  timeline.sort((a, b) => a.minuto - b.minuto);

  return timeline;
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

// Simula a rodada inteira: a partida do jogador em detalhe (com timeline
// pro campo 2D) e todas as outras partidas de forma rápida. Atualiza a
// tabela e devolve tanto a carreira atualizada quanto os dados da partida
// do jogador pra tela de partida animar.
export function simulateRound(career) {
  const rodadaIdx = career.rodada;
  const partidas = career.schedule[rodadaIdx];
  const clubeId = career.player.clubeId;
  const table = JSON.parse(JSON.stringify(career.table));

  let partidaJogador = null;
  let resultadoJogador = null;

  for (const partida of partidas) {
    const envolveJogador = partida.mandante === clubeId || partida.visitante === clubeId;

    let golsMandante, golsVisitante;
    if (envolveJogador) {
      const lambdaM = expectedGoals(partida.mandante, partida.visitante, career, true);
      const lambdaV = expectedGoals(partida.visitante, partida.mandante, career, false);
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
  const timeline = buildTimeline({
    mandanteId: partidaJogador.mandante,
    visitanteId: partidaJogador.visitante,
    golsMandante: resultadoJogador.golsMandante,
    golsVisitante: resultadoJogador.golsVisitante,
    career,
  });

  // resolve envolvimento do jogador em cada gol do próprio time
  let golsJogador = 0;
  let assistJogador = 0;
  const eventos = [];
  const timeDoJogador = isHome ? "mandante" : "visitante";

  for (const seq of timeline) {
    if (seq.tipo !== "gol") continue;
    const timeId = seq.time === "mandante" ? partidaJogador.mandante : partidaJogador.visitante;
    const nomeTime = getTeam(timeId).name;

    if (seq.time === timeDoJogador) {
      const envolvimento = resolvePlayerInvolvement(career);
      if (envolvimento === "gol") {
        golsJogador++;
        eventos.push({ minuto: seq.minuto, tipo: "gol", time: seq.time, texto: `⚽ GOL de ${career.player.nome}! (${nomeTime})` });
      } else if (envolvimento === "assistencia") {
        assistJogador++;
        const artilheiro = nomeGenerico();
        eventos.push({ minuto: seq.minuto, tipo: "gol", time: seq.time, texto: `⚽ Gol de ${artilheiro}, assistência de ${career.player.nome}! (${nomeTime})` });
      } else {
        eventos.push({ minuto: seq.minuto, tipo: "gol", time: seq.time, texto: `⚽ Gol de ${nomeGenerico()} (${nomeTime})` });
      }
    } else {
      eventos.push({ minuto: seq.minuto, tipo: "gol", time: seq.time, texto: `⚽ Gol de ${nomeGenerico()} (${nomeTime})` });
    }
  }

  // nota do jogador na partida
  const vitoria = (isHome && resultadoJogador.golsMandante > resultadoJogador.golsVisitante) ||
                   (!isHome && resultadoJogador.golsVisitante > resultadoJogador.golsMandante);
  const empate = resultadoJogador.golsMandante === resultadoJogador.golsVisitante;
  const golsSofridos = isHome ? resultadoJogador.golsVisitante : resultadoJogador.golsMandante;

  let nota = 6.0 + golsJogador * 0.9 + assistJogador * 0.5;
  nota += vitoria ? 0.5 : empate ? 0.1 : -0.3;
  if (["GOL", "ZAG", "VOL"].includes(career.player.posicao) && golsSofridos === 0) nota += 0.5;
  nota += rand(-0.3, 0.3);
  nota = clamp(Math.round(nota * 10) / 10, 4.0, 10.0);

  const novaCareer = {
    ...career,
    table,
    rodada: career.rodada + 1,
    player: {
      ...career.player,
      carreira: {
        jogos: career.player.carreira.jogos + 1,
        gols: career.player.carreira.gols + golsJogador,
        assistencias: career.player.carreira.assistencias + assistJogador,
        somaNotas: career.player.carreira.somaNotas + nota,
      },
    },
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
      timeline,
      eventos,
      golsJogador,
      assistJogador,
      nota,
    },
  };
}

// Encerra a temporada: joga o jogador crescer 1 ano e, se ainda for
// jovem, ganhar um pequeno incremento de atributos (evolução). Gera um
// novo calendário e zera a tabela pra próxima temporada.
export function startNewSeason(career) {
  const teamIds = TEAMS.map((t) => t.id);
  const schedule = generateSchedule(teamIds);
  const table = {};
  teamIds.forEach((id) => (table[id] = initialTableRow(id)));

  const idade = career.player.idade + 1;
  let atributos = { ...career.player.atributos };
  if (idade <= 29) {
    const crescimento = idade <= 23 ? 3 : idade <= 26 ? 2 : 1;
    for (const key of Object.keys(atributos)) {
      atributos[key] = clamp(atributos[key] + Math.round(rand(0, crescimento)), 1, 99);
    }
  }

  return {
    ...career,
    temporada: career.temporada + 1,
    rodada: 0,
    schedule,
    table,
    historico: [],
    player: { ...career.player, idade, atributos },
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
