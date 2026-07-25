# App de Campeonato de Escalada (Boulder)

App web para gestão e acompanhamento em tempo real de um campeonato de
escalada (categoria Boulder), com três áreas:

- **Público** (`/` e `/insights`) — ranking ao vivo (visual inspirado no
  anexo: quadrados dourados = TOP, meio quadrado = ZONA, vazio = nenhum) e
  página de insights do evento. Sem login.
- **Staff — Arbitragem** (`/staff/login`) — painel para registrar,
  atleta a atleta e boulder a boulder, se houve TOP e/ou ZONA e em quantas
  tentativas. Atualiza o ranking em tempo real em todas as telas abertas.
- **Controle de Atletas** (`/athlete-control/login`) — login especial
  para: cadastrar atletas, organizar a fila de entrada (arrastar para
  reordenar, com até 2 atletas "na parede" ao mesmo tempo) e controlar o
  cronômetro (4 minutos por padrão, editável) de cada uma das 2 paredes.

## Stack

- React + Vite + Tailwind CSS
- Supabase (Postgres + Auth + Realtime) como backend
- `@dnd-kit` para a fila arrastável de atletas

Tudo em tempo real: qualquer alteração feita pelo Staff ou pelo Controle
de Atletas aparece instantaneamente em todas as telas abertas (inclusive
no telão público), via Supabase Realtime — não é necessário atualizar a
página.

## 1. Criar o backend (Supabase)

1. Crie uma conta gratuita em https://supabase.com e um novo projeto.
2. Vá em **SQL Editor** e cole o conteúdo de `supabase/schema.sql`
   (deste projeto) e execute. Isso cria as tabelas, a view de ranking,
   as políticas de segurança (RLS) e os 4 boulders da categoria Boulder.
3. Em **Project Settings > API**, copie a **Project URL** e a chave
   **anon public** — você vai usá-las no passo 3.
4. Crie os usuários de acesso restrito em **Authentication > Users >
   Add user** (defina e-mail e senha para cada árbitro do Staff e para
   quem for operar o Controle de Atletas).
5. Para cada usuário criado, vá em **Table Editor > profiles** e
   adicione uma linha:
   - `id`: o UUID do usuário (copiado da tela de Authentication)
   - `full_name`: nome da pessoa
   - `role`: `staff` (para árbitros) ou `athlete_control` (para quem
     organiza fila/cronômetro/cadastro de atletas)

   Sem essa linha em `profiles`, o login funciona mas o app nega acesso
   às telas restritas (por segurança).

## 2. Configurar o projeto localmente

```bash
npm install
cp .env.example .env
# edite .env com a Project URL e a anon key do Supabase
npm run dev
```

Abra `http://localhost:5173`.

- Ranking público: `/`
- Insights públicos: `/insights`
- Login do Staff (arbitragem): `/staff/login`
- Login do Controle de Atletas: `/athlete-control/login`

## 3. Publicar na web

Qualquer serviço de hospedagem de sites estáticos funciona (o app é só
frontend, o backend é o Supabase). O mais simples é a Vercel:

1. Suba este projeto para um repositório no GitHub.
2. Em https://vercel.com, importe o repositório.
3. Configure as variáveis de ambiente `VITE_SUPABASE_URL` e
   `VITE_SUPABASE_ANON_KEY` nas configurações do projeto na Vercel.
4. Deploy. Pronto — o link pode ser usado no dia do evento, tanto para
   o telão do público quanto para os tablets/celulares do Staff e do
   Controle de Atletas.

(Netlify, Cloudflare Pages ou GitHub Pages também funcionam da mesma
forma — o único requisito é rodar `npm run build` e servir a pasta
`dist/`.)

## 4. Preparar o evento no dia

1. Com o login de **Controle de Atletas**, cadastre todos os atletas
   (`/athlete-control/register`).
2. Monte a fila de entrada (`/athlete-control/queue`) — arraste para
   definir a ordem e clique em "Chamar" para marcar até 2 atletas como
   "na parede".
3. Use o cronômetro (`/athlete-control/timer`) para controlar os 4
   minutos de cada parede.
4. Com o login de **Staff**, cada árbitro acessa `/staff/panel` e, a
   cada boulder concluído por um atleta, registra TOP e/ou ZONA e o
   número de tentativas.
5. Deixe `/` (ranking) e `/insights` abertos em um telão ou projetor
   para o público acompanhar ao vivo.

## Estrutura de dados (resumo)

- `categories` — categorias da competição (só "Boulder" por enquanto,
  mas a estrutura já suporta adicionar outras no futuro).
- `boulders` — os 4 boulders da categoria.
- `athletes` — atletas inscritos.
- `scores` — pontuação de cada atleta em cada boulder (top, zona,
  tentativas).
- `queue_entries` — fila de chamada dos atletas (posição e status:
  aguardando / na parede / concluído).
- `timer_state` — estado do cronômetro de cada uma das 2 paredes,
  sincronizado entre todos os dispositivos.
- `ranking` (view) — calcula a colocação de cada atleta seguindo a
  regra padrão de boulder: mais tops primeiro, depois menos tentativas
  até o top, depois mais zonas, depois menos tentativas até a zona.

## Personalizações fáceis

- **Tempo do cronômetro**: o padrão é 4 minutos (`duration_seconds: 240`
  em `timer_state`, e em `src/components/Timer.jsx` no botão "Resetar").
- **Cores/visual do ranking**: `src/index.css` (classes `.square`,
  `.square-top`, `.square-zone`) e `tailwind.config.js` (cor `gold`).
- **Bandeiras dos países**: mapa `FLAGS` em
  `src/components/RankingTable.jsx` — adicione mais códigos conforme os
  países dos atletas inscritos.
- **Outras categorias** (ex: Lead, Speed): adicione uma linha em
  `categories` e ajuste `useLiveEvent('Boulder')` para o nome desejado
  nas páginas, ou crie um seletor de categoria.
