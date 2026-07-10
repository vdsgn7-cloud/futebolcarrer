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
   pontos de atributo (320 pontos pra dividir entre Ritmo, Finalização,
   Passe, Defesa, Físico e Drible).
2. Escolha um clube da Série A pra defender.
3. Na tela de carreira (HOME), clique em **Simular Partida** a cada rodada.
   O jogo simula a rodada inteira (seu jogo em detalhe + os outros 9 jogos de
   forma rápida) e anima sua partida no campo 2D.
4. Acompanhe gols, assistências, nota, estatísticas completas da partida
   (posse, chutes, escanteios, faltas, cartões) e a tabela do campeonato.
5. Cartões amarelos acumulam — na 3ª você cumpre 1 rodada de suspensão.
   Cartão vermelho também gera suspensão. Lesões tiram você de ação por
   algumas rodadas — nesses casos seu time joga sem você (tela resumida,
   sem animação).
6. Use a aba **TREINO** pra gastar pontos (1 por rodada disputada, jogando
   ou não) melhorando os atributos que quiser.
7. A aba **ELENCO** mostra o elenco do seu clube (nomes gerados, ver nota
   abaixo) com você destacado na lista.
8. **MERCADO** e **NOTÍCIAS** — a segunda já mostra o retrospecto rodada a
   rodada; a primeira é onde vai entrar salário/contrato/agente (ver
   "Próximos passos").
9. Ao final das 38 rodadas, inicie a próxima temporada — seu jogador envelhece
   e evolui um pouco se ainda for jovem.

## Estrutura do projeto

```
app/
  page.js              → tela inicial (nova carreira / continuar)
  create-player/       → criação do jogador
  career/               → hub da carreira (player card, radar, tabela, próxima partida)
  match/                → tela da partida (placar, campo 2D, estatísticas, lance a lance)
  elenco/                → elenco do clube (nomes gerados) com você destacado
  treino/                → gasto de pontos de treino nos atributos
  mercado/                → placeholder da fase de contrato/negociação (próximo passo)
  noticias/               → retrospecto rodada a rodada da temporada
components/
  Pitch2D.jsx           → o campo 2D (canvas) que anima a partida
  RadarChart.jsx        → gráfico radar (pentágono) dos atributos, em SVG puro
  PlayerAvatar.jsx      → avatar circular gerado (iniciais + cor do clube)
  BottomNav.jsx         → barra de navegação inferior (Home/Elenco/Treino/Mercado/Notícias)
lib/
  teams.js              → os 20 clubes da Série A e seus ratings
  countries.js          → lista de nacionalidades
  positions.js           → posições, pesos de atributo, formação 4-3-3
  schedule.js           → gerador de tabela de jogos (turno-returno, 38 rodadas)
  engine.js             → o motor da simulação (placar, cartões, lesões, estatísticas, evolução)
  names.js / squad.js   → gerador procedural de nomes e elencos (determinístico por clube)
  storage.js             → salvar/carregar a carreira no localStorage
```

## O que tem de novo nessa versão

- **Simulação mais realista**: cada partida agora gera posse de bola, chutes,
  chutes a gol, escanteios, faltas e cartões amarelos pra ambos os times —
  tudo exibido em barras comparativas na tela de partida.
- **Cartões**: seu jogador pode ser advertido durante a partida (mais chance
  pra zagueiros/volantes). 3 amarelos na temporada = 1 rodada de suspensão;
  cartão vermelho suspende direto, e ele para de contribuir com gols depois
  do minuto da expulsão.
- **Lesões**: chance pequena a cada partida jogada; a duração varia (lesão
  leve: 1-2 rodadas, mais grave: 3-6). Enquanto lesionado/suspenso, seu time
  joga sem o bônus dele e a tela de partida mostra só o placar final.
- **Substituições**: eventos de ambientação no lance a lance.
- **Elenco procedural**: cada clube tem 15 companheiros de time gerados com
  nomes (brasileiros e alguns estrangeiros conforme a força do clube) —
  visual apenas, não entra nos cálculos da partida.
- **Treino**: 1 ponto por rodada disputada (jogando ou não), gasto pra subir
  +2 em qualquer atributo.
- **Visual redesenhado**: tema navy + dourado, cards com friso e cabeçalho
  destacados, gráfico radar de atributos, e barra de navegação inferior —
  inspirado em referências de HUD de jogos de carreira de futebol.

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

## Próximos passos (roadmap combinado)

- **Séries B, C e D + acesso/rebaixamento**: expandir `lib/teams.js` pra
  4 divisões com times por rating, e no fim de temporada mover os times
  entre elas conforme a posição na tabela.
- **Peneira inicial + olheiros**: começar a carreira como jogador sem clube,
  jogar uma partida-teste e receber propostas de clubes menores conforme o
  desempenho.
- **Salário, contrato e agente**: renda mensal, duração de contrato,
  renovação e um "agente" que intermedia propostas de outros clubes.
- **Vida social**: decisões semanais (treinar extra / descansar / sair)
  afetando forma física e moral, sem virar sistema de vício ou pressão.
- **Seleção nacional**: convocações se a média de notas estiver alta.
- **Edição visual do campo**: trocar as bolinhas por sprites/times com escudo.
- **Outras ligas do mundo**: hoje só o Brasileirão está modelado em
  `lib/teams.js` — dá pra criar `lib/leagues/premierLeague.js` etc. e um
  seletor de liga na criação do jogador. A estrutura de `engine.js` já é
  genérica o suficiente pra funcionar com qualquer lista de 20 times.
- **Persistência em nuvem**: trocar `lib/storage.js` por Supabase (você já
  usa isso no seu SaaS de notas fiscais) pra jogar em vários dispositivos.

## Sobre os dados dos times

Os 20 clubes em `lib/teams.js` (nomes, força geral, cores) são uma
aproximação livre pra fins de jogo — edite os campos `overall`, `ataque`,
`defesa` e `cor` à vontade pra ajustar o equilíbrio ou atualizar conforme
a temporada real.
