import { createSeededRng, gerarNome, NACIONALIDADES_ESTRANGEIRAS } from "./names";
import { getTeam } from "./teams";

const ESQUELETO = [
  "GOL", "GOL",
  "ZAG", "ZAG", "ZAG", "LAT", "LAT",
  "VOL", "VOL", "MEI", "MEI", "MEI",
  "ATA", "ATA", "ATA",
];

// Gera um elenco de 15 jogadores fictícios pro clube. É determinístico
// (mesma seed = mesmo elenco), então a lista não muda toda hora que a
// tela é aberta. É só ambientação — não entra nos cálculos da partida.
export function gerarElenco(teamId) {
  const team = getTeam(teamId);
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
