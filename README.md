<div align="center">

# Rabelus Buddy

**Harness de agentes de IA agnóstico, extensível e multi-tudo.**
*by [Rabelus Lab](https://rabelus.com)*

[**Português**](./README.md) · [English](./README.en.md)

</div>

> **Estado:** **M0 — Núcleo governado concluído** (2026-10-17, validado pelo Pai pela console). **M1 — Orquestrador e multimodal** em execução, com a SPEC aprovada pelo Pai ([SPEC 0002](./docs/40-specs/0002-orquestrador-e-multimodal/SPEC.md), [ADR 0018](./docs/60-decisoes/0018-ordem-c-depois-do-m0.md)): detecção automática dos harnesses pelo registro oficial do ACP, imagem na conversa, console nova em verde-oliva. Feito no M1: **M1.0** (contrato tipado da console: entrada inválida é recusada com mensagem clara antes de chegar ao núcleo), **M1.2a e M1.2b** (o Buddy confere sozinho se cada agente está pronto; o que precisa baixar código só roda com a aprovação do Pai na console, e o Codex já está pronto), **M1.2c** (o núcleo conversa com os agentes pelo ACP, com o andamento ao vivo, e o OpenCode e o Codex do Pai já responderam), **M1.2d** (o agente pergunta antes de escrever ou executar, e cada pedido passa pela política do Buddy e pelas Aprovações), **M1.2e** (o núcleo faz o login do agente sem nunca ver a credencial; o "Entrar" na tela chega com a console nova), **M1.5a** (a console nova, com o visual aprovado pelo Pai: verde-oliva e vidro, marca do Rabelus Lab, conversas e harnesses na barra lateral, Ajustes em painel, contraste AA medido e celular sem rolagem para os lados), **M1.5b** (o harness se escolhe na caixa de mensagem, com o estado dele à vista, a permissão com o ícone de quem pede e o "Entrar" quando ele pede login), **M1.5c** (o modelo se escolhe no catálogo real, com busca, filtros por capacidade e o esforço que o modelo declara, medido ao vivo), **M1.3a e M1.3b** (imagens e arquivos se anexam na caixa de mensagem, chegam ao modelo ou ao agente que enxerga, e o histórico guarda só a referência), **M1.5e** (a console sem token no endereço: o atalho abre por um bilhete de uso único, que vira cookie protegido), **M1.4** (o Buddy delega uma parte da tarefa a outro agente instalado e traz a resposta, com as permissões passando pelo Pai) e, em 2026-10-20, as correções do uso real: voz nova do Buddy em português e inglês, tabelas na conversa, console compacta e aviso de silêncio. A página pública "diário de bordo" mora em `site/`. Em 2026-10-21, a console nova (**M1.5**) foi validada pelo Pai, o comando ganhou os escopos de aprovação e o modelo gratuito passou a ser sinalizado; o ensaio de ponta a ponta do M1 ficou para quando houver mais implementado. Ainda em 2026-10-20: os seletores do agente (modelo, esforço, modo) e as permissões com cinco modos e quatro escopos, **M1.1** (os agentes instalados são reconhecidos sozinhos pelo registro oficial do ACP, e o catálogo de modelos reúne 538 modelos de 4 provedores, com as capacidades e a fonte de cada uma) e o protótipo da console nova aprovado pelo Pai. M0: ([SPEC 0001](./docs/40-specs/0001-nucleo-governado/SPEC.md), [plano](./docs/50-planos/m0/PLANO.md)), com a **M0.7c** feita (a M0.7 completa): `rbuddy run "<tarefa>"` roda o agente nas assinaturas (OpenCode Go → Ollama Cloud → ChatGPT → OpenRouter), com política, aprovações no terminal, orçamento por janela e retomada depois de queda (`rbuddy resume`); `status`, `log`, `providers`, `login`/`logout`, `approvals`, `budget` e `daemon` completam a CLI. Segredos e catálogo auditados por teste; uma auditoria contra os serviços reais corrigiu o login do ChatGPT e o tratamento de erros. O Rabelus Buddy é um agente com UX/UI, não uma CLI: a **console web local** está pronta (**M0.8**, ensaiada na M0.8c, [ADR 0017](./docs/60-decisoes/0017-console-web-local-no-m0.md)): duplo clique em `abrir-rabelus-buddy.cmd` abre um chat com o agente no navegador, com esforço, provedor, aprovações, consumo, login do ChatGPT e retomada. Desde a **M0.8d** mostra o andamento ao vivo, com raciocínio, texto em cadência, fila com direcionamento e "Parar". Falta a demonstração com o Pai (M0.9).

## O que é

O Rabelus Buddy (o **buddy**, na intimidade) é um harness para operar agentes de IA com vários provedores de modelos, ferramentas, canais, sessões e workspaces, sob aprovação humana, memória governada e orçamento fechado. O primeiro usuário é um desenvolvedor individual; o modo de operação é híbrido: núcleo local, gateway mínimo em servidor.

A pesquisa que deu origem ao projeto está preservada, intocada, em [`docs/00-proveniencia/`](./docs/00-proveniencia/). Os achados fracos dela foram corrigidos na [Revisão 0.2](./docs/10-pesquisa/rev-0.2/RELATORIO.md), aceita pelo Pai.

## Como este repositório é desenvolvido

O projeto é escrito pelo Pai, Adilson Rabelo Junior, junto com o **Buddy Fenix** (`buddy-dev`), agente da família Rabelus Lab. O próprio jeito de desenvolver é matéria-prima do produto: ledger, barramento, aprovações, arquivo morto governado e bootstrap entre harnesses são o que o buddy vai oferecer aos seus usuários.

- **Documento → Spec → Teste → Código.** Nada é implementado sem SPEC aprovada; nada é declarado pronto sem prova.
- **Nada se apaga.** O que sai de uso vai para [`archive/`](./archive/) com lápide e hashes.
- **Antes, durante e depois, sempre.** `npm run bd -- pre` e `npm run bd -- post` conferem relógio, git, sessão, convenções e a coerência das superfícies.
- **Conhecimento verificado ao vivo**, com fonte e data, em [`docs/20-conhecimento/`](./docs/20-conhecimento/).

Método completo: [`docs/30-governanca/METODO.md`](./docs/30-governanca/METODO.md).

## Mapa

| Caminho | O que mora ali |
|---|---|
| `AGENTS.md` · `BOOTSTRAP.md` | Entrada para qualquer agente de IA (Claude Code, Codex, OpenCode, Gemini, Copilot…) |
| `.buddy-dev/` | Corpus do Buddy Fenix (buddy-dev): identidade, aparência, memória, diário, changelog, barramento |
| `docs/00-proveniencia/` | Material de origem, intocado |
| `docs/10-pesquisa/` | Revisões da pesquisa de origem (a 0.2 é a vigente) |
| `docs/20-conhecimento/` | Banco de conhecimento verificado (fonte, data, versão) |
| `docs/30-governanca/` | Método e convenções |
| `docs/40-specs/` · `docs/50-planos/` · `docs/60-decisoes/` | SPECs, roadmap e planos, ADRs |
| `docs/registros/` | Registros datados (auditorias, incidentes, evidências) |
| `archive/` | Arquivo morto: entra com lápide, nunca sai |
| `packages/` | Código do produto em TypeScript sem build: `client` (i18n e cliente compartilhado), `cli` (`rabelus-buddy`/`rbuddy`), `core` (log de eventos, dono, política e orçamento) |
| `locales/` | Catálogos de tradução pt-BR e en |
| `scripts/` | Ferramentas `bd` (relógio, nomes, barramento, arquivo, guarda, gate do Blog, superfícies, dependências, trava de testes, merge e prune, validações) |

## Contribuir

Leia [`CONTRIBUTING.md`](./CONTRIBUTING.md). O projeto segue o [Código de Conduta](./CODE_OF_CONDUCT.md). Para falhas de segurança, veja [`SECURITY.md`](./SECURITY.md).

## Licença

[Apache-2.0](./LICENSE) · © 2026 Adilson Ramires Rabelo Junior (Rabelus Lab). Veja [`NOTICE`](./NOTICE).
