# Ata Conselho IFPI Design

## Objetivo

Criar uma aplicação web full-stack para gerenciar reuniões do Conselho de Classe e gerar atas com fluxo auditável, assinatura eletrônica simples e exportação em PDF.

## Arquitetura

A aplicação usa Next.js App Router com Server Actions para mutações, Prisma com SQLite para persistência local e Tailwind CSS para uma interface administrativa objetiva. A autenticação é local, baseada em senha com hash PBKDF2 e cookie de sessão assinado.

## Núcleos

- Dados: Prisma modela User, Campus, Course, ClassGroup, Meeting, MeetingParticipant, AgendaItem, DiscussionRecord, StudentCase, ActionItem, Deliberation, Vote, Minute, MinuteSignature, MinuteVersion e AuditLog.
- Domínio: funções puras validam regras obrigatórias, calculam quórum, filtram conteúdo sigiloso para ata pública e calculam hash de assinatura.
- UI: `/meetings/[id]` é a sala da reunião com abas Abertura, Presença e Quórum, Pauta, Discussões, Estudantes, Encaminhamentos, Deliberações e Votos, Ata e Assinaturas.
- Auditoria: eventos críticos como convocação, abertura, geração de ata, aprovação, assinatura, finalização e reabertura são registrados em AuditLog.

## Regras

As regras obrigatórias são aplicadas no servidor: reunião não abre sem presidente e secretário, ata não é gerada sem presença, quórum é calculado automaticamente, reunião final bloqueia representante discente, encaminhamento exige responsável e prazo, registros sigilosos são resumidos na ata pública, ata precisa ser aprovada para assinatura, assinatura registra usuário, data/hora e hash, ata finalizada só muda após reabertura justificada, e eventos críticos são auditados.

## Interface

A UI prioriza formulários compactos, tabelas, abas e ações explícitas. O layout usa cabeçalho simples, área principal larga, cartões apenas para blocos funcionais e estados de alerta para bloqueios de regras.
