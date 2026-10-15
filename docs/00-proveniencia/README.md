# Proveniência — material de origem

**Classe:** PROVENIÊNCIA · **Importado em:** 2026-10-14T10:17:33-03:00 · **Regra:** somente leitura; bytes preservados (`.gitattributes`: `-text`)

## De onde veio

| Item | Valor |
|---|---|
| Origem física | `C:\Users\rabel\Desktop\sandbox\gemini-argon` (pasta preservada no lugar; não foi apagada) |
| Commit de importação | `49eab34` — conteúdo intocado |
| Briefing | `BRAINSTORM.md`, escrito pelo Pai, com as decisões da seção 9 registradas em 2026-10-13 |
| Pesquisa e relatório | **Claude Haiku 5.5**, via OpenCode Go / OpenCode CLI, com muitos subagentes. O limite de 5 horas acabou antes do fim; o Pai concluiu as últimas etapas com o **Step 5 Preview**. |
| Data de corte declarada | 2026-10-14 (no próprio relatório) |

O nome da pasta de origem (`gemini-argon`) **não** indica o autor: o Gemini 4 Argon não participou. Registrado aqui para que nenhuma instância futura repita a inferência errada que o buddy-dev chegou a levantar como hipótese.

## Integridade (sha256 no momento da importação)

| sha256 | Arquivo |
|---|---|
| `9db54204290f646c05013ac8e6fb91ac3ce7c1bd5d65f5e29e3f15e3cde06de6` | `BRAINSTORM.md` |
| `35541f92768363b3c4a8099fc7363e4a46c3f3d71490d712ff106eaeb59ae0ec` | `reports/Harness agnóstico para agentes de IA.md` |
| `9fb4b15df30bad0e014451326b1e361d85f9a6bff5de3ccabd167f917953d866` | `research_notes/…/01_runtime_protocolos.md` |
| `b47158f098e1a1d19d110f8cfafc937fb92ad84d56fdfb3c5c6e1fb2b4b8d51d` | `research_notes/…/02_provedores_sdks.md` |
| `ca6962ca42106f3da7cb4bcf680fe36c3bb3cf55f0f28c74bf2768468c03a3d8` | `research_notes/…/03_langchain_observabilidade.md` |
| `7c2c08a5b5d4fb8d1c67e20bd2377afa2503a6ce44431d14fa9e7ced8bd3f631` | `research_notes/…/04_workspaces_containers.md` |
| `cb4e0c1e608e9ac8c39e6ea531a088575746c2d31af1fc1b8f774971108411e8` | `research_notes/…/05_gateway_canais.md` |
| `c1118c2462cc249241a8d4d848efbc48e2734e02bc9c2293a057a68f2b6a2949` | `research_notes/…/06_sessoes_persistencia.md` |
| `2a097097aba13787b1335774ca8767852763a9906b600c249f12449c2c65cca1` | `research_notes/…/07_memoria_identidade_openwiki.md` |
| `f640f59e12018c343b942f14f138ac01dfe525714e12a6d85df318362c63fbcc` | `research_notes/…/08_seguranca_governanca.md` |
| `4bde1dc4151b93e46da4f5f69acb37afade419c9e53154a027a740d7edbabfb6` | `research_notes/…/09_linguagens_composicao.md` |
| `46ea6dc3f946388bb7fb8d438bc54183fe0d6768f3bd6198bee1e7406f88bd6f` | `research_notes/…/10_operacao_custos_plataformas.md` |
| `9d85c5f4f96d5242bea3ce63ff01572af1058bc2f32dd2c02d9e578b262575ed` | `research_notes/…/11_projetos_opencode_hermes.md` |
| `b88a5d1eb106dfe823167b197846faf047c966ac3c21b824e89be14694c1a7cf` | `research_notes/…/12_projetos_deepseek_buzz.md` |

Conferência: `(cd docs/00-proveniencia && find . -type f ! -name README.md -print0 | sort -z | xargs -0 sha256sum)`.

## Limites conhecidos deste material

Levantados pelo buddy-dev em 2026-10-14, antes da organização. Não são corrigidos aqui; a **Revisão 0.2** (Fase 0.7 do [roadmap](../50-planos/ROADMAP.md)) os trata em `docs/10-pesquisa/`.

1. Orçamento otimista: o custo da camada de trabalho ignora o tokenizador ~30% mais verboso da Anthropic e a escrita de cache a 1,25x, documentados na própria nota 02. Total provável acima de US$ 50/mês.
2. Comparação distorcida: "Opus 5.5 ≈ US$ 160" é cenário sem cache contra Sonnet com cache.
3. Premissa de uso (1.000 interações de 30k tokens) subestima o laço agêntico, em que uma tarefa faz dezenas de chamadas.
4. Sandbox pesquisado só para Windows; macOS e Linux sem cobertura.
5. Fadiga de aprovação não tratada (8 classes exigem aprovação; não há escopo por sessão ou padrão).
6. Escopo completo sem nenhuma estimativa de esforço para um desenvolvedor.
7. Concorrência tratada como detalhe, não como premissa fundacional (lição da família: "A concorrência devia estar na fundação", Blog, 2026-10-06).
8. Inconsistências textuais: trechos corrompidos no relatório ("querDonos", "Consumptioníveis"); "Gemini 3.5 Flash-Lite" no relatório contra "Gemini 3.8 Flash" na nota 10.
9. Colisão de nome: "Buddy" já é um produto de CI/CD (Buddy.Works). Decisão do Pai: nome público **Rabelus Buddy**; "buddy" na intimidade.
