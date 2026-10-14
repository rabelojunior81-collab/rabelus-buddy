# Node.js

**Classe:** CONHECIMENTO · **Última verificação:** 2026-10-14T10:18:00-03:00 · **Estado:** vigente

## O que importa para o buddy

As ferramentas exigem Node **≥ 24** (LTS ativa). A máquina de desenvolvimento roda a Current.

## Fatos verificados

| Fato | Fonte | Verificado em |
|---|---|---|
| Release mais recente: **v26.11.1** (2026-10-07), linha Current | https://nodejs.org/dist/index.json (tier 1) | 2026-10-14 |
| LTS mais recente: **v24.21.0 "Krypton"** (2026-09-07) | https://nodejs.org/dist/index.json (tier 1) | 2026-10-14 |
| Máquina local: v26.11.1 | `node --version` | 2026-10-14 |

## Explicação

Linhas pares do Node viram LTS; a Current recebe novidades primeiro. Fixar `engines` na LTS dá a contribuidores um piso estável sem impedir o uso da Current.

## Implicações

- `package.json`: `"engines": { "node": ">=24" }`.
- Reverificar quando a linha 26 entrar em LTS e decidir se o piso sobe (decisão registrada em ADR).

## Histórico de verificações

- 2026-10-14T10:18:00-03:00 · buddy-dev (claude-code-c33594) · criação da ficha
