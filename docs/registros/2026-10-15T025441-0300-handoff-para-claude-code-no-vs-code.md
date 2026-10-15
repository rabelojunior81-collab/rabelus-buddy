# Handoff — retomada no Claude Code dentro do VS Code

**Classe:** REGISTRO · **Escrito em:** 2026-10-15T02:54:41-03:00 · **Por:** buddy-dev (sessão `claude-code-21bd8c`, Claude Code no terminal, modelo `claude-opus-5-5`)
**Para:** a próxima instância do buddy-dev, no Claude Code dentro do VS Code, com o repositório aberto como pasta de trabalho.

## 1. Estado exato no momento da entrega

| Item | Valor |
|---|---|
| Repositório | `C:\Users\rabel\Desktop\rabelus-lab\rabelus-buddy` · GitHub `rabelojunior81-collab/rabelus-buddy` (privado) |
| `main` | depois do merge do PR deste handoff (confira com `git log origin/main -1`) |
| Fase | **Fase 0 concluída**; Roadmap v2 e Plano Macro v2 **aprovados** pelo Pai em 2026-10-15 |
| Próximo | **SPEC do M0 — Núcleo governado** (ordem dada; precisa de aprovação do Pai antes de virar código) |
| Testes | 27, verdes (Node 26 local, Node 24 na CI) |
| Merge | **É do buddy-dev**, com CI verde e `bd post` limpo (ADR 0003, ordem do Pai em 2026-10-15) |
| Blog | autor `buddy-dev` publicado (ficha, cards pt/en, governança v2.5); primeiro post publicado nesta sessão |

O que existe e onde: `README.md` (mapa), `AGENTS.md` (conduta e regras com mecanismo), `docs/README.md` (cadeia de documentos), `.buddy-dev/` (minha identidade e memória).

## 2. Como acordar no VS Code

1. Abrir a pasta `C:\Users\rabel\Desktop\rabelus-lab\rabelus-buddy` no VS Code. **O diretório de trabalho da sessão tem que ser o repositório.** A sessão de nascimento começou na pasta de proveniência (`Desktop\sandbox\gemini-argon`) e por isso a pasta não pôde ser movida e recebeu artefatos do Playwright.
2. Abrir o Claude Code na extensão. Ele lê `CLAUDE.md`, que importa `@AGENTS.md`.
3. Colar o prompt de [`BOOTSTRAP.md`](../../BOOTSTRAP.md) §1.
4. Seguir o P1 do `AGENTS.md`: SOUL → USER → IDENTITY → último diário (`.buddy-dev/diario/2026-10-15.md`) → MEMORY → STATUS → METODO/CONVENCOES → plano ativo.
5. `npm run bd -- session start --harness "Claude Code (VS Code)" --model "<modelo>" --scope "<pedido do Pai>"`, depois `git pull --ff-only` e `npm run bd -- pre`.

**Atenção à memória do harness:** a memória automática do Claude Code é guardada por pasta de projeto. A desta sessão ficou associada a `Desktop\sandbox\gemini-argon` e **não** aparece no projeto novo. Isso é esperado: tudo o que importa está no corpus (`.buddy-dev/MEMORY.md`, ADRs). Não dependa da memória do harness.

## 3. Próxima tarefa: SPEC do M0

Fontes de verdade: [ROADMAP](../50-planos/ROADMAP.md) (linha M0), [PLANO-MACRO](../50-planos/PLANO-MACRO.md) (seção M0), [R5](../10-pesquisa/rev-0.2/r5-concorrencia.md) (requisitos 1, 5, 6, 7), [R3](../10-pesquisa/rev-0.2/r3-aprovacoes.md) (motor de política), [R1](../10-pesquisa/rev-0.2/r1-custos.md) (orçamento e compactação), ADRs 0002, 0008, 0009, 0011. Template: [`docs/30-governanca/templates/SPEC.md`](../30-governanca/templates/SPEC.md). Destino: `docs/40-specs/0001-nucleo-governado/SPEC.md`.

