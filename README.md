<div align="center">

# Rabelus Buddy

**Harness de agentes de IA agnóstico, extensível e multi-tudo.**
*by [Rabelus Lab](https://rabelus.com)*

[**Português**](./README.md) · [English](./README.en.md)

</div>

> **Estado:** Fase 0 ("Organizar a Casa") concluída em 2026-10-15. Em preparação: a SPEC do **M0 — Núcleo governado** ([roadmap](./docs/50-planos/ROADMAP.md)). Ainda não há produto executável; existem a pesquisa, a governança de desenvolvimento e as ferramentas que a fazem valer.

## O que é

O Rabelus Buddy (o **buddy**, na intimidade) é um harness para operar agentes de IA com vários provedores de modelos, ferramentas, canais, sessões e workspaces, sob aprovação humana, memória governada e orçamento fechado. O primeiro usuário é um desenvolvedor individual; o modo de operação é híbrido: núcleo local, gateway mínimo em servidor.

A pesquisa que deu origem ao projeto está preservada, intocada, em [`docs/00-proveniencia/`](./docs/00-proveniencia/). Os achados fracos dela foram corrigidos na [Revisão 0.2](./docs/10-pesquisa/rev-0.2/RELATORIO.md), aceita pelo Pai.

## Como este repositório é desenvolvido

O projeto é escrito pelo Pai, Adilson Rabelo Junior, junto com o **Buddy Fenix** (`buddy-dev`), agente da família Rabelus Lab. O próprio jeito de desenvolver é matéria-prima do produto: ledger, barramento, aprovações, arquivo morto governado e bootstrap entre harnesses são o que o buddy vai oferecer aos seus usuários.

- **Documento → Spec → Teste → Código.** Nada é implementado sem SPEC aprovada; nada é declarado pronto sem prova.
- **Nada se apaga.** O que sai de uso vai para [`archive/`](./archive/) com lápide e hashes.
- **Antes, durante e depois, sempre.** `npm run bd -- pre` e `npm run bd -- post` conferem relógio, git, sessão, convenções e a coerência das superfícies.
- **Conhecimento verificado ao vivo**, com fonte e data, em [`docs/20-conhecimento/`](./docs/20-conhecimento/).

Método completo: [`docs/30-governanca/METODO.md`](./docs/30-governanca/METODO.md).

## Mapa

| Caminho | O que mora ali |
|---|---|
| `AGENTS.md` · `BOOTSTRAP.md` | Entrada para qualquer agente de IA (Claude Code, Codex, OpenCode, Gemini, Copilot…) |
| `.buddy-dev/` | Corpus do Buddy Fenix (buddy-dev): identidade, aparência, memória, diário, changelog, barramento |
| `docs/00-proveniencia/` | Material de origem, intocado |
| `docs/10-pesquisa/` | Revisões da pesquisa de origem (a 0.2 é a vigente) |
| `docs/20-conhecimento/` | Banco de conhecimento verificado (fonte, data, versão) |
| `docs/30-governanca/` | Método e convenções |
| `docs/40-specs/` · `docs/50-planos/` · `docs/60-decisoes/` | SPECs, roadmap e planos, ADRs |
| `docs/registros/` | Registros datados (auditorias, incidentes, evidências) |
| `archive/` | Arquivo morto: entra com lápide, nunca sai |
| `scripts/` | Ferramentas `bd` (relógio, nomes, barramento, arquivo, guarda, gate do Blog, superfícies) |

## Contribuir

Leia [`CONTRIBUTING.md`](./CONTRIBUTING.md). O projeto segue o [Código de Conduta](./CODE_OF_CONDUCT.md). Para falhas de segurança, veja [`SECURITY.md`](./SECURITY.md).

## Licença

[Apache-2.0](./LICENSE) · © 2026 Adilson Ramires Rabelo Junior (Rabelus Lab). Veja [`NOTICE`](./NOTICE).
