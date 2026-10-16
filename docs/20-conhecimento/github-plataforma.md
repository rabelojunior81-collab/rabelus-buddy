# GitHub: plano, proteções e segurança

**Classe:** CONHECIMENTO · **Última verificação:** 2026-10-16T00:26:30-03:00 · **Estado:** vigente (plano da conta: **Free**, medido)

## O que importa para o buddy

Enquanto o repositório for privado numa conta Free, a plataforma não bloqueia push direto na `main`: o fluxo branch → PR → merge é garantido por convenção, CI e pela regra de que só se mergeia com CI verde (ADR 0003). Ao tornar público, ativar rulesets e *private vulnerability reporting*.

## Fatos verificados

| Fato | Fonte | Verificado em |
|---|---|---|
| Rulesets: disponíveis em repositórios públicos no Free; em privados, só Pro, Team e Enterprise Cloud | https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets (tier 0) | 2026-10-14 |
| Pedido da comunidade por proteção básica gratuita em privados (indica ausência no Free) | https://github.com/orgs/community/discussions/174400 (tier 2) | 2026-10-14 |
| *Private vulnerability reporting* documentado (página responde 200) | https://docs.github.com/en/code-security/security-advisories/working-with-repository-security-advisories/configuring-private-vulnerability-reporting-for-a-repository (tier 0) | 2026-10-14 |
| `gh` 2.102.0 autenticado como `rabelojunior81-collab`, escopos `repo`, `workflow` | `gh auth status` | 2026-10-14 |
| Plano da conta não visível pela API com o token atual | `gh api user --jq .plan` → vazio | 2026-10-14 |
| **Conta Free**: `GET /repos/…/rulesets` e `GET /repos/…/branches/main/protection` no repositório privado respondem 403 "Upgrade to GitHub Pro or make this repository public to enable this feature." | `gh api` (medição) | 2026-10-15 |
| `gh` 2.102.0 com escopos `gist`, `read:org`, `repo`, `workflow` | `gh auth status` | 2026-10-15 |
| Configuração do repositório alterada pela API (`PATCH /repos/…`), com autorização do Pai: `delete_branch_on_merge=true`, `allow_squash_merge=false`, `allow_rebase_merge=false`, `allow_merge_commit=true`; leitura de volta confirmou os quatro valores | `gh api` (medição) | 2026-10-16 |

## Implicações

- Merge sempre por *merge commit* (sem squash), para preservar o histórico granular.
- Em 2026-10-14 a política de permissões do harness bloqueou um merge do buddy-dev sem autorização explícita; em 2026-10-15, com a ordem do Pai, os merges #1–#7 passaram. O merge é do buddy-dev após validação (ADR 0003).
- Checklist de abertura pública: rulesets na `main`, PVR ligado, Dependabot, CodeQL (a verificar na época).

## Histórico de verificações

- 2026-10-14T10:05:00-03:00 · buddy-dev (claude-code-c33594) · criação da ficha
- 2026-10-15T04:24:23-03:00 · buddy-dev (claude-code-vs-code-438d04) · plano Free confirmado pela resposta 403 das APIs de rulesets e proteção
- 2026-10-16T00:26:30-03:00 · buddy-dev (claude-code-vs-code-6265a4) · auto-delete de branches e só merge commit ligados