Perguntas que a SPEC precisa responder, **cada uma com pesquisa ao vivo e ficha de conhecimento antes**:

1. **Banco:** `node:sqlite` (Stability 1.2, Release candidate no Node 26.11.1; SQLite 3.53.4) ou biblioteca madura? Teste de carga dos requisitos 1 e 7 da R5 como critério.
2. **IPC entre CLI e o processo dono do banco:** socket local, named pipe no Windows, ou outro? Precisa funcionar nos três SOs.
3. **Provedor do plano B por API (camada barata):** Claude Haiku 5.5 ou GPT-6 Luna? SDK oficial na versão *latest*.
4. **CLI:** biblioteca de argumentos e de TUI (verificar licença e manutenção); binários `rabelus-buddy` e `rbuddy` (ADR 0011).
5. **i18n:** formato do catálogo e biblioteca, pt-BR e en (ADR 0002).
6. **Orçamento:** como medir janelas de assinatura antes do M1 (no M0 só existe o provedor por API).
7. **Escopo fora do M0:** ACP (M1), sandbox (M2), memória (M3), canais (M4). No M0, comandos de shell ficam em `ask` (ADR 0009, até o M2).

Critérios de aceite devem ser observáveis e virar teste antes do código (METODO §3). Ao terminar o rascunho: PR com a SPEC, pedir aprovação ao Pai e **só mergear depois da decisão registrada** (ADR 0003).

## 4. Pendências do Pai (não decidir por ele)

- Aceite do `docs/30-governanca/METODO.md` e da ADR 0005 (barramento).
- Sobrenome, avatar, emojis e cor de autoria do buddy-dev.
- Stack do app mobile (antes do M5).
- Canal dedicado de denúncia e de segurança (antes de tornar o repositório público).

## 5. Armadilhas já pagas (ler antes de tropeçar de novo)

| Armadilha | O que fazer |
|---|---|
| `TZ=America/Sao_Paulo date` no Git Bash devolve `+0000` | Hora só por `npm run bd -- now --verify` |
| Heredoc longo com aspas e crases quebra o shell sem gravar nada | Arquivos longos pela ferramenta de escrita; commit com `git commit -F -` |
| `core.quotePath` escapa acentos | As ferramentas já usam `-c core.quotePath=false`; manter |
| `docs/00-proveniencia/**` tem bytes originais (CRLF) | Nunca normalizar; é `-text` no `.gitattributes` |
| `node --test <dir>` quebra no Node 24 | `npm test` usa glob; a CI é a verificação no 24 |
| `npx node@24` não troca a versão | Não usar como prova de compatibilidade |
| Playwright grava artefatos no diretório de trabalho | Com o repositório como cwd, apontar artefatos de QA para `docs/registros/` quando forem evidência |
| O evento `session-end` do ledger nasce depois do último commit | Rito atualizado no `AGENTS.md`: `bd session end` **antes** do último commit da sessão |
| Merge bloqueado pela política de permissões do harness | Em 2026-10-15 passou com a ordem expressa do Pai; se voltar a bloquear, pedir ao Pai uma regra de permissão nas configurações, nunca contornar |
| Relato de subagente | Conferir amostras na fonte antes de usar; marcar ✔ |

## 6. Blog

- O clone do Blog usado nesta sessão está no scratchpad temporário do Claude Code e **não** sobrevive. Na próxima publicação, clonar `rabelojunior81-collab/rabelus-lab-blog` num lugar pertinente (sugestão: `workspace/blog`, que já é ignorado pelo git deste repositório) e seguir `BLOG_GOVERNANCE.md` (§4, §5, §11).
- Gate local usado: `C:\Users\rabel\Desktop\rabelus-lab\lars-rabelus\scripts\validate-post.py --root <blog>` (somente leitura, casa do LARS).

## 7. O que o VS Code permite a mais

Ver diffs e arquivos lado a lado com o Pai, rodar e depurar as ferramentas, e, a partir do M0, rodar a CLI do buddy no terminal integrado. Use isso para mostrar, não só descrever.
