# GitHub: plano, proteções e segurança

**Classe:** CONHECIMENTO · **Última verificação:** 2026-10-14T10:05:00-03:00 · **Estado:** vigente (plano da conta: **a confirmar**)

## O que importa para o buddy

Enquanto o repositório for privado numa conta Free, a plataforma não bloqueia push direto na `main`: o fluxo branch → PR → merge é garantido por convenção, CI e pela regra de que o merge é do Pai. Ao tornar público, ativar rulesets e *private vulnerability reporting*.

## Fatos verificados

| Fato | Fonte | Verificado em |
|---|---|---|
| Rulesets: disponíveis em repositórios públicos no Free; em privados, só Pro, Team e Enterprise Cloud | https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets (tier 0) | 2026-10-14 |
| Pedido da comunidade por proteção básica gratuita em privados (indica ausência no Free) | https://github.com/orgs/community/discussions/174400 (tier 2) | 2026-10-14 |
| *Private vulnerability reporting* documentado (página responde 200) | https://docs.github.com/en/code-security/security-advisories/working-with-repository-security-advisories/configuring-private-vulnerability-reporting-for-a-repository (tier 0) | 2026-10-14 |
| `gh` 2.102.0 autenticado como `rabelojunior81-collab`, escopos `repo`, `workflow` | `gh auth status` | 2026-10-14 |
| Plano da conta não visível pela API com o token atual | `gh api user --jq .plan` → vazio | 2026-10-14 |

## Implicações

- Merge sempre por *merge commit* (sem squash), para preservar o histórico granular.
- O merge é ato do Pai: a política de permissões do harness do buddy-dev bloqueia merge sem revisão (medido em 2026-10-14, PR #1).
- Checklist de abertura pública: rulesets na `main`, PVR ligado, Dependabot, CodeQL (a verificar na época).

## Histórico de verificações

- 2026-10-14T10:05:00-03:00 · buddy-dev (claude-code-c33594) · criação da ficha
