// Posições clássicas do futebol brasileiro.
// "peso" define o quanto cada atributo conta pra "qualidade geral" do
// jogador naquela posição — isso influencia o quanto ele pesa no time.
export const POSITIONS = {
  GOL: {
    label: "Goleiro",
    peso: { ritmo: 0.05, finalizacao: 0.02, passe: 0.18, defesa: 0.6, fisico: 0.15, drible: 0.0 },
  },
  ZAG: {
    label: "Zagueiro",
    peso: { ritmo: 0.15, finalizacao: 0.03, passe: 0.15, defesa: 0.5, fisico: 0.15, drible: 0.02 },
  },
  LAT: {
    label: "Lateral",
    peso: { ritmo: 0.25, finalizacao: 0.08, passe: 0.22, defesa: 0.28, fisico: 0.12, drible: 0.05 },
  },
  VOL: {
    label: "Volante",
    peso: { ritmo: 0.12, finalizacao: 0.08, passe: 0.25, defesa: 0.35, fisico: 0.15, drible: 0.05 },
  },
  MEI: {
    label: "Meia",
    peso: { ritmo: 0.15, finalizacao: 0.2, passe: 0.32, defesa: 0.08, fisico: 0.08, drible: 0.17 },
  },
  ATA: {
    label: "Atacante",
    peso: { ritmo: 0.24, finalizacao: 0.38, passe: 0.1, defesa: 0.02, fisico: 0.1, drible: 0.16 },
  },
};

export const POSITION_ORDER = ["GOL", "ZAG", "LAT", "VOL", "MEI", "ATA"];

export const ATTRIBUTES = [
  { key: "ritmo", label: "Ritmo" },
  { key: "finalizacao", label: "Finalização" },
  { key: "passe", label: "Passe" },
  { key: "defesa", label: "Defesa" },
  { key: "fisico", label: "Físico" },
  { key: "drible", label: "Drible" },
];

// Calcula a "qualidade" (0-99) de um jogador numa posição a partir dos
// seus atributos brutos, ponderados pelo peso da posição.
export function overallForPosition(attrs, posKey) {
  const peso = POSITIONS[posKey].peso;
  let total = 0;
  for (const key of Object.keys(peso)) {
    total += (attrs[key] || 0) * peso[key];
  }
  return Math.round(total);
}

// Slots de formação 4-3-3 em coordenadas percentuais (0-100) do campo,
// pra time atacando da esquerda pra direita.
export const FORMATION_433 = [
  { pos: "GOL", x: 6, y: 50 },
  { pos: "ZAG", x: 18, y: 30 },
  { pos: "ZAG", x: 18, y: 70 },
  { pos: "LAT", x: 20, y: 12 },
  { pos: "LAT", x: 20, y: 88 },
  { pos: "VOL", x: 36, y: 38 },
  { pos: "VOL", x: 36, y: 62 },
  { pos: "MEI", x: 50, y: 50 },
  { pos: "ATA", x: 68, y: 20 },
  { pos: "ATA", x: 72, y: 50 },
  { pos: "ATA", x: 68, y: 80 },
];

// Grafo de "linhas de passe" entre os slots da formação (índices do
// array acima) — usado pra gerar sequências de passe que fazem sentido
// (bola sai do goleiro, passa pela defesa, meio, até o ataque) em vez de
// pular aleatoriamente pelo campo.
export const LINHAS_DE_PASSE = {
  0: [1, 2],
  1: [0, 2, 3, 5],
  2: [0, 1, 4, 6],
  3: [1, 5, 8],
  4: [2, 6, 10],
  5: [1, 3, 6, 7],
  6: [2, 4, 5, 7],
  7: [5, 6, 8, 9, 10],
  8: [3, 7, 9],
  9: [7, 8, 10],
  10: [4, 7, 9],
};
