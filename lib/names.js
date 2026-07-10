// Gerador de nomes procedural. Não representa jogadores reais — a ideia é
// dar personalidade aos elencos sem prometer precisão de elenco real (que
// fica desatualizada a cada janela de transferência).

const PRIMEIROS_BR = [
  "Gabriel", "Lucas", "Matheus", "Rafael", "Bruno", "Vinícius", "Gustavo", "Caio",
  "Thiago", "Douglas", "Wesley", "Ederson", "Rodrigo", "Renato", "Iago", "Kaique",
  "Anderson", "Felipe", "Leandro", "Marcelo", "Diego", "Everton", "Jefferson",
  "Robson", "Alisson", "Cauã", "Emerson", "Jonathan", "Kevin", "Léo",
];
const SOBRENOMES_BR = [
  "Silva", "Souza", "Santos", "Oliveira", "Pereira", "Costa", "Rodrigues", "Almeida",
  "Nascimento", "Carvalho", "Gomes", "Martins", "Araújo", "Melo", "Barbosa", "Ribeiro",
  "Cardoso", "Teixeira", "Correia", "Dias", "Moura", "Cavalcante", "Freitas", "Nunes",
];

const NOMES_POR_NACIONALIDADE = {
  Argentina: { primeiros: ["Lautaro", "Enzo", "Nahuel", "Thiago", "Franco", "Julián", "Exequiel"], sobrenomes: ["Fernández", "González", "Rodríguez", "Romero", "Acosta", "Díaz"] },
  Uruguai: { primeiros: ["Federico", "Darwin", "Rodrigo", "Nicolás", "Facundo"], sobrenomes: ["Pereira", "Suárez", "Bentancur", "Araújo", "Cáceres"] },
  Colômbia: { primeiros: ["Luis", "Jhon", "Rafael", "Yerry", "Juan"], sobrenomes: ["Díaz", "Córdoba", "Muriel", "Arias", "Cuadrado"] },
  Portugal: { primeiros: ["Rúben", "Gonçalo", "Rafael", "João", "Bernardo"], sobrenomes: ["Silva", "Fernandes", "Costa", "Neves", "Cancelo"] },
  Paraguai: { primeiros: ["Ángel", "Gustavo", "Miguel", "Antonio"], sobrenomes: ["Romero", "Almirón", "Gómez", "Villalba"] },
};

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createSeededRng(seedStr) {
  return mulberry32(hashString(seedStr));
}

export function gerarNome(rng, nacionalidade) {
  const estrangeiro = nacionalidade && NOMES_POR_NACIONALIDADE[nacionalidade];
  const primeiros = estrangeiro ? estrangeiro.primeiros : PRIMEIROS_BR;
  const sobrenomes = estrangeiro ? estrangeiro.sobrenomes : SOBRENOMES_BR;
  const p = primeiros[Math.floor(rng() * primeiros.length)];
  const s = sobrenomes[Math.floor(rng() * sobrenomes.length)];
  return `${p} ${s}`;
}

export const NACIONALIDADES_ESTRANGEIRAS = Object.keys(NOMES_POR_NACIONALIDADE);
