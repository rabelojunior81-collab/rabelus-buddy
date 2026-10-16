# Como contribuir

[Português](./CONTRIBUTING.md) · [English](./CONTRIBUTING.en.md)

Obrigado pelo interesse. O Rabelus Buddy é desenvolvido por humanos e agentes de IA sob as mesmas regras. Elas são poucas e cada uma tem uma ferramenta que a confere.

## Em um minuto

1. **Antes:** `npm run bd -- pre`. Confere relógio (Curitiba, `America/Sao_Paulo`), branch, sincronia e sessão.
2. **Uma branch por unidade de trabalho:** `feat/…`, `fix/…`, `docs/…`, `chore/…`, `refactor/…`, `test/…`. Nunca trabalhe direto na `main`.
3. **Commits pequenos e frequentes, com push a cada um.** Mensagens em [Conventional Commits 1.0.0](https://www.conventionalcommits.org/pt-br/v1.0.0/): tipo e escopo em inglês, descrição em português (`feat(bus): ...`).
4. **Documento → Spec → Teste → Código.** Mudança de comportamento exige SPEC aprovada e teste antes do código.
5. **Nada se apaga.** Para tirar algo de uso: `npm run bd -- archive <caminho> --reason "..." --name "..."`. A CI reprova exclusões.
6. **Dependências** só pelo [protocolo](./docs/30-governanca/DEPENDENCIAS.md): registro, versão exata, aprovação, `bd deps` verde.
7. **Teste reprovado se corrige no código.** Remover ou enfraquecer teste reprova a CI (`bd test-guard`).
8. **Depois:** `npm test` e `npm run bd -- post`. Abra o PR pelo template. Com a CI verde, o merge é feito com *merge commit* (sem squash), para preservar o histórico granular.

## Requisitos

- Node.js **≥ 24.12** (LTS), que executa TypeScript sem build. Depois de clonar: `npm ci`. Antes do PR: `npm test` e `npm run typecheck`.
- Git com suporte a worktrees (para trabalho em paralelo).

## Nomes de arquivos

Documentos vivos têm endereço fixo (`README.md`, `docs/30-governanca/METODO.md`). Registros têm carimbo de Curitiba: `npm run bd -- name "Título do registro" --ext md` → `2026-10-14T102306-0300-titulo-do-registro.md`. Detalhes em [`docs/30-governanca/CONVENCOES.md`](./docs/30-governanca/CONVENCOES.md).

## Agentes de IA

Se você é um agente: comece por [`AGENTS.md`](./AGENTS.md). Commits feitos com IA levam o trailer `Co-Authored-By` identificando o modelo.

## Conduta

Este projeto segue o [Código de Conduta](./CODE_OF_CONDUCT.md) ([tradução pt-BR](./CODE_OF_CONDUCT.pt-BR.md)).

## Licença das contribuições

Ao contribuir, você concorda que sua contribuição é licenciada sob a [Apache-2.0](./LICENSE), conforme a seção 5 da licença.
