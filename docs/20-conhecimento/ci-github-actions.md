# CI: GitHub Actions e varredura de segredos

**Classe:** CONHECIMENTO · **Última verificação:** 2026-10-14T10:44:00-03:00 · **Estado:** vigente

## O que importa para o buddy

A CI roda em todo PR e em push na `main`: testes, lint de nomes, guarda contra exclusão e varredura de segredos. As actions são fixadas por SHA de commit, não por tag (uma tag pode ser movida; um SHA não). A varredura usa o binário do gitleaks (MIT), não a gitleaks-action (licença própria desde a v2).

## Fatos verificados

| Fato | Fonte | Verificado em |
|---|---|---|
| `actions/checkout` mais recente: **v7.0.1** (2026-07-20), commit `3d3c42e5aac5ba805825da76410c181273ba90b1` | API do GitHub, releases e `git/ref/tags` (tier 1) | 2026-10-14 |
| `actions/setup-node` mais recente: **v7.1.0** (2026-10-08), commit `949feb2413d6458794dcd2491c4babbbce0c15c1` | idem (tier 1) | 2026-10-14 |
| `gitleaks` mais recente: **v8.30.1** (2026-03-21), licença **MIT**; asset `gitleaks_8.30.1_linux_x64.tar.gz`, sha256 `551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb` | `gitleaks/gitleaks` releases e checksums (tier 1) | 2026-10-14 |
| `gitleaks-action` **v3.0.0** (2026-05-30); licença deixou de ser MIT a partir da v2; contas pessoais dispensam chave, organizações precisam | README de `gitleaks/gitleaks-action` (tier 1) | 2026-10-14 |

## Explicação

Fixar por SHA é a defesa básica contra cadeia de suprimentos: se alguém comprometer o repositório de uma action e mover a tag, a CI continua rodando o código que foi revisado. O comentário ao lado do SHA mantém a versão legível.

Baixar um binário na CI só é seguro se o checksum for conferido contra a lista publicada pelo projeto, como o workflow faz.

## Implicações

- Atualizar uma action = verificar a release nova, trocar SHA e comentário, atualizar esta ficha.
- Quando o repositório ficar público, avaliar Dependabot para as actions (atualiza SHAs por PR).

## Histórico de verificações

- 2026-10-14T10:44:00-03:00 · buddy-dev (claude-code-c33594) · criação da ficha
