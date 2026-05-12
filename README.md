# Ata Conselho IFPI

Aplicacao web para gerenciamento de reunioes de Conselho de Classe do IFPI, com cadastro de referencias, controle de participantes, presenca, pauta, discussoes, encaminhamentos, deliberacoes, geracao de ata, assinaturas eletronicas e exportacao em PDF.

## Stack

- Next.js 14 com App Router
- React 18
- TypeScript
- Prisma ORM
- SQLite em desenvolvimento
- Tailwind CSS
- Vitest

## Requisitos

- Node.js 20 ou superior
- npm

## Configuracao local

1. Instale as dependencias:

```bash
npm install
```

2. Crie o arquivo de ambiente:

```bash
cp .env.example .env
```

No Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

3. Gere o Prisma Client:

```bash
npm run prisma:generate
```

4. Crie/aplique o banco local:

```bash
npm run prisma:migrate
```

5. Popule dados iniciais:

```bash
npm run seed
```

6. Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

Acesse `http://localhost:3000`.

## Acesso de desenvolvimento

O seed cria usuarios de exemplo. A senha padrao e:

```text
ifpi123
```

Usuario principal:

```text
admin@ifpi.edu.br
```

Outros e-mails criados pelo seed incluem:

- `direcao@ifpi.edu.br`
- `coordenacao@ifpi.edu.br`
- `pedagogico@ifpi.edu.br`
- `secretario@ifpi.edu.br`
- `docente1@ifpi.edu.br`
- `docente2@ifpi.edu.br`

## Scripts

- `npm run dev`: inicia o Next.js em modo desenvolvimento.
- `npm run build`: gera Prisma Client e compila a aplicacao para producao.
- `npm run start`: executa a build de producao.
- `npm run lint`: roda o ESLint configurado pelo Next.js.
- `npm test`: executa os testes com Vitest.
- `npm run prisma:generate`: gera o Prisma Client.
- `npm run prisma:migrate`: executa migracoes locais com Prisma.
- `npm run seed`: popula o banco com dados iniciais.

## Funcionalidades principais

- Login local com sessao assinada em cookie HTTP-only.
- Cadastro de campus, cursos e turmas.
- Criacao de reunioes com campus, curso, turma, local, data e quorum minimo.
- Inclusao de participantes com papeis de conselho.
- Registro de presenca e calculo de quorum.
- Registro de pautas, discussoes, casos de estudantes, encaminhamentos e deliberacoes.
- Votacao aberta para deliberacoes.
- Geracao automatica de ata com hash SHA-256 do conteudo.
- Controle de versoes da ata.
- Marcacao de leitura/aprovacao, assinatura eletronica e finalizacao.
- Reabertura justificada de ata finalizada.
- Exportacao da versao publica da ata em PDF.
- Registro de eventos relevantes em auditoria.

## Estrutura do projeto

```text
prisma/
  schema.prisma       Modelo de dados Prisma
  seed.ts             Dados iniciais de desenvolvimento
src/app/
  actions.ts          Server Actions da aplicacao
  page.tsx            Listagem e criacao de reunioes
  login/page.tsx      Tela de login
  cadastros/page.tsx  Cadastros de campus, curso e turma
  meetings/[id]/      Sala da reuniao e exportacao PDF
src/lib/
  auth.ts             Sessao, hash e verificacao de senha
  prisma.ts           Cliente Prisma compartilhado
  pdf.ts              Geracao simples de PDF
  domain/             Regras de negocio e geracao de ata
```

## Banco de dados

O projeto usa SQLite por padrao:

```env
DATABASE_URL="file:./dev.db"
SESSION_SECRET="change-me-in-development"
```

Para producao, troque `SESSION_SECRET` por um valor forte e avalie substituir SQLite por um banco gerenciado, ajustando o provider e as migracoes no Prisma conforme necessario.

## Verificacao

Comandos usados para validar o projeto:

```bash
npm test
npm run lint
npm run build
```

Observacao para Windows: se `npm run build` falhar durante `prisma generate` com erro `EPERM: operation not permitted, rename ... query_engine-windows.dll.node`, normalmente ha um processo Node/Next/Prisma segurando o arquivo em `node_modules/.prisma/client`. Feche servidores de desenvolvimento e processos Node ativos, depois rode novamente:

```bash
npm run prisma:generate
npm run build
```

## Notas de seguranca

- A autenticacao atual e local e simples, adequada para desenvolvimento/prototipo.
- Nao use `SESSION_SECRET` de exemplo em producao.
- As senhas do seed sao apenas para ambiente local.
- Revise regras de autorizacao por perfil antes de expor a aplicacao em ambiente real.
