# Node.js

**Classe:** CONHECIMENTO · **Última verificação:** 2026-10-16T01:36:40-03:00 · **Estado:** vigente

## O que importa para o buddy

As ferramentas exigem Node **≥ 24** (LTS ativa). A máquina de desenvolvimento roda a Current.

## Fatos verificados

| Fato | Fonte | Verificado em |
|---|---|---|
| Release mais recente: **v26.12.0** (2026-10-14), linha Current | https://nodejs.org/dist/index.json (tier 1) | 2026-10-15 |
| LTS mais recente: **v24.22.0 "Krypton"** (2026-10-14) | https://nodejs.org/dist/index.json (tier 1) | 2026-10-15 |
| `node:sqlite`: "Stability: 1.2 - Release candidate" no v24.22.0 (classe `DatabaseSync`) e no v26.12.0 (classe `Database`; `DatabaseSync` vira alias obsoleto, DEP0210) | https://nodejs.org/docs/latest-v24.x/api/sqlite.html · https://nodejs.org/api/sqlite.html (tier 0) | 2026-10-15 |
| TypeScript no Node: type stripping **"Stability: 2 - Stable"** desde v24.12.0/v25.2.0, ligado por padrão desde v23.6.0, sem aviso desde v24.3.0; só sintaxe apagável (sem `enum`, `namespace` com código, parameter properties, import aliases, decorators, `.tsx`, `paths`); extensão `.ts` obrigatória nos imports; `import type` obrigatório; v26.0.0 removeu `--experimental-transform-types` | https://nodejs.org/docs/latest-v24.x/api/typescript.html · https://nodejs.org/api/typescript.html (tier 0) | 2026-10-15 |
| TLS: `tls.getCACertificates(type)` (v23.10.0/v22.15.0; tipos `default`, `system`, `bundled`, `extra`) e `tls.setDefaultCACertificates(certs)` (v24.5.0/v22.19.0; "completely replaces the default CA certificate list"; vale para conexões seguintes). Somar `default` + `system` resolveu a cadeia do OpenRouter (raiz GlobalSign Root CA) que o pacote embutido do Node 26.11 recusava (`SELF_SIGNED_CERT_IN_CHAIN`) | https://nodejs.org/api/tls.html (tier 0); [registro](../registros/2026-10-16T013440-0300-sonda-dos-provedores-reais/README.md) | 2026-10-16 |
| Release anterior: v26.11.1 (2026-10-07) | https://nodejs.org/dist/index.json (tier 1) | 2026-10-14 |
| LTS anterior: v24.21.0 "Krypton" (2026-09-07) | https://nodejs.org/dist/index.json (tier 1) | 2026-10-14 |
| Máquina local: v26.11.1 (atrás da 26.12.0; atualizar só com autorização) | `node --version` | 2026-10-15 |

## Explicação

Linhas pares do Node viram LTS; a Current recebe novidades primeiro. Fixar `engines` na LTS dá a contribuidores um piso estável sem impedir o uso da Current.

## Implicações

- `package.json`: `"engines": { "node": ">=24.12.0" }` desde 2026-10-16 (o type stripping ficou estável no 24.12; consequência da decisão 8 da SPEC 0001, aprovada pelo Pai; antes era `>=24`).
- Reverificar quando a linha 26 entrar em LTS e decidir se o piso sobe (decisão registrada em ADR).

## Histórico de verificações

- 2026-10-14T10:18:00-03:00 · buddy-dev (claude-code-c33594) · criação da ficha
- 2026-10-15T04:24:23-03:00 · buddy-dev (claude-code-vs-code-438d04) · 26.12.0 e LTS 24.22.0 publicadas em 14/10; estado do node:sqlite nas duas linhas
- 2026-10-15T04:36:45-03:00 · buddy-dev (claude-code-vs-code-5cfc7b) · type stripping estável no 24.12+ e no 26
- 2026-10-16T01:36:40-03:00 · buddy-dev (claude-code-vs-code-fe93fb) · certificados do sistema somados aos embutidos (OpenRouter)
