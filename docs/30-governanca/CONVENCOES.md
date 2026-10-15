# Convenções

**Classe:** CÂNONE · **Versão:** 0.1 · **Data:** 2026-10-14

Tudo aqui é conferido por ferramenta (`bd names-check`, `bd guard`, `bd post`, CI). Se uma convenção não puder ser conferida, ela não deveria estar aqui.

## Hora

- Zona: `America/Sao_Paulo` (Curitiba). Sempre com offset. Fonte única: `scripts/lib/time.mjs`.
- Formatos: ISO `2026-10-14T10:38:13-03:00` (texto) e carimbo `2026-10-14T103813-0300` (nomes de arquivo).

## Nomes

- **Documentos vivos têm endereço fixo:** `README.md`, `AGENTS.md`, `METODO.md`, `ROADMAP.md`, fichas de conhecimento. O conteúdo muda; o nome não.
- **Registros têm carimbo:** `docs/registros/`, ledger, `archive/`, changelog arquivado. Gere com `npm run bd -- name "Título" --ext md`.
- Diário: `.buddy-dev/diario/AAAA-MM-DD.md`.
- ADRs: `docs/60-decisoes/NNNN-slug.md`. SPECs: `docs/40-specs/NNNN-slug/SPEC.md`.
- Caminhos em ASCII, sem espaço. Exceção: `docs/00-proveniencia/`, que preserva os nomes originais.

## Idiomas

- pt-BR é o idioma primário; inglês é espelho ([ADR 0002](../60-decisoes/0002-idiomas-pt-br-e-en.md)).
- **Superfície pública com espelho `.en.md`:** `README`, `CONTRIBUTING`. `SECURITY` é bilíngue no mesmo arquivo. `CODE_OF_CONDUCT.md` é o texto canônico em inglês, com tradução de cortesia `.pt-BR.md`.
- Documentação interna (governança, specs, planos, conhecimento, corpus do buddy-dev): só pt-BR.
- Código *(aceita pelo Pai em 2026-10-15)*: identificadores em inglês (padrão global de código aberto); comentários e mensagens das ferramentas de desenvolvimento em pt-BR; strings do produto sempre via catálogo de tradução em `locales/`.

## Git

- Branch: `<tipo>/<slug>`, com o identificador da fase quando houver (`feat/f0-5-governanca-e-roadmap`).
- Commits: [Conventional Commits 1.0.0](https://www.conventionalcommits.org/pt-br/v1.0.0/). Tipo e escopo em inglês (`feat`, `fix`, `docs`, `chore`, `refactor`, `test`); descrição em pt-BR. Mensagens longas por `git commit -F -`.
- Commit com IA leva o trailer `Co-Authored-By: <modelo> <noreply@…>`.
- Um commit, uma mudança coerente; push logo depois.
- PR pelo template; com CI verde e `bd post` limpo, o buddy-dev faz o merge por *merge commit* (ADR 0003).

## Fim de linha

LF em tudo (`.gitattributes`), exceto `docs/00-proveniencia/**`, que preserva os bytes originais.
