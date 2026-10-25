# Dependências

**Classe:** CÂNONE · **Versão:** 0.1 · **Data:** 2026-10-15 · **Origem:** ordem do Pai em 2026-10-15: "Deve ser garantido protocolo/processo/rotina de atualizações. E se replicar a toda e qualquer nova adição de dependência."

Toda dependência, de produção ou de desenvolvimento, em qualquer `package.json` do repositório (raiz e workspaces), segue este protocolo. Ele é conferido pelo `bd deps`, que roda no `bd post` e na CI.

## O registro

[`dependencias.json`](./dependencias.json) é a única lista do que pode ser instalado. Cada entrada tem:

| Campo | O que é |
|---|---|
| `name`, `version` | pacote e **versão exata** (nada de `^`, `~`, `*`, `x` ou `latest`) |
| `license` | licença do pacote, dentro da lista `licenses` (compatível com Apache-2.0) |
| `kind` | `runtime` (vai com o produto) ou `dev` (só desenvolvimento) |
| `status` | `aprovada` (pode instalar) ou `proposta` (aguarda o Pai; não pode instalar) |
| `purpose`, `phase` | para que serve e em que marco entra |
| `ficha` | ficha de conhecimento com fonte e data |
| `verifiedAt` | última verificação ao vivo (versão, licença, notas de segurança) |
| `approvedBy` | quem aprovou e quando (`Pai, AAAA-MM-DD`) ou `pendente` |

## O que o `bd deps` reprova

1. Dependência instalada fora do registro.
2. Versão que não seja exata, ou diferente da registrada.
3. Dependência instalada com `status` diferente de `aprovada`.
4. Seção errada: `runtime` em `devDependencies`, ou o contrário.
5. Licença fora da lista permitida.
6. Entrada sem algum campo, ou com ficha inexistente.
7. `verifiedAt` mais velho que `reverifyDays` (30 dias): a dependência precisa ser reverificada.
8. Dependências instaladas sem `package-lock.json` versionado.
9. Script de instalação liberado (`allowScripts`) sem `installScripts: "aprovado"` no registro.

## Adicionar uma dependência (sempre nesta ordem)

1. **Pesquisa ao vivo:** versão *latest*, licença, manutenção, alternativas, notas de segurança. Tudo vai para a ficha em `docs/20-conhecimento/`.
2. **Registro** em `dependencias.json` com `status: proposta`.
3. **Aprovação do Pai** pela SPEC ou pelo PR. Só então `status: aprovada` e `approvedBy`.
4. **Instalação** com versão exata (`npm install --save-exact`), com o `package-lock.json` no mesmo commit.
5. `bd deps` verde.

## Dependências transitivas e scripts de instalação

- **Transitivas:** o registro lista as diretas; as transitivas (57 pacotes na árvore em 2026-10-16) ficam **fixadas pelo `package-lock.json`** e são conferidas na CI por `npm audit --audit-level=high` (alta ou crítica reprova). Atualizar uma direta atualiza o lockfile no mesmo PR.
- **Scripts de instalação:** ficam bloqueados (padrão do npm). Quando um pacote pede script, a decisão fica explícita em `allowScripts` no `package.json`: `false` (negado) por padrão; `true` só com `installScripts: "aprovado"` no registro, depois de ler o script. Em 2026-10-16, `@google/genai` pediu um `preinstall` que só faz `echo`; negado. Em 2026-10-25, `koffi` e `node-pty` (dependências do `@microsoft/mxc-sdk`, ADR 0019) pediram scripts que compilam ou baixam binários nativos; negados, porque o pacote já traz os binários dos três sistemas (provado no spike do M2).

## Rotina de atualização

| Quando | O quê | Mecanismo |
|---|---|---|
| A cada `bd post` e a cada PR | o registro bate com o que está instalado; nenhuma verificação vencida | `bd deps` (local e CI) |
| Toda segunda-feira | consulta ao registro do npm: o que tem versão nova | workflow agendado `dependencias.yml` (`bd deps --latest`), com o resultado no resumo do job |
| Ao vencer `verifiedAt` (30 dias) | reverificar a ficha (versão, licença, changelog, segurança) e decidir: manter ou atualizar | `bd deps` reprova até a reverificação |
| Ao atualizar | ler o changelog entre as versões, atualizar a ficha, o registro e o `package-lock.json` no mesmo PR, rodar toda a suíte | `bd deps` + `bd test-guard` + CI |
| Versão nova com mudança que quebra | nova revisão da SPEC que usa a dependência, se o contrato mudar | METODO §3 |

## Relação com o GitHub

Os alertas do Dependabot estão desligados neste repositório (a API respondeu 404 em 2026-10-15). Ligá-los é configuração do repositório e cabe ao Pai. O protocolo acima não depende deles.
