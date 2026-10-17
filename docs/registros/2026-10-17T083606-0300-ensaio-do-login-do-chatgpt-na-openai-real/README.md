# Ensaio do login do ChatGPT na OpenAI real

**Classe:** REGISTRO · **Data:** 2026-10-17T08:36:26-03:00 · **Por:** buddy-dev (sessão `claude-code-vs-code-7307c7`) · **Para:** validação `login-chatgpt-real` (SPEC 0001, critério 19)

## Por que existe

Em 2026-10-17 o Pai rodou o que eu pedi (`rbuddy login chatgpt`) e não funcionou: o `rbuddy` nem estava no PATH. Regra dele, no mesmo dia: nunca pedir teste que não funciona, e nunca por CLI. Desde então, toda ação do Pai precisa deste ensaio antes de aparecer como "aguarda o Pai" (`bd validacoes`).

## O que foi ensaiado, no ambiente do Pai (Windows, Node 26)

| Passo | Como | Resultado |
|---|---|---|
| Gerar a URL de autorização como o produto gera | `startLogin` do núcleo, diretório de estado temporário | URL gerada; callback em `127.0.0.1` escutando |
| Abrir a URL na OpenAI real, num navegador, **sem entrar em conta** | Playwright | **Antes da correção:** `400 invalid_authorize_request`, `param: ext_agent_host_id`. O servidor falso dos testes aceitava qualquer valor. |
| Corrigir: `ext_agent_host_id` no formato `urn:uuid:<uuid>` (o exemplo da documentação), host id antigo corrigido uma vez | teste antes (servidor falso agora recusa como a OpenAI real), depois o código | |
| Abrir de novo a URL gerada pelo código corrigido | Playwright | **Aceita:** redireciona para `auth.openai.com/log-in` ("Que bom que você voltou") |

## O que não dá para ensaiar sem a conta do Pai

- Daqui para frente o fluxo exige a conta: callback com o client id emitido, troca do código, ID token contra o JWKS real e o escopo `chatgpt.tokens.use.direct` concedido. Isso foi testado contra servidor falso, mas não contra a OpenAI. **O primeiro login real é o próprio teste.** Se falhar, o diagnóstico é meu, não do Pai.
- A abertura automática do navegador padrão (`rundll32 url.dll,FileProtocolHandler`) não foi ensaiada, para não abrir abas no computador do Pai sem aviso.

## Como o Pai faz (sem terminal)

Quando ele disser que está pronto, eu disparo o login. O navegador dele abre na tela da OpenAI; ele entra com a conta do ChatGPT Plus e aprova. O resto é comigo.
