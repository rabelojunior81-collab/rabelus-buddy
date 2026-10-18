# CI: GitHub Actions e varredura de segredos

**Classe:** CONHECIMENTO · **Última verificação:** 2026-10-18T12:57:11-03:00 · **Estado:** vigente

## O que importa para o buddy

A CI roda em todo PR e em push na `main`: testes, lint de nomes, guarda contra exclusão e varredura de segredos. As actions são fixadas por SHA de commit, não por tag (uma tag pode ser movida; um SHA não). A varredura usa o binário do gitleaks (MIT), não a gitleaks-action (licença própria desde a v2).

## Fatos verificados

| Fato | Fonte | Verificado em |
|---|---|---|
| `actions/checkout` mais recente: **v7.0.1** (2026-07-20), commit `3d3c42e5aac5ba805825da76410c181273ba90b1` | API do GitHub, releases e `git/ref/tags` (tier 1) | 2026-10-14 |
| `actions/setup-node` mais recente: **v7.1.0** (2026-10-08), commit `949feb2413d6458794dcd2491c4babbbce0c15c1` | idem (tier 1) | 2026-10-14 |
| `gitleaks` mais recente: **v8.30.1** (2026-03-21), licença **MIT**; asset `gitleaks_8.30.1_linux_x64.tar.gz`, sha256 `551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb` | `gitleaks/gitleaks` releases e checksums (tier 1) | 2026-10-14 |
| Conta pessoal GitHub Free: **2.000 minutos por mês** para repositórios privados, zerados no início do mês; runners padrão **grátis em repositório público**. Preço por minuto além da cota: Linux 2 núcleos US$ 0,006, Windows US$ 0,010, macOS US$ 0,062 (cerca de 10× o Linux). Sem forma de pagamento válida, a cota esgotada **bloqueia** os jobs | docs.github.com, "GitHub Actions billing" (tier 1) | 2026-10-18 |
| Consumo medido em outubro de 2026 (100 execuções, duração dos jobs arredondada ao minuto): Linux 375, Windows 300, macOS 112 minutos, **≈ 2.095 ponderados**, com o macOS sozinho em 1.120. Em 18/10, os jobs pararam com "recent account payments have failed or your spending limit needs to be increased"; o Pai atualizou o plano no mesmo dia | API do GitHub, `actions/runs` e `jobs` (tier 1) | 2026-10-18 |
| `gitleaks-action` **v3.0.0** (2026-05-30); licença deixou de ser MIT a partir da v2; contas pessoais dispensam chave, organizações precisam | README de `gitleaks/gitleaks-action` (tier 1) | 2026-10-14 |

## Plano de minutos (2026-10-18)

Cada combinação de sistema e Node roda **uma vez, onde agrega**. A decisão é do `bd ci-plan` (`scripts/lib/ciplan.mjs`, com teste):

| Evento | O que roda |
|---|---|
| PR com código | regras + Linux Node 24 (no job de regras) + Linux Node 26 + Windows Node 26 (o ambiente do Pai) + gitleaks |
| PR só de documentação | regras (sem suíte) + gitleaks; a matriz é pulada, e o `bd merge` aceita o pulado |
| Merge na `main` com código | regras + **macOS Node 26** + gitleaks (o PR já testou o mesmo resultado de merge nos outros sistemas) |
| Toda segunda, 10:00, ou manual | a matriz completa (3 sistemas × Node 24 e 26), contra deriva |

Commit novo num PR cancela a execução anterior. O cache do npm encurta a instalação. Cada job tem tempo máximo.

Estimativa por PR de código até o merge: de cerca de 82 minutos ponderados para cerca de 24 (−70%). PR só de documentação: de cerca de 82 para cerca de 5.

## Explicação

Fixar por SHA é a defesa básica contra cadeia de suprimentos: se alguém comprometer o repositório de uma action e mover a tag, a CI continua rodando o código que foi revisado. O comentário ao lado do SHA mantém a versão legível.

Baixar um binário na CI só é seguro se o checksum for conferido contra a lista publicada pelo projeto, como o workflow faz.

## Implicações

- Atualizar uma action = verificar a release nova, trocar SHA e comentário, atualizar esta ficha.
- Se o repositório ficar público, os minutos dos runners padrão deixam de contar (decisão do Pai, não tomada).
- Quando o repositório ficar público, avaliar Dependabot para as actions (atualiza SHAs por PR).

## Histórico de verificações

- 2026-10-14T10:44:00-03:00 · buddy-dev (claude-code-c33594) · criação da ficha
- 2026-10-18T12:57:11-03:00 · buddy-dev (claude-code-vs-code-d6ff5c) · cota de minutos, preços, consumo medido e o plano de minutos
