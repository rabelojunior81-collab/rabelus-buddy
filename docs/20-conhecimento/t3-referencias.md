# T3: create-t3-app (arquitetura) e t3.chat (visual e ergonomia)

**Classe:** CONHECIMENTO · **Última verificação:** 2026-10-17T20:26:17-03:00 · **Estado:** vigente (referência, não dependência)

## O que importa para o buddy

- **create-t3-app** (`t3-oss/create-t3-app`, MIT, 29 mil estrelas) monta uma pilha web tipada: Next.js, tRPC, Tailwind, TypeScript, Prisma ou Drizzle, NextAuth ou Better Auth, e Biome ou ESLint. Cada peça é opcional. **Alerta:** a última versão é a 7.40.0, de 2025-11-05, e o último push foi em 2025-12-13, cerca de 10 meses parado. Serve como **referência de escolhas**, não como gerador a adotar às cegas.
- Os **três axiomas** são o que vale levar:
  1. **resolver problemas**: só entra o que resolve um problema concreto;
  2. **sangrar com responsabilidade**: novidade só nas partes de baixo risco, nunca no banco;
  3. **tipagem não é opcional**: contrato tipado de ponta a ponta.

  No Rabelus Buddy isso vira um **contrato tipado entre a console e o núcleo**: cada método do IPC com esquema validado nos dois lados, a ideia do tRPC sem trocar o transporte.
- **t3.chat** é a referência visual e de ergonomia que o Pai escolheu:
  - barra lateral discreta, com "New Chat" em destaque, busca de conversas e conta embaixo;
  - painel de conversa com cantos arredondados, flutuando sobre um fundo tingido;
  - tela inicial com saudação, quatro atalhos em pílula (Create, Explore, Code, Learn) e sugestões em lista;
  - caixa de mensagem ancorada embaixo, com moldura translúcida, e o modelo, o modo ("Instant"), a busca e o anexo em pílulas, com o enviar à direita;
  - vidro com `backdrop-filter: blur(12–24px)` sobre fundos com 30 a 80% de opacidade, e borda com reflexo em gradiente.
- **Paleta do t3.chat:** rosa e roxo em OKLCH, como `pink-500` = `oklch(65.6% .241 354.3)` e `purple-600` = `oklch(55.8% .288 302.3)`. O fundo escuro é vinho (`rgb(33, 20, 30)`), com texto `rgb(249, 248, 251)`. O claro é lavanda-rosado. **O Pai pediu para trocar por verde-oliva e derivados.**
- **Tokens:** raio base de `.5rem` (`2xl` = `1rem`) e desfoque `xs` 4, `sm` 8, `md` 12, `lg` 16, `xl` 24 e `2xl` 40 px. A fonte é Proxima Vara (comercial; usaremos uma pilha de sistema ou uma fonte aberta equivalente).

## Fatos verificados

| Fato | Fonte (tier) | Data |
|---|---|---|
| create-t3-app 7.40.0 (2025-11-05), MIT, último push em 2025-12-13; instaladores: nextAuth, betterAuth, prisma, drizzle, tailwind, trpc, biome, eslint, dbContainer, envVars | `t3-oss/create-t3-app` (1) | 2026-10-17 |
| Axiomas T3: resolver problemas, sangrar com responsabilidade, tipagem não é opcional | `cli/README.md` (1) | 2026-10-17 |
| t3.chat: layout, tokens de raio e desfoque, paleta OKLCH, `backdrop-filter` em pílulas e cabeçalho, fonte ProximaVara; capturas claro e escuro em 1440×900 | navegador real, inspeção do CSS calculado (0) | 2026-10-17 |

## Histórico

- 2026-10-17T20:26:17-03:00 · buddy-dev (claude-code-vs-code-569aca) · criada na pesquisa do M1
