# Carreira Brasileirão ⚽

Modo carreira de futebol em campo 2D. Crie seu jogador, escolha um clube da
Série A e jogue o Brasileirão inteiro rodada a rodada, acompanhando a partida
num campo visto de cima com "bolinhas" se movendo — estilo retrô.

Feito em **Next.js 14** (App Router) + **Tailwind CSS** + **Canvas API**, sem
backend: tudo roda no navegador e o save fica no `localStorage`.

## Rodando localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

> A primeira vez que rodar `npm run build` ou `npm run dev`, o Next.js baixa
> as fontes (Bebas Neue, Barlow, JetBrains Mono) do Google Fonts — isso exige
> internet no momento do build. Na Vercel isso acontece automaticamente.

## Como jogar

1. **Nova Carreira** → escolha nome, nacionalidade, posição e distribua os
   pontos de atributo (300 pontos pra dividir entre Ritmo, Finalização,
   Passe, Defesa, Físico e Drible).
2. Escolha um clube da Série A pra defender.
3. Na tela de carreira, clique em **Simular Partida** a cada rodada. O jogo
   simula a rodada inteira (seu jogo em detalhe + os outros 9 jogos de forma
   rápida) e anima sua partida no campo 2D.
4. Acompanhe gols, assistências, nota e a tabela do campeonato.
5. Ao final das 38 rodadas, inicie a próxima temporada — seu jogador envelhece
   e evolui um pouco se ainda for jovem.

## Estrutura do projeto

```
app/
  page.js              → tela inicial (nova carreira / continuar)
  create-player/       → criação do jogador
  career/               → hub da carreira (tabela, próxima partida, stats)
  match/                → tela da partida com o campo 2D animado
components/
  Pitch2D.jsx           → o campo 2D (canvas) que anima a partida
lib/
  teams.js              → os 20 clubes da Série A e seus ratings
  countries.js          → lista de nacionalidades
  positions.js           → posições, pesos de atributo, formação 4-3-3
  schedule.js           → gerador de tabela de jogos (turno-returno, 38 rodadas)
  engine.js             → o motor da simulação (placar, timeline, evolução)
  storage.js             → salvar/carregar a carreira no localStorage
```

## Publicando no GitHub

```bash
git init
git add .
git commit -m "Carreira Brasileirão - MVP"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/NOME_DO_REPO.git
git push -u origin main
```

## Deploy na Vercel

1. Entre em [vercel.com](https://vercel.com) e conecte sua conta do GitHub.
2. **Add New → Project**, selecione o repositório que você acabou de subir.
3. A Vercel detecta automaticamente que é um projeto Next.js — não precisa
   mudar nenhuma configuração. Clique em **Deploy**.
4. Pronto — a cada `git push` na branch `main`, a Vercel republica sozinha.

## Ideias pra continuar evoluindo (próximos passos naturais)

- **Mercado de transferências**: permitir trocar de clube entre temporadas.
- **Lesões e suspensões**: cartões acumulados, risco de lesão por partida.
- **Seleção nacional**: convocações se a média de notas estiver alta.
- **Edição visual do campo**: trocar as bolinhas por sprites/times com escudo.
- **Outras ligas**: hoje só o Brasileirão está modelado em `lib/teams.js` —
  dá pra criar `lib/leagues/premierLeague.js` etc. e um seletor de liga na
  criação do jogador, exatamente como você pediu originalmente (qualquer
  liga do mundo, qualquer nacionalidade). A estrutura de `engine.js` já é
  genérica o suficiente pra funcionar com qualquer lista de 20 times.
- **Persistência em nuvem**: trocar `lib/storage.js` por Supabase (você já
  usa isso no seu SaaS de notas fiscais) pra jogar em vários dispositivos.

## Sobre os dados dos times

Os 20 clubes em `lib/teams.js` (nomes, força geral, cores) são uma
aproximação livre pra fins de jogo — edite os campos `overall`, `ataque`,
`defesa` e `cor` à vontade pra ajustar o equilíbrio ou atualizar conforme
a temporada real.
