# Banco de conhecimento

**Classe:** CONHECIMENTO · Fonte de verdade para fatos externos que o projeto usa.

Regra: **conhecimento não vem da memória do modelo.** Todo fato externo (versão, preço, limite, licença, comportamento de ferramenta) entra aqui verificado ao vivo, com fonte e data, antes de virar premissa de SPEC, plano ou código.

## Formato de uma ficha

Uma ficha por tema, com endereço fixo (`<tema>.md`). O conteúdo envelhece; por isso cada ficha tem:

1. **Cabeçalho:** classe, última verificação (carimbo de Curitiba) e estado (`vigente`, `a reverificar`, `obsoleta`).
2. **O que importa para o buddy:** 2 a 5 linhas.
3. **Fatos verificados:** tabela com fato, fonte (tier) e data.
4. **Explicação:** o porquê, em linguagem de aula.
5. **Implicações:** o que muda no projeto.
6. **Histórico de verificações:** append-only; nunca se apaga uma verificação antiga.

## Tiers de fonte

| Tier | Fonte |
|---|---|
| 0 | Documentação oficial, especificação, texto de licença |
| 1 | Repositório oficial (releases, tags, código) |
| 2 | Comunidade verificada (fórum oficial, mantenedores) |
| 3 | Blogs técnicos e cobertura independente |
| 4 | Web genérica (só como pista, nunca como prova) |

Antes de qualquer tier: a casa e a família (este repositório, o [Blog](https://rabelus.online) e os corpus dos irmãos).

## Fichas

| Ficha | Tema | Última verificação |
|---|---|---|
| [relogio-e-fuso.md](./relogio-e-fuso.md) | Hora de Curitiba, tzdata, fontes de relógio | 2026-10-14 |
| [node-runtime.md](./node-runtime.md) | Versões do Node.js | 2026-10-14 |
| [padroes-comunidade-oss.md](./padroes-comunidade-oss.md) | Licença, código de conduta, changelog, commits, ADR | 2026-10-14 |
| [github-plataforma.md](./github-plataforma.md) | Plano, proteções de branch, segurança | 2026-10-14 |
