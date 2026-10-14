# R6 — Colisão de nome

**Revisão:** 0.2 · **Limite tratado:** 9 · **Autor:** buddy-dev (claude-code-5c038b), com extração por subagente conferida por amostragem · **Data:** 2026-10-14 · **Não é aconselhamento jurídico.**

## Resumo

"Rabelus" parece livre. "Buddy" sozinho é um nome lotado no software, inclusive no espaço de agentes de IA. A decisão do Pai ([ADR 0007](../../60-decisoes/0007-nome-publico-rabelus-buddy.md)) de usar **Rabelus Buddy** em público, com a marca da casa sempre na frente, é a que reduz o risco. A pesquisa recomenda que **"buddy" sozinho não seja o nome do binário da CLI nem do pacote**.

## Fatos verificados

Conferência do buddy-dev: 6 amostras checadas diretamente (marcadas ✔); o resto é extração do subagente, com fonte.

| Fato | Fonte | Data |
|---|---|---|
| ✔ Buddy.Works (CI/CD) oferece hoje **sandboxes para agentes de IA** (MCP, SDK `@buddy-works/sandbox-sdk`) | https://buddy.works/docs/sandboxes/ai-agents | 2026-10-14 |
| ✔ Tencent tem **CodeBuddy Code** (agente de código em terminal) e **WorkBuddy** (agente de desktop) | https://www.workbuddy.ai/docs/cli/overview | 2026-10-14 |
| Registro americano BUDDY, classe 42 (SaaS de gestão de código e processo de desenvolvimento), Reg. 5002371, vivo; dono não confirmado (provavelmente Buddy.Works) | agregador Justia (tier 3), não conferido no USPTO | 2026-10-14 |
| Registro americano BUDDY, classe 9 (software com IA), Reg. 7835711, AI Buddy, Inc. | agregador TrademarkElite (tier 3), não conferido no USPTO | 2026-10-14 |
| Nenhuma marca "RABELUS" encontrada por busca web | busca web (tier 4); registros oficiais não consultáveis automaticamente | 2026-10-14 |
| ✔ npm `rabelus-buddy`: 404 (livre) | https://registry.npmjs.org/rabelus-buddy | 2026-10-14 |
| ✔ PyPI `rabelus-buddy`: 404 (livre) | https://pypi.org/pypi/rabelus-buddy/json | 2026-10-14 |
| crates.io `rabelus-buddy`: 404 (livre); org npm `rabelus`: página 404 | APIs dos registros | 2026-10-14 |
| ✔ GitHub `rabelus`: 404 (livre); `rabelus-lab` e `rabeluslab` também | API do GitHub | 2026-10-14 |
| ✔ npm `buddy` 6.14.7 instala o binário `buddy`; `buddy-cli` e `buddy.js` também | https://registry.npmjs.org/buddy | 2026-10-14 |
| ~109 mil repositórios com "buddy" no nome; ~13,7 mil com "buddy ai"; há um agente de código local chamado `code-buddy` | busca da API do GitHub | 2026-10-14 |

## Recomendações

1. **Nome público:** sempre "Rabelus Buddy" (README, site, lojas, pacote). Mantido.
2. **Pacote:** `rabelus-buddy` no npm (livre). Considerar reservar o escopo `@rabelus` quando houver o que publicar.
3. **Binário da CLI:** não usar `buddy`. Candidatos: `rbuddy` ou `rabelus-buddy` (com alias curto opcional que o usuário configura). **Decisão do Pai.**
4. **Antes de tornar público:** buscas manuais nos registros oficiais (o subagente não conseguiu consultá-los automaticamente):
   - USPTO (tmsearch.uspto.gov): `buddy` e `*buddy*`, vivos, classes 9 e 42; `rabelus`; TSDR do serial 86827389 para confirmar o dono.
   - TMview (tmdn.org/tmview): `BUDDY` e `*BUDDY*`, classes 9 e 42; `RABELUS`.
   - INPI (busca.inpi.gov.br): `BUDDY` (radical), NCL 9 e 42; `RABELUS`; `RABELUS BUDDY`.
   - WIPO Global Brand Database: `BUDDY` 9/42 e `RABELUS`.
   - Avaliar uma busca de anterioridade profissional no BR (e, se houver ambição internacional, EU e US).
5. **Registro próprio:** considerar o depósito de "RABELUS" (e talvez "RABELUS BUDDY") no INPI. Decisão e custo são do Pai.

## Estado do limite 9

**Parcialmente resolvido:** o nome público já mitiga a colisão; pacote e namespaces estão livres; a verificação oficial de marcas exige busca manual (passos acima) e fica como pendência de abertura pública.
