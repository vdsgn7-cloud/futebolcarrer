# Carreira Brasileirão ⚽

Modo carreira de futebol em campo 2D. Crie seu jogador, jogue a peneira,
assine com um clube (de qualquer divisão, Série A à D) e viva a carreira
rodada a rodada — com passes de verdade em campo, cartões, lesões,
contrato, salário e um agente que negocia por você.

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

⚠️ **Save incompatível com versões anteriores**: a estrutura da carreira
mudou bastante (divisão, contrato, transferências, foco de treino). Se você
tinha uma carreira salva de um zip anterior, apague o save na tela inicial
e comece uma nova.

## Como jogar

1. **Nova Carreira** → escolha nome, nacionalidade, posição e distribua os
   320 pontos de atributo (Ritmo, Finalização, Passe, Defesa, Físico, Drible).
2. **Peneira** → uma partida-teste contra uma escolinha regional. Olheiros de
   vários clubes (de qualquer divisão) avaliam seu desempenho e fazem
   propostas de contrato — escolha uma pra começar sua carreira. Se não
   rolar nenhuma proposta boa, dá pra tentar de novo.
3. Na tela de carreira (HOME), clique em **PARTIDA** a cada rodada. O jogo
   simula a rodada inteira (seu jogo em detalhe + os outros 9 jogos de forma
   rápida) e anima sua partida no campo 2D — com passes reais entre
   jogadores nomeados e numerados, não bola "viajando" aleatória.
4. Acompanhe gols, assistências, nota, estatísticas completas da partida
   (posse, chutes, escanteios, faltas, cartões) e a tabela do campeonato.
5. Cartões amarelos acumulam — na 3ª você cumpre 1 rodada de suspensão.
   Cartão vermelho também suspende, e ele "desliga" sua participação nos
   gols depois do minuto da expulsão. Lesões tiram você de ação por algumas
   rodadas — nesses casos seu time joga sem você (tela resumida, sem
   animação).
6. Use a aba **TREINO** pra escolher um atributo em foco pra temporada — ele
   ganha um empurrão extra de evolução quando a temporada vira (os outros
   também evoluem um pouco, ou regridem se você estiver envelhecendo).
7. A aba **ELENCO** mostra o elenco do seu clube (nomes gerados, ver nota
   abaixo) com você destacado na lista.
8. Na aba **MERCADO**, seu agente sonda o mercado e traz propostas de outros
   clubes — aceitar uma agenda uma transferência pra próxima temporada.
   Acompanhe também seu salário mensal e o saldo acumulado na carreira.
9. **NOTÍCIAS** mostra o retrospecto rodada a rodada da temporada.
10. Ao final das 38 rodadas, inicie a próxima temporada — seu jogador
    envelhece, evolui (ou regride, se estiver mais velho), o contrato anda
    uma temporada, e qualquer transferência aceita no Mercado é efetivada.

## Estrutura do projeto

```
app/
  page.js              → tela inicial (nova carreira / continuar)
  create-player/       → criação do jogador (sem escolher clube — isso vem da peneira)
  peneira/               → partida-teste + propostas iniciais de contrato
  career/               → hub da carreira (player card, radar, tabela, próxima partida)
  match/                → tela da partida (placar, campo 2D, estatísticas, lance a lance)
  elenco/                → elenco do clube (nomes gerados) com você destacado
  treino/                → escolha do foco de treino da temporada
  mercado/                → contrato, salário, propostas de transferência
  noticias/               → retrospecto rodada a rodada da temporada
components/
  Pitch2D.jsx           → o campo 2D (canvas): passes reais entre slots, números, nomes
  RadarChart.jsx        → gráfico radar (pentágono) dos atributos, em SVG puro
  PlayerAvatar.jsx      → avatar circular gerado (iniciais + cor do clube)
  BottomNav.jsx         → barra de navegação inferior (Home/Elenco/Treino/Mercado/Notícias)
lib/
  teams.js              → os 20 clubes da Série A (reais) e seus ratings
  divisions.js           → Séries B, C e D (fictícias) + helpers pra buscar clube/divisão
  countries.js          → lista de nacionalidades
  positions.js           → posições, pesos de atributo, formação 4-3-3, linhas de passe
  schedule.js           → gerador de tabela de jogos (turno-returno, 38 rodadas)
  engine.js             → o motor: simulação, cadeias de passe, cartões, lesões,
                           treino, peneira, propostas de contrato e transferências
  names.js / squad.js   → gerador procedural de nomes, elencos e titulares (determinístico)
  storage.js             → salvar/carregar a carreira (e o rascunho pré-peneira) no localStorage
```

