# ChatGPT sem resposta na console: diagnóstico ao vivo e hotfix ensaiado

**Classe:** REGISTRO · **Data:** 2026-10-17T16:40:32-03:00 · **Por:** buddy-dev (sessão `claude-code-vs-code-7307c7`) · **Para:** SPEC 0001 (critério 18), ADR 0017, validações `login-chatgpt-real` (feita) e `demonstracao-m0`

## O que o Pai viu

Pela console, o Pai entrou com o ChatGPT ("funcionou perfeitamente"). Ollama e OpenRouter responderam. Com `chatgpt · gpt-6.1-sol` escolhido, a conversa mostrava só o consumo e o passo, por exemplo "passo 1 por chatgpt/gpt-6.1-sol: 173 tokens de entrada, 23 de saída". A resposta nunca aparecia. O modelo respondia (havia tokens de saída), mas o texto se perdia no caminho.

## Diagnóstico contra o serviço real (CONFIRMADO)

O diagnóstico usou o login real do Pai e o script `workspace/diag-chatgpt.ts`, fora do git. O script imprime só os tipos de evento e as contagens, nunca token nem credencial.

| Pedido | Eventos do stream | `response.completed.output` | Onde vem o conteúdo |
|---|---|---|---|
| Texto ("diga olá") | `created`, `in_progress`, `output_item.added`, `content_part.added`, `output_text.delta` ×8, `metadata`, `output_text.done`, `content_part.done`, `output_item.done`, `completed` | **vazio** (0 itens), com `usage.output_tokens = 12` | `response.output_item.done` (item `message` com `output_text`) |
| Com ferramenta | `created`, `in_progress`, `output_item.added`, `function_call_arguments.delta` ×5, `metadata`, `function_call_arguments.done`, `output_item.done`, `completed` | **vazio** | `response.output_item.done` (item `function_call`) |

O código lia só o `output` do evento final, como faz a Responses API pública. O backend do ChatGPT entrega o conteúdo nos eventos de item e deixa o final vazio. Por isso o texto se perdia. Pelo mesmo motivo, as **ferramentas nunca rodariam** pelo ChatGPT: o Pai não chegou a esse ponto, mas a falha era a mesma.

Isto é a regra do AGENTS §5.9 acontecendo de novo: o servidor falso devolvia o `output` completo no evento final, como eu tinha imaginado o contrato, e não como o serviço real funciona.

## Correção (SPEC → teste → código)

1. **SPEC 0001, critério 18** (`SPEC.md` e `TESTES.md`): o conteúdo vem dos itens de `response.output_item.done` quando o `output` final chega vazio.
2. **Teste** `siwc: backend real — output vazio…` em `packages/core/test/siwc.test.ts`. Ele reproduz a sequência medida para texto e para ferramenta, e cobre também o caso de o `output` final vir preenchido, sem duplicar. Com o código antigo, reprovou com `'' !== 'Olá, Pai!'`, que é o mesmo defeito visto pelo Pai.
3. **Código** em `packages/core/src/providers/siwc.ts`: o stream guarda os itens de `output_item.done` e os usa quando o final vem vazio. Vale também para `response.incomplete`.

## Ensaio na console, como o Pai usa

Núcleo reiniciado com o código novo e console num navegador real. Escolhi o provedor `chatgpt · gpt-6.1-sol` e cliquei em "Nova conversa". Depois digitei na caixa e apertei Enter.

| # | Passo | Resultado |
|---|---|---|
| 1 | "olá! quem é você, em uma frase?" (esforço Baixo) | resposta na conversa: "Olá! Sou o Rabelus Buddy…"; passo com "· Baixo" |
| 2 | "liste os arquivos da pasta de trabalho e crie um arquivo ola-chatgpt.txt…" | `list_dir` rodou; `write_file` pediu aprovação ([captura 1](./chatgpt-01-ferramenta-e-aprovacao.png)) |
| 3 | Aprovar | arquivo escrito; resposta final com a lista dos arquivos e o conteúdo |

## Achados de UX no mesmo ensaio (corrigidos com teste antes; os testes reprovaram com a página antiga)

| Achado | Correção |
|---|---|
| Listas e blocos de código cercados por crases triplas apareciam crus na resposta | `mdBlocks` (parágrafo, lista, bloco de código) e `rich` montam nós de texto, sem HTML vindo do modelo ([captura 3](./chatgpt-03-resposta-formatada.png)) |
| Já conectado, "Entrar com o ChatGPT" continuava como botão principal | conectado, vira "Trocar de conta", botão secundário ([captura 2](./chatgpt-02-painel-conectado.png)) |
| "Conectado: … Uso do plano concedido." sem separação | separado por " · " |
| Rótulos acessíveis fixos em inglês ("provider", "workspace") | `data-i18n-aria` com as chaves do catálogo |

## Lacunas registradas, sem correção neste hotfix

- Recarregar a página fecha a conversa aberta. Ela volta com um clique em "Execuções", mas a console poderia lembrar a conversa (M0.9).
- O OpenCode Go segue sem saldo (402), e o Pai não testou. Fica com ele quando houver saldo.
