// Times fictícios das Séries B, C e D. Diferente da Série A (que usa
// clubes reais e conhecidos), aqui optamos por nomes fictícios: a
// composição real dessas divisões muda todo ano por acesso/rebaixamento,
// então qualquer lista "real" ficaria desatualizada rápido. A ideia é dar
// personalidade ao mundo do jogo sem prometer uma precisão que não temos
// como manter.

function clube(id, name, uf, overall, cor) {
  return { id, name, uf, overall, ataque: overall, defesa: overall, cor };
}

export const SERIE_B = [
  clube("b01", "Porto Novo EC", "SC", 70, "#1D5C8A"),
  clube("b02", "Vale Verde FC", "MG", 69, "#2E7D32"),
  clube("b03", "Serra Alta AC", "ES", 68, "#7B1E3C"),
  clube("b04", "Campo Belo Esporte", "GO", 68, "#B3862A"),
  clube("b05", "Rio Manso FC", "RJ", 67, "#0D47A1"),
  clube("b06", "Monte Claro EC", "MG", 67, "#455A64"),
  clube("b07", "Boa Vista Atlético", "RN", 66, "#C62828"),
  clube("b08", "Águas Claras FC", "DF", 66, "#00695C"),
  clube("b09", "Pedra Grande EC", "PE", 65, "#4527A0"),
  clube("b10", "Costa Dourada AC", "BA", 65, "#EF6C00"),
  clube("b11", "Vila Rica Esporte", "MT", 64, "#37474F"),
  clube("b12", "Campina Sul FC", "RS", 64, "#1565C0"),
  clube("b13", "Ribeirão Fundo AC", "SP", 63, "#6D4C41"),
  clube("b14", "Cachoeira Alegre EC", "GO", 63, "#00838F"),
  clube("b15", "Planalto Norte FC", "PR", 62, "#283593"),
  clube("b16", "Litoral Azul AC", "SC", 62, "#0277BD"),
  clube("b17", "Sertão Bravo EC", "CE", 61, "#8D6E63"),
  clube("b18", "Colina Verde FC", "MG", 61, "#558B2F"),
  clube("b19", "Estrela do Sul AC", "RS", 60, "#AD1457"),
  clube("b20", "Alto Paraná EC", "PR", 60, "#3E2723"),
];

export const SERIE_C = [
  clube("c01", "Nova Esperança FC", "PA", 56, "#2E7D32"),
  clube("c02", "Rio Claro AC", "SP", 55, "#1565C0"),
  clube("c03", "Serra Dourada EC", "GO", 55, "#B3862A"),
  clube("c04", "Vale do Sol FC", "MG", 54, "#EF6C00"),
  clube("c05", "Porto Seguro AC", "BA", 54, "#00695C"),
  clube("c06", "Campo Grande Esporte", "MS", 53, "#455A64"),
  clube("c07", "Rio das Pedras FC", "RJ", 53, "#6A1B9A"),
  clube("c08", "Boa Sorte AC", "PI", 52, "#C62828"),
  clube("c09", "Terra Firme EC", "PA", 52, "#37474F"),
  clube("c10", "Monte Verde FC", "ES", 51, "#2E7D32"),
  clube("c11", "Águas Belas AC", "PE", 51, "#0277BD"),
  clube("c12", "Bela Vista Esporte", "SC", 50, "#8D6E63"),
  clube("c13", "Rio Bonito FC", "RJ", 50, "#AD1457"),
  clube("c14", "Vila Nova AC", "GO", 49, "#3E2723"),
  clube("c15", "Cruzeiro do Sul EC", "AC", 49, "#283593"),
  clube("c16", "Alto Alegre FC", "RR", 48, "#558B2F"),
  clube("c17", "Porto Alegre do Norte AC", "MT", 48, "#4527A0"),
  clube("c18", "Serra Negra Esporte", "SP", 47, "#00838F"),
  clube("c19", "Campo Formoso FC", "BA", 47, "#6D4C41"),
  clube("c20", "Vista Alegre AC", "RS", 46, "#1D5C8A"),
];

export const SERIE_D = [
  clube("d01", "Riacho Fundo EC", "GO", 44, "#455A64"),
  clube("d02", "Boa Esperança FC", "MG", 43, "#2E7D32"),
  clube("d03", "Porto Rico AC", "RO", 43, "#0D47A1"),
  clube("d04", "Vale Encantado Esporte", "SC", 42, "#B3862A"),
  clube("d05", "Serrinha FC", "BA", 42, "#C62828"),
  clube("d06", "Campo Alegre AC", "AL", 41, "#00695C"),
  clube("d07", "Rio Verde do Norte EC", "RN", 41, "#6A1B9A"),
  clube("d08", "Nova Aurora FC", "PR", 40, "#37474F"),
  clube("d09", "Bom Retiro AC", "SP", 40, "#EF6C00"),
  clube("d10", "Águas Frias Esporte", "SC", 39, "#8D6E63"),
  clube("d11", "Monte Alto FC", "SP", 39, "#0277BD"),
  clube("d12", "Vila Formosa AC", "PB", 38, "#AD1457"),
  clube("d13", "Recanto Verde EC", "TO", 38, "#3E2723"),
  clube("d14", "Porto Feliz FC", "SE", 37, "#283593"),
  clube("d15", "Barra Funda AC", "MA", 37, "#558B2F"),
  clube("d16", "Cidade Alta Esporte", "PI", 36, "#4527A0"),
  clube("d17", "Rio Pardo FC", "RS", 36, "#00838F"),
  clube("d18", "Vale das Pedras AC", "MG", 35, "#6D4C41"),
  clube("d19", "Campo Novo EC", "MT", 35, "#1D5C8A"),
  clube("d20", "Terra Nova FC", "PA", 34, "#C62828"),
];

import { TEAMS as SERIE_A } from "./teams";

export const DIVISOES = { A: "Série A", B: "Série B", C: "Série C", D: "Série D" };

export function getTimesDaDivisao(divisao) {
  if (divisao === "A") return SERIE_A;
  if (divisao === "B") return SERIE_B;
  if (divisao === "C") return SERIE_C;
  return SERIE_D;
}

export function getClubeEmQualquerDivisao(id) {
  return (
    SERIE_A.find((t) => t.id === id) ||
    SERIE_B.find((t) => t.id === id) ||
    SERIE_C.find((t) => t.id === id) ||
    SERIE_D.find((t) => t.id === id)
  );
}

export function divisaoDoClube(id) {
  if (SERIE_B.some((t) => t.id === id)) return "B";
  if (SERIE_C.some((t) => t.id === id)) return "C";
  if (SERIE_D.some((t) => t.id === id)) return "D";
  return "A";
}
