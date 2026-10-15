# Método

**Classe:** CÂNONE · **Versão:** 0.1 (proposta do buddy-dev, aguarda aceite do Pai) · **Data:** 2026-10-14

Síntese de quatro fontes: o BMad Method ([ficha](../20-conhecimento/bmad-method.md)) como referência; Document, Spec e Test Driven Development; a governança da família Rabelus Lab; e as regras que o Pai deu em 2026-10-14. Curto de propósito: cada regra tem um mecanismo ([`AGENTS.md` §3](../../AGENTS.md#3-regras-e-o-mecanismo-que-as-faz-valer)); o que não tem mecanismo não entra aqui.

## 1. A cadeia

```
Brainstorm → Briefing → Pesquisa → Governança → Roadmap vivo → Plano Macro → Plano de Fase → Plano de Sub-fase
 (00-proveniencia)      (10-pesquisa)  (30-governanca)  (50-planos/ROADMAP.md)  (PLANO-MACRO.md)  (fase-N/PLANO.md)  (fase-N/<sub>/PLANO.md)
```

O Roadmap diz **onde estamos e para onde vamos**. O Plano Macro é o **TODO de tudo**, em granularidade grossa. Cada fase ganha seu plano quando começa, não antes; cada sub-fase, idem. Planejar no detalhe o que está longe é escrever ficção.

## 2. Tamanho certo (do BMad)

| Tamanho | Exemplo | O que é obrigatório | Quem aprova |
|---|---|---|---|
| Trivial | corrigir um link, um typo | PR com o template | Pai (merge) |
| Sessão | uma ferramenta, um documento | SPEC curta na descrição do PR + testes | Pai (merge) |
| Fase | um marco do roadmap | SPEC em `docs/40-specs/` + plano da fase + retrospectiva | Pai (SPEC, plano, merge) |
| Projeto | o produto inteiro | Roadmap + Plano Macro + contratos compartilhados (produto, arquitetura) | Pai |

Na dúvida sobre o tamanho, pergunta-se ao Pai.

## 3. Uma unidade de trabalho

1. **Clarear.** O que é, para quem, como saberemos que deu certo.
2. **Pesquisar ao vivo.** Fatos externos viram fichas em `docs/20-conhecimento/` antes de virar premissa.
3. **SPEC.** Contrato curto: problema, escopo dentro e fora, critérios de aceitação observáveis, riscos, rollback. Template: [`templates/SPEC.md`](./templates/SPEC.md).
4. **Plano.** TODO derivado da SPEC; não inventa requisito. Template: [`templates/PLANO.md`](./templates/PLANO.md).
5. **Teste primeiro.** Cada critério de aceitação vira teste. O teste falha, é commitado, e só então vem o código.
6. **Construir.** Commits pequenos, com push a cada um.
7. **Verificar.** Testes verdes, `bd post` sem falhas. Relatório não é evidência: o artefato é.
8. **Aprender.** Changelog, diário, LEARNING-CURVE; na fase, uma retrospectiva em `docs/registros/`.

Mudança de escopo no meio: nova revisão da SPEC, aprovada; a anterior fica no histórico.

## 4. O lore vira produto

O jeito de desenvolver é matéria-prima do Rabelus Buddy. Cada mecanismo daqui tem um destino no produto, e a SPEC da capacidade correspondente deve citar esta tabela.

| Mecanismo do desenvolvimento | Capacidade do produto que ele antecipa |
|---|---|
| Ledger de eventos, um arquivo por evento | Log de eventos da sessão do agente (estado canônico + projeções) |
| Sessões e claims com prazo entre worktrees | Concorrência de sessões, leases de recursos, retomada |
| `bd pre` / `bd post` | Bootstrap e fechamento de sessão do agente, com checagens |
| `BOOTSTRAP.md` + pontes por harness | Identidade portável entre runtimes e provedores |
| Arquivo morto com lápide e hashes | Retenção governada: nada some sem trilha |
| CHANGELOG com teto + LEARNING-CURVE | Memória com compactação e destilação aprovada |
| Fichas de conhecimento com fonte e data | Memória de conhecimento com proveniência e expiração |
| Merge feito pelo Pai | Aprovação humana para ações de alto impacto |
| Relógio verificado | Carimbo confiável em eventos e auditoria |

## 5. O que não fazemos

- Não instalamos frameworks de processo como dependência (o BMad é referência).
- Não escrevemos regra sem mecanismo.
- Não planejamos em detalhe fases que ainda não começaram.
- Não declaramos pronto sem teste e sem `bd post`.
