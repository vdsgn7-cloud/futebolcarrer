// Times do Brasileirão Série A usados no modo carreira.
// "overall" é a força geral do elenco (60-90). "ataque" e "defesa" dão
// um pouco de personalidade tática a cada time (times mais ofensivos
// sofrem mais gols, times mais defensivos jogam mais fechados).
// Sinta-se à vontade pra editar nomes, cores e ratings aqui.

export const TEAMS = [
  { id: "fla", name: "Flamengo", uf: "RJ", overall: 88, ataque: 90, defesa: 84, cor: "#C8102E" },
  { id: "pal", name: "Palmeiras", uf: "SP", overall: 87, ataque: 87, defesa: 87, cor: "#00693E" },
  { id: "spa", name: "São Paulo", uf: "SP", overall: 80, ataque: 78, defesa: 81, cor: "#B31217" },
  { id: "cor", name: "Corinthians", uf: "SP", overall: 79, ataque: 77, defesa: 80, cor: "#000000" },
  { id: "gre", name: "Grêmio", uf: "RS", overall: 79, ataque: 79, defesa: 78, cor: "#0D80B7" },
  { id: "int", name: "Internacional", uf: "RS", overall: 80, ataque: 79, defesa: 80, cor: "#CC0000" },
  { id: "cam", name: "Atlético-MG", uf: "MG", overall: 81, ataque: 82, defesa: 79, cor: "#000000" },
  { id: "cru", name: "Cruzeiro", uf: "MG", overall: 78, ataque: 77, defesa: 78, cor: "#00449E" },
  { id: "bot", name: "Botafogo", uf: "RJ", overall: 84, ataque: 84, defesa: 83, cor: "#000000" },
  { id: "flu", name: "Fluminense", uf: "RJ", overall: 78, ataque: 78, defesa: 77, cor: "#7A1E3C" },
  { id: "vas", name: "Vasco da Gama", uf: "RJ", overall: 74, ataque: 73, defesa: 74, cor: "#000000" },
  { id: "bah", name: "Bahia", uf: "BA", overall: 77, ataque: 76, defesa: 77, cor: "#0033A0" },
  { id: "for", name: "Fortaleza", uf: "CE", overall: 76, ataque: 75, defesa: 76, cor: "#004B87" },
  { id: "cea", name: "Ceará", uf: "CE", overall: 71, ataque: 69, defesa: 72, cor: "#000000" },
  { id: "bra", name: "Bragantino", uf: "SP", overall: 76, ataque: 76, defesa: 75, cor: "#FFFFFF" },
  { id: "cap", name: "Athletico-PR", uf: "PR", overall: 75, ataque: 75, defesa: 74, cor: "#CC0000" },
  { id: "san", name: "Santos", uf: "SP", overall: 74, ataque: 74, defesa: 73, cor: "#000000" },
  { id: "vit", name: "Vitória", uf: "BA", overall: 70, ataque: 68, defesa: 71, cor: "#CC0000" },
  { id: "juv", name: "Juventude", uf: "RS", overall: 69, ataque: 67, defesa: 70, cor: "#00954C" },
  { id: "mir", name: "Mirassol", uf: "SP", overall: 68, ataque: 67, defesa: 68, cor: "#014D2E" },
];

export function getTeam(id) {
  return TEAMS.find((t) => t.id === id);
}
