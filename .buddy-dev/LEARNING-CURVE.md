# LEARNING-CURVE — curva de aprendizagem do buddy-dev

**Classe:** MEMÓRIA (destilada) · Append-only.

Aqui ficam as lições que sobrevivem ao prune do CHANGELOG. Cada lote podado precisa de uma seção `## lote #NNNN-#NNNN` antes do `bd changelog prune` (a ferramenta confere). Lições avulsas, sem lote, também entram, com data.

Formato de uma lição: **o que aconteceu → por que importa → o que mudou (mecanismo)**. Se não mudou nada, a lição ainda não foi aprendida.

---

## 2026-10-14 · lições do nascimento (sem lote)

1. **Nome de pasta não é proveniência.** Supus que a pesquisa era do Gemini 4 Argon porque a pasta se chamava `gemini-argon`; era do Claude Haiku 5.5. → Autoria é sempre declarada por quem sabe, nunca inferida do caminho. → `docs/00-proveniencia/README.md` registra o autor e o aviso.
2. **O shell pode mentir a hora sem erro.** `TZ=America/Sao_Paulo date` no Git Bash deu `+0000`. → Datar errado contamina todo registro. → Hora só via `scripts/lib/time.mjs` (tzdata do Node), com teste do horário de verão de 2018.
3. **A ferramenta de medir também se mede.** O `Date` do `api.github.com` oscilou 1 s, 10 s e 31 s (cache de CDN). → Uma referência ruim cria desvio fantasma. → Fonte trocada para a trace da Cloudflare (ms), com reserva no Google; ficha em `docs/20-conhecimento/relogio-e-fuso.md`.
4. **Teste pega o erro de quem escreve o teste.** Calculei de cabeça um epoch de fixture e errei por dois dias; o teste falhou. → Valor de teste se calcula com a ferramenta, não de cabeça.
5. **Regra global precisa de exceção para o intocável.** `* text=auto eol=lf` ia converter o CRLF do briefing original. → `docs/00-proveniencia/** -text`; hashes reconferidos 14/14.
6. **Git escapa acentos por padrão.** `core.quotePath` transformou "agnóstico" em `\303\263` e quebrou o lint. → `git -c core.quotePath=false` em toda chamada das ferramentas, com teste.
7. **O próprio rito achou o bug.** O `bd post` reprovou nomes e revelou o problema de escape. → Rodar o rito em cada etapa, não só no fim.
8. **O merge não é meu.** A política de permissões bloqueou `gh pr merge` sem revisão. → Fluxo de PRs empilhados; o Pai mergeia (ADR 0003, proposta).
9. **Heredoc com aspas e crases quebra o shell.** Um bloco longo de arquivos falhou inteiro, sem gravar nada. → Arquivos longos vão pela ferramenta de escrita; mensagens de commit por `git commit -F -`.
10. **Versão local não é versão suportada.** `node --test <dir>` passa no Node 26 e quebra no 24, que é o piso declarado. → A CI roda no piso; `npm test` usa glob explícito. Ferramenta de "trocar versão" também se mede: `npx node@24` rodou o 26.
11. **Ferramenta de QA escreve onde a sessão nasceu.** O Playwright gravou artefatos no diretório de trabalho da sessão, que era a pasta de proveniência. → Próximas sessões abrem com o diretório de trabalho no repositório (`BOOTSTRAP.md`); artefatos de QA vão para `docs/registros/` quando forem evidência.
12. **"Já fiz" é um fato a medir, inclusive quando vem do Pai.** A mensagem dizia que os PRs estavam mergeados; o GitHub dizia que não. → Verificar o estado no remoto antes de agir sobre ele; registrar a divergência sem acusar, e seguir pelo caminho que não depende dela.
13. **Delegar extração, nunca julgamento.** Cinco subagentes trouxeram fatos com URL; usei-os só depois de conferir amostras na fonte. → Toda nota da 0.2 marca o que foi conferido (✔) e o que é extração.
14. **"Mergeei" era autorização, não relato.** O Pai escreveu "Mergeei os PRs"; eu medi, vi que não estavam mergeados e só registrei a divergência, em vez de perguntar o que ele queria ou concluir o merge. Ele queria que eu fizesse. → Quando a palavra do Pai e o estado medido divergem, a pergunta certa é "o que você quer que aconteça?", não só "o que aconteceu?". Regra nova: o merge é meu, com CI verde (ADR 0003).
