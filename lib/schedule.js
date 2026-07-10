// Gera o calendário do returno-turno (38 rodadas, todos contra todos em
// dois turnos) usando o método do círculo. Recebe um array de ids de time
// (precisa ter tamanho par) e devolve um array de rodadas, cada rodada
// sendo uma lista de partidas { mandante, visitante }.
export function generateSchedule(teamIds) {
  const ids = [...teamIds];
  if (ids.length % 2 !== 0) ids.push(null); // bye, não deve acontecer com 20 times

  const n = ids.length;
  const rounds1 = [];
  const fixed = ids[0];
  let rotating = ids.slice(1);

  for (let r = 0; r < n - 1; r++) {
    const roundTeams = [fixed, ...rotating];
    const matches = [];
    for (let i = 0; i < n / 2; i++) {
      const a = roundTeams[i];
      const b = roundTeams[n - 1 - i];
      if (a === null || b === null) continue;
      // alterna mando de campo pra distribuir jogos em casa/fora
      if (r % 2 === 0) {
        matches.push({ mandante: a, visitante: b });
      } else {
        matches.push({ mandante: b, visitante: a });
      }
    }
    rounds1.push(matches);
    rotating = [rotating[rotating.length - 1], ...rotating.slice(0, -1)];
  }

  // segundo turno: mesmos confrontos com mando invertido
  const rounds2 = rounds1.map((round) =>
    round.map((m) => ({ mandante: m.visitante, visitante: m.mandante }))
  );

  return [...rounds1, ...rounds2];
}
