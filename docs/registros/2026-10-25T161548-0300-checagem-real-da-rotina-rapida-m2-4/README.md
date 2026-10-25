# Checagem real: rotina rápida da contenção (M2.4)

**Classe:** REGISTRO · **Data:** 2026-10-25T16:15:48-03:00 · **Por:** buddy-dev (sessão `claude-code-desktop-901c38`) · **Para:** [SPEC 0003](../../40-specs/0003-execucao-isolada/SPEC.md), critério 6; pedido do Pai em 2026-10-25 ("uma rotina simplificada, porém segura, para otimizar a rapidez")

## Medição: onde ia o tempo (Windows do Pai, mediana de 5)

| Situação | Tempo por comando |
|---|---|
| Sem contenção (`node -v`) | 39 ms |
| Montar o perfil (varredura de segredos e PATH) | 16 ms |
| Subir e fechar o proxy | 1 ms |
| Contido, sem rede | 185 ms |
| Contido, com a rede pelo proxy | 454 ms |
| Contido, perfil pequeno (2 pastas) e sem `cmd.exe` | 93 ms |

**Os três custos:**
- ligar a rede na MXC, cerca de 270 ms;
- o tamanho do perfil (63 pastas do PATH), cerca de 65 ms;
- o `cmd.exe`, cerca de 30 ms.

Desligar a limpeza das permissões no fim (`clearPolicyOnExit: false`) não mudou nada.

**O maior atraso, porém, não era nenhum desses.** Era cada comando esperar um clique do Pai.

## A rotina

1. **Contido, sem cartão** (critério 6 da SPEC aprovada).
   - Com a contenção confirmada, o comando dentro da pasta roda sem pedir aprovação: ele só alcança a pasta de trabalho, não lê segredos e só sai para a internet por cartão.
   - O modo Plano continua negando.
   - Sem contenção, a aprovação continua como antes.
2. **Rede sob demanda.** Um comando só de leitura e local, da lista fixa e sem encadeamento (`git status`, `ls`, `node -v`…), roda sem ligar a rede: cerca de 270 ms a menos. Rodar sem rede é mais restritivo, então não há risco novo. O `npm` fica fora da lista, porque um teste pode precisar de rede.

**Ficaram de fora, de propósito:**
- **Encolher o perfil por comando.** Faria um comando legítimo falhar quando chama outra ferramenta, para ganhar cerca de 65 ms.
- **Pular o `cmd.exe`.** Os `.cmd` do npm precisam dele, e o ganho seria de cerca de 30 ms.

## Checagem real (CONFIRMADA)

Núcleo de ensaio da branch `feat/m2-4-rotina-rapida`, com o modelo real (`opencode-go/kimi-k3`):

| Pedido | Cartões | Resultado |
|---|---|---|
| `git --version` e `node -v` | **nenhum** | os dois contidos, código 0 |
| `npm view left-pad version` | só `network registry.npmjs.org` (nesta conversa) | contido, código 0, `1.3.0` |
| `npm view is-odd` pelo yarnpkg | só `network registry.yarnpkg.com` (negado) | contido, `E403` |

## Risco declarado

Sem cartão, o Buddy pode alterar e apagar arquivos dentro da pasta de trabalho sem perguntar. Algumas coisas limitam isso:
- o `.git` é só leitura para o comando contido, então o histórico não se perde;
- o que está no git volta pelo git;
- a proteção completa é o worktree por sessão (M2.6), em que a integração na pasta do Pai é uma aprovação com diff.

Até a M2.6, um arquivo novo e não versionado, apagado por um comando, não volta.
