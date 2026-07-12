import { createSeededRng, gerarNome, NACIONALIDADES_ESTRANGEIRAS } from "./names";
import { getClubeEmQualquerDivisao } from "./divisions";
import { REAL_SQUADS } from "./realPlayers";

const ESQUELETO = [
  "GOL", "GOL",
  "ZAG", "ZAG", "ZAG", "LAT", "LAT",
  "VOL", "VOL", "MEI", "MEI", "MEI",
  "ATA", "ATA", "ATA",
];

// Gera um elenco de 15 jogadores fictícios pro clube ou lê de realPlayers.js se for Série A.
// É determinístico (mesma seed = mesmo elenco).
export function gerarElenco(teamId, overrideTeam) {
  const team = overrideTeam || getClubeEmQualquerDivisao(teamId);
  const rng = createSeededRng(`elenco-${teamId}`);
  const chanceEstrangeiro = Math.min(0.35, Math.max(0.05, (team.overall - 65) / 60));

  const realSquad = REAL_SQUADS[teamId];

  // Para garantir números de camisa únicos e realistas
  const numerosUsados = new Set();
  function getNumeroDeterminista(posicao, idx) {
    let num;
    if (posicao === "GOL") {
      num = idx === 0 ? 1 : 12;
    } else if (posicao === "LAT") {
      num = idx === 0 ? 2 : 6;
    } else if (posicao === "ZAG") {
      num = idx === 0 ? 3 : idx === 1 ? 4 : 14;
    } else if (posicao === "VOL") {
      num = idx === 0 ? 5 : 8;
    } else if (posicao === "MEI") {
      num = idx === 0 ? 10 : idx === 1 ? 7 : 20;
    } else { // ATA
      num = idx === 0 ? 9 : idx === 1 ? 11 : 19;
    }
    // Garante que não repete
    while (numerosUsados.has(num)) {
      num = Math.floor(rng() * 88) + 2; // 2 a 89
    }
    numerosUsados.add(num);
    return num;
  }

  const list = realSquad
    ? realSquad.map((p, idx) => {
        const id = `${teamId}-${idx}`;
        const nome = p.nome;
        const posicao = p.posicao;
        const nacionalidade = "Brasil";
        const overall = p.overall;
        const idade = 18 + Math.floor(rng() * 16);
        return { id, nome, posicao, nacionalidade, overall, idade };
      })
    : ESQUELETO.map((posicao, idx) => {
        const estrangeiro = rng() < chanceEstrangeiro;
        const nacionalidade = estrangeiro
          ? NACIONALIDADES_ESTRANGEIRAS[Math.floor(rng() * NACIONALIDADES_ESTRANGEIRAS.length)]
          : "Brasil";
        const nome = gerarNome(rng, nacionalidade);
        const variacao = Math.round((rng() - 0.5) * 18);
        const overall = Math.max(52, Math.min(92, team.overall + variacao));
        const idade = 18 + Math.floor(rng() * 16);
        return { id: `${teamId}-${idx}`, nome, posicao, nacionalidade, overall, idade };
      });

  const posCount = {};

  return list.map((j) => {
    const pos = j.posicao;
    posCount[pos] = (posCount[pos] ?? 0) + 1;
    const idxPos = posCount[pos] - 1;
    const numero = getNumeroDeterminista(pos, idxPos);

    // Aparência determinística
    const peleOptions = ["#FFD1B3", "#E0A96D", "#8D5524", "#5C3818"];
    const pele = peleOptions[Math.floor(rng() * peleOptions.length)];

    const cabeloCores = ["#000000", "#4A3B32", "#B8860B", "#8B0000", "#D3D3D3"];
    let cabeloCor = cabeloCores[Math.floor(rng() * cabeloCores.length)];
    if (j.idade > 32 && rng() < 0.4) cabeloCor = "#D3D3D3";

    const cabeloEstilos = ["curto", "longo", "black", "careca"];
    const cabeloEstilo = cabeloEstilos[Math.floor(rng() * cabeloEstilos.length)];

    const chuteiraCores = ["#000000", "#FFFFFF", "#32CD32", "#FF69B4", "#FFD700"];
    let chuteira = chuteiraCores[Math.floor(rng() * 3)];
    if (j.overall > 78) {
      chuteira = chuteiraCores[Math.floor(rng() * chuteiraCores.length)];
    }

    return {
      ...j,
      numero,
      customizacao: { pele, cabeloCor, cabeloEstilo, chuteira }
    };
  }).sort((a, b) => b.overall - a.overall);
}

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