## Como funciona a simulação visual (campo 2D)

Cada lance da partida é uma cadeia de passes real: a bola nasce no goleiro
(slot 0 da formação 4-3-3) e caminha por um grafo de "linhas de passe" entre
os 11 jogadores até o ataque — nunca pula aleatoriamente pelo campo. Cada
bolinha tem um número de camisa (posição na formação) e, enquanto a bola
está com alguém, aparece uma etiqueta com o sobrenome desse jogador — o seu
jogador aparece com uma estrela e destaque dourado. A cadeia de passes é
enviesada pela qualidade do jogador na posição dele: quanto melhor o
overall, mais vezes a jogada termina nos pés dele.

## O que tem de novo nessa versão

- **Peneira**: novo ponto de partida da carreira. Substitui a escolha direta
  de clube por uma partida-teste + propostas de olheiros de qualquer divisão.
- **Séries B, C e D**: clubes fictícios (ver nota abaixo) em 3 divisões
  extras, usados pelas propostas de peneira/mercado. A engine funciona
  igual em qualquer divisão (tabela, calendário, simulação).
- **Contrato, salário e agente**: seu jogador tem contrato (salário mensal,
  duração), acumula saldo com o passar das temporadas, e a aba Mercado deixa
  negociar novas propostas — a transferência só é efetivada na próxima
  temporada (mais realista que trocar de time no meio do campeonato).
- **Treino reformulado**: em vez de ganhar pontos por rodada (o que deixava
  o jogador overpowered rapidinho), agora você escolhe 1 foco por temporada,
  que ganha um bônus de evolução na virada — crescimento mais lento e
  realista, com leve declínio depois dos 30 anos.
- **Campo 2D com passes reais**: reescrita completa da visualização — bola
  troca de pé entre jogadores nomeados/numerados seguindo linhas de passe de
  verdade, em vez de "flutuar" aleatoriamente pelo campo.
- **Simulação mais realista**: estatísticas completas por partida (posse,
  chutes, escanteios, faltas, cartões), cartões pro seu jogador (acúmulo →
  suspensão), lesões, substituições de ambientação.
- **Elenco procedural**: cada clube tem 15 companheiros de time gerados com
  nomes — visual apenas, não entra nos cálculos da partida.
- **Visual navy + dourado**: cards com friso e cabeçalho destacados, gráfico
  radar de atributos, barra de navegação inferior.

## Publicando no GitHub

```bash
git init
git add .
git commit -m "Carreira Brasileirão"
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

## Próximos passos (ideias pra continuar evoluindo)

- **Acesso e rebaixamento**: mover clubes entre divisões no fim da
  temporada conforme a posição na tabela (hoje as divisões são fixas).
- **Vida social**: decisões semanais (treinar extra / descansar / sair)
  afetando forma física e moral, sem virar sistema de vício ou pressão.
- **Seleção nacional**: convocações se a média de notas estiver alta.
- **Edição visual do campo**: trocar as bolinhas por sprites/escudos reais.
- **Outras ligas do mundo**: hoje só o Brasileirão (4 divisões) está
  modelado — dá pra criar `lib/leagues/premierLeague.js` etc. e um seletor
  de liga/país na criação do jogador. A engine já é genérica o suficiente
  pra qualquer lista de 20 times.
- **Persistência em nuvem**: trocar `lib/storage.js` por Supabase (você já
  usa isso no seu SaaS de notas fiscais) pra jogar em vários dispositivos.

## Sobre os dados dos times

Os 20 clubes da Série A em `lib/teams.js` são clubes reais e conhecidos
(nomes, força geral e cores são uma aproximação livre pra fins de jogo).
Já as Séries B, C e D em `lib/divisions.js` usam **clubes fictícios** — a
composição real dessas divisões muda todo ano por acesso/rebaixamento, então
qualquer lista "real" ficaria desatualizada rápido; preferimos não prometer
uma precisão que não temos como manter. Edite os campos `overall`, `ataque`,
`defesa` e `cor` à vontade em qualquer um dos arquivos pra ajustar o
equilíbrio.
