# Correção: a rede do comando contido no macOS abria os serviços locais

**Classe:** REGISTRO · **Data:** 2026-11-02T20:08:31-03:00 · **Por:** buddy-dev (sessão `claude-code-desktop-7db43c`) · **Para:** [SPEC 0003](../../40-specs/0003-execucao-isolada/SPEC.md), critério 4; [plano do M2](../../50-planos/m2/PLANO.md), M2.3

## Por quê

O Pai viu movimento no repositório depois de dias parado e perguntou se havia rotina programada. Havia duas, ambas toda segunda-feira no GitHub: a CI completa (Linux, Windows e macOS, Node 24 e 26) e a conferência das dependências. As dependências passaram nas duas semanas. A CI completa **falhou em 26/10 (execução 40382369985) e em 02/11 (41533718913)**, só no macOS, e ninguém viu por uma semana.

## O que falhou (CONFIRMADO)

O teste real da rede por cartão (`packages/core/test/rede-por-cartao.test.ts`) roda um comando contido que tenta alcançar um serviço local direto, sem passar pelo intermediário do Buddy. No Windows e no Linux, o acesso é negado. No macOS, ele passou: a contenção do macOS (Seatbelt, pela MXC 1.0.1) só deixa a rede sair pelo intermediário se o perfil liberar também o loopback do computador, e essa liberação vale para qualquer porta local. Um comando contido podia falar com qualquer serviço aberto no computador (banco de dados, servidor de desenvolvimento, o próprio núcleo).

## A correção

- **Sem rede segura, sem rede.** A sonda da contenção agora diz se a rede pelo intermediário é segura naquela plataforma (`network`). No macOS, não é: o comando contido roda sem rede, e o log diz por quê (`command.ran` com `network`). Windows e Linux seguem como antes.
- **O agente de fora não roda contido no macOS.** Contido sem rede, ele não conversa com o modelo; então roda como antes da contenção, com a postura e as permissões de sempre, e a razão aparece onde aparece toda contenção indisponível.
- **Testes:** um teste novo no núcleo (sem rede segura, o comando roda sem rede e o log explica) e o teste real ajustado: no macOS, exige que a contenção se declare sem rede e que o acesso direto ao serviço local falhe.
- **Mecanismo novo:** o `bd pre` mostra, no início de toda sessão, a última execução de cada rotina agendada e avisa quando falhou (`scripts/lib/rotinas.mjs`, com testes).

## Verificação

- Suíte local completa no Windows: 493 de 493.
- CI completa na branch (`gh workflow run CI --ref fix/macos-rede-contida`, execução 41542743388), com os seis sistemas: resultado no PR.

## Lacuna declarada

No macOS, o comando contido que precisa de rede (instalar pacote, consultar registro) falha até a MXC permitir o intermediário sem abrir o loopback. Fica anotado no plano do M2 para reavaliar a cada versão nova da MXC.
