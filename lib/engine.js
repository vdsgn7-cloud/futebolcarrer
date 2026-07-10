import { TEAMS, getTeam } from "./teams";
import { overallForPosition } from "./positions";
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
      cartoesAmarelos: 0, // acumulado na temporada corrente
      suspenso: false,
      lesao: null, // { rodadasRestantes, apelido }
      pontosTreino: 0, // 1 ponto por rodada jogada, gasto na tela de Treino
    },
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

// Constrói a "timeline" visual de uma partida: uma sequência de trechos
// (buildup / chance / gol) distribuídos ao longo de 90 minutos, cada um
// atribuído a um time. Usada pelo componente de campo 2D pra animar.
function buildTimeline({ mandanteId, visitanteId, golsMandante, golsVisitante, career, jogadorDisponivel }) {
  const totalSequencias = Math.round(rand(20, 26));
  const golSequencias = [
    ...Array(golsMandante).fill("mandante"),
    ...Array(golsVisitante).fill("visitante"),
  ];
  const restantes = totalSequencias - golSequencias.length;

  const atkM = effectiveClubRatings(mandanteId, career, jogadorDisponivel).ataque;
  const atkV = effectiveClubRatings(visitanteId, career, jogadorDisponivel).ataque;
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

// Chance de cartão pro jogador, por posição (defensores se expõem mais).
const CHANCE_CARTAO_POS = { GOL: 0.02, ZAG: 0.16, LAT: 0.12, VOL: 0.15, MEI: 0.08, ATA: 0.06 };

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

    const novaCareer = {
      ...career,
      table,
      rodada: career.rodada + 1,
      player: {
        ...career.player,
        suspenso: false, // suspensão é sempre cumprida em 1 rodada
        lesao: novoLesao && novoLesao.rodadasRestantes > 0 ? novoLesao : null,
        pontosTreino: career.player.pontosTreino + 1,
      },
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

  const timeline = buildTimeline({
    mandanteId: partidaJogador.mandante,
    visitanteId: partidaJogador.visitante,
    golsMandante: resultadoJogador.golsMandante,
    golsVisitante: resultadoJogador.golsVisitante,
    career,
    jogadorDisponivel,
  });

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

  // resolve envolvimento do jogador em cada gol do próprio time
  let golsJogador = 0;
  let assistJogador = 0;
  const eventos = [];
  const timeDoJogador = isHome ? "mandante" : "visitante";

  for (const seq of timeline) {
    if (seq.tipo !== "gol") continue;
    const timeId = seq.time === "mandante" ? partidaJogador.mandante : partidaJogador.visitante;
    const nomeTime = getTeam(timeId).name;
    const jogadorEmCampo = minutoExpulsao === null || seq.minuto < minutoExpulsao;

    if (seq.time === timeDoJogador && jogadorEmCampo) {
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

  const novaCareer = {
    ...career,
    table,
    rodada: career.rodada + 1,
    player: {
      ...career.player,
      cartoesAmarelos,
      suspenso: suspensoProxima,
      lesao: novaLesao,
      pontosTreino: career.player.pontosTreino + 1,
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
    player: {
      ...career.player,
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

// Gasta 1 ponto de treino pra subir 1 atributo em +2 (até o teto de 99).
export function treinarAtributo(career, atributoKey) {
  if (career.player.pontosTreino <= 0) return career;
  const atributos = { ...career.player.atributos };
  atributos[atributoKey] = clamp(atributos[atributoKey] + 2, 1, 99);
  return {
    ...career,
    player: {
      ...career.player,
      atributos,
      pontosTreino: career.player.pontosTreino - 1,
    },
  };
}

export function statusJogador(player) {
  if (player.suspenso) return { texto: "Suspenso", cor: "ember" };
  if (player.lesao && player.lesao.rodadasRestantes > 0) {
    return { texto: `Lesionado (${player.lesao.rodadasRestantes} rod.)`, cor: "ember" };
  }
  return { texto: "Disponível", cor: "green" };
}
