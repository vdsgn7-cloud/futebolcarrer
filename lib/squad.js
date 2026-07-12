import { createSeededRng, gerarNome, NACIONALIDADES_ESTRANGEIRAS } from "./names";
import { getClubeEmQualquerDivisao } from "./divisions";

const ESQUELETO = [
  "GOL", "GOL",
  "ZAG", "ZAG", "ZAG", "LAT", "LAT",
  "VOL", "VOL", "MEI", "MEI", "MEI",
  "ATA", "ATA", "ATA",
];

// Gera um elenco de 15 jogadores fictícios pro clube. É determinístico
// (mesma seed = mesmo elenco), então a lista não muda toda hora que a
// tela é aberta. É só ambientação — não entra nos cálculos da partida.
// `overrideTeam` ({overall, name}) permite gerar elenco pra um time que
// não está em lib/teams.js (ex: os times improvisados da peneira).
export function gerarElenco(teamId, overrideTeam) {
  const team = overrideTeam || getClubeEmQualquerDivisao(teamId);
  const rng = createSeededRng(`elenco-${teamId}`);
  const chanceEstrangeiro = Math.min(0.35, Math.max(0.05, (team.overall - 65) / 60));

  return ESQUELETO.map((posicao, idx) => {
    const estrangeiro = rng() < chanceEstrangeiro;
    const nacionalidade = estrangeiro
      ? NACIONALIDADES_ESTRANGEIRAS[Math.floor(rng() * NACIONALIDADES_ESTRANGEIRAS.length)]
      : "Brasil";
    const nome = gerarNome(rng, nacionalidade);
    const variacao = Math.round((rng() - 0.5) * 18);
    const overall = Math.max(52, Math.min(92, team.overall + variacao));
    const idade = 18 + Math.floor(rng() * 16);
    return { id: `${teamId}-${idx}`, nome, posicao, nacionalidade, overall, idade };
  }).sort((a, b) => b.overall - a.overall);
}

// Mapeia o elenco pros 11 slots da formação 4-3-3 (ver FORMATION_433 em
// positions.js): 1 GOL, 2 ZAG, 2 LAT, 2 VOL, 1 MEI, 3 ATA — os melhores de
// cada posição no elenco. Usado pra dar nome/número a cada bolinha em campo.
const SLOTS_POR_POSICAO = { GOL: 1, ZAG: 2, LAT: 2, VOL: 2, MEI: 1, ATA: 3 };

export function gerarTitulares(teamId, overrideTeam) {
  const elenco = gerarElenco(teamId, overrideTeam);
  const porPosicao = {};
  for (const pos of Object.keys(SLOTS_POR_POSICAO)) {
    porPosicao[pos] = elenco
      .filter((j) => j.posicao === pos)
      .sort((a, b) => b.overall - a.overall)
      .slice(0, SLOTS_POR_POSICAO[pos]);
  }
  // ordem que bate com FORMATION_433: GOL, ZAG, ZAG, LAT, LAT, VOL, VOL, MEI, ATA, ATA, ATA
  return [
    porPosicao.GOL[0],
    porPosicao.ZAG[0], porPosicao.ZAG[1],
    porPosicao.LAT[0], porPosicao.LAT[1],
    porPosicao.VOL[0], porPosicao.VOL[1],
    porPosicao.MEI[0],
    porPosicao.ATA[0], porPosicao.ATA[1], porPosicao.ATA[2],
  ];
}
