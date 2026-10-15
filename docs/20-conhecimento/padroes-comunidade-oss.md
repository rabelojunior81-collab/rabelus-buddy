# Padrões da comunidade open source

**Classe:** CONHECIMENTO · **Última verificação:** 2026-10-14T10:29:20-03:00 · **Estado:** vigente

## O que importa para o buddy

O repositório adota padrões amplamente reconhecidos, nas versões vigentes conferidas na fonte: Apache-2.0, Contributor Covenant 3.0, Keep a Changelog 1.1.0, Conventional Commits 1.0.0, SemVer 2.0.0 e MADR 4.0.0 para decisões.

## Fatos verificados

| Fato | Fonte | Verificado em |
|---|---|---|
| Texto da Apache License 2.0; sha256 `cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30` (202 linhas) | https://www.apache.org/licenses/LICENSE-2.0.txt (tier 0) | 2026-10-14 |
| Contributor Covenant: versão mais recente **3.0**; texto em `/version/3/0/code_of_conduct/code_of_conduct.md` | https://www.contributor-covenant.org/ (tier 0) | 2026-10-14 |
| Tradução oficial pt-BR existe apenas para a **2.1** | https://www.contributor-covenant.org/translations (tier 0) | 2026-10-14 |
| Keep a Changelog: especificação 1.1.0; release do repositório `v1.1.1` | https://keepachangelog.com/pt-BR/1.1.0/ · `olivierlacan/keep-a-changelog` (tier 0/1) | 2026-10-14 |
| Conventional Commits: **1.0.0** é a versão final; há rascunho `next` | `conventional-commits/conventionalcommits.org` (tier 1) | 2026-10-14 |
| SemVer: **2.0.0** | `semver/semver` releases (tier 1) | 2026-10-14 |
| MADR: release mais recente **4.0.0** (2024-09-17) | `adr/madr` releases (tier 1) | 2026-10-14 |

## Explicação

- **Apache-2.0** é permissiva e inclui concessão explícita de patentes (seção 3) e regra de contribuição (seção 5): quem contribui licencia sob os mesmos termos, sem precisar de CLA. Combina com o uso do projeto como material de aulas e publicações.
- **Contributor Covenant 3.0** troca a lista de proibições por comportamentos incentivados e restritos e traz uma escada de reparação de danos.
- **Keep a Changelog** separa o histórico para humanos do log do git; **SemVer** dá significado aos números de versão; **Conventional Commits** torna o log legível por máquina (e prepara changelog automático).
- **MADR** é um formato leve de *Architecture Decision Record*: contexto, opções, decisão, consequências.

## Implicações

- `CODE_OF_CONDUCT.md` em inglês é o canônico; `CODE_OF_CONDUCT.pt-BR.md` é tradução de cortesia, marcada como não oficial.
- Decisões de arquitetura em `docs/60-decisoes/` no formato MADR 4.0.0.

## Histórico de verificações

- 2026-10-14T10:29:20-03:00 · buddy-dev (claude-code-c33594) · criação da ficha
