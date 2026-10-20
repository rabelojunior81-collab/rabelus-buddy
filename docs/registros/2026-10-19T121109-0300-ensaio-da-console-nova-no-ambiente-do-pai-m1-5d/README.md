# Ensaio: a console nova no ambiente do Pai (M1.5d)

**Classe:** REGISTRO · **Data:** 2026-10-19T12:11:09-03:00 · **Por:** buddy-dev (sessão `claude-code-vs-code-51d166`) · **Para:** SPEC 0002, critério 11; validação do Pai (AGENTS §3: nunca pedir teste não ensaiado, com os mesmos passos e no ambiente dele)

## Como

- **Onde:** no núcleo do próprio Pai, com o código da main `ca9be12` (M1.5a a M1.5c) e as credenciais dele, pela console real (porta 47321), num Chromium de ensaio.
- **Marcas que ficam:** as duas conversas do ensaio começam com "Ensaio do buddy-dev" e ficam no histórico do Pai.
- **Privacidade:** as capturas mostram títulos de conversas dele; o repositório é privado.

## O que aconteceu

1. **Modelo** ([captura](./m15d-1440-modelo-escolhido.png)):
   - a pílula de modelo abriu o catálogo do Pai com quatro abas: ChatGPT 8, OpenCode Go 37, Ollama Cloud 23 e OpenRouter 469, nada fora da lista;
   - o GPT-6.1 Sol oferece esforço de "Padrão" a "Máximo", e "Muito alto" foi aceito pelo ChatGPT (o passo registra o nível);
   - o modelo resolveu dizer olá **rodando um comando** e pediu aprovação; negado, respondeu "Olá, Pai!" em 5 s ([captura](./m15d-1440-chatgpt-resposta.png)).
2. **Harness:** ao escolher o OpenCode, a pílula mostrou "conferindo…" e, em 7,9 s, "pronto". A tarefa de escrita trouxe o cartão "Harness OpenCode: write_file ensaio-buddy-dev.txt", com o ícone dele ([captura](./m15d-1440-opencode-permissao.png)). Aprovado, ele escreveu o arquivo e respondeu em 5 s ([captura](./m15d-1440-opencode-resposta.png)).
3. **Barra lateral:** mostra o histórico real do Pai agrupado em "Hoje", "Ontem" e "17/10/2026".

## Achados

- **Pedido de olá virou comando.** Com uma tarefa simples, o modelo pode decidir usar uma ferramenta. O roteiro do Pai pede a resposta em texto, sem ferramentas.
- **Arquivo em outra pasta, no navegador de ensaio.** O arquivo foi para a pasta lembrada por esse navegador (uma pasta temporária de um ensaio antigo, no mesmo endereço). O Buddy seguiu a pasta configurada, como deve. O navegador do Pai guarda a escolha dele, e o roteiro manda conferir a pasta em Ajustes.
- **Falha minha:** a ferramenta de navegador mostrou na saída o endereço da console do Pai com o token. Ele não foi para o repositório, e a console só aceita 127.0.0.1. Trocar o token fica com o Pai, porque derrubaria a aba aberta dele.

## Roteiro da validação do Pai

Os mesmos passos acima, pela console, sem terminal:

1. Dar dois cliques no atalho **abrir-rabelus-buddy**, ou recarregar a aba da console já aberta. A console nova aparece, verde-oliva, com a marca do Rabelus Lab.
2. **Conferir a pasta de trabalho:** em ⚙ **Ajustes**, ver em "Pasta de trabalho" onde o Buddy vai trabalhar, e fechar.
3. **Testar um modelo:**
   - na caixa de mensagem, clicar na pílula do modelo (ou Ctrl+K), escolher a aba **ChatGPT** e o **GPT-6.1 Sol**;
   - em "Esforço", escolher **Muito alto**;
   - enviar: "Responda em texto, sem usar ferramentas: diga olá em uma frase."
   - Esperado: o andamento aparece ao vivo, e a resposta chega.
4. **Testar um harness:**
   - clicar em **Nova conversa** e, na pílula **Buddy**, escolher o **OpenCode**; esperar a pílula dizer "pronto";
   - enviar: "Crie o arquivo teste-do-pai.txt com a palavra ok e diga se conseguiu."
   - Esperado: o cartão "Harness OpenCode: write_file teste-do-pai.txt" aparece sobre a caixa, com o ícone do OpenCode. Ao clicar em **Aprovar**, ele cria o arquivo na pasta de trabalho e responde.
5. **Opcional:** abrir no celular ou estreitar a janela; a barra lateral vira gaveta (☰).

Fica para o ensaio da M1.6, por decisão do Pai: o "Entrar" de um harness que pede login, num harness real.
