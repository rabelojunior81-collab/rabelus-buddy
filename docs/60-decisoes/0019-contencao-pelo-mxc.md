---
status: aceita (2026-10-25)
date: 2026-10-25
decision-makers: Pai (Adilson Rabelo Junior), sobre a medição do buddy-dev que a SPEC 0003 manda
consulted: Pai (Adilson Rabelo Junior)
---

# Contenção de execução pelo MXC (`@microsoft/mxc-sdk`)

## Contexto e problema

A [SPEC 0003](../40-specs/0003-execucao-isolada/SPEC.md), aprovada pelo Pai em 2026-10-25, manda escolher pela medição a biblioteca que contém os comandos do Buddy e dos agentes de fora. Ela tem que funcionar no Windows do Pai, no macOS e no Linux. As candidatas são o `@anthropic-ai/sandbox-runtime` e o `@microsoft/mxc-sdk`.

## Opções consideradas

* **A.** `@microsoft/mxc-sdk` 1.0.1 (MIT)
* **B.** `@anthropic-ai/sandbox-runtime` 0.0.81 (Apache-2.0)

## Medição

[Registro do ensaio](../registros/2026-10-25T085733-0300-ensaio-do-spike-de-contencao-m2-0/README.md): a mesma bateria de 12 fugas e 10 legítimos.

| | Windows (Pai) | macOS | Linux |
|---|---|---|---|
| MXC | 10/12 · 10/10 · +335 ms | 12/12 · 10/10 · +103 ms | 11/12 · 10/10 · +112 ms |
| sandbox-runtime | não roda sem preparo de administrador | 11/12 · 10/10 · ±0 ms | 10/12 · 10/10 · +17 ms |

## Decisão

Opção **A, MXC**, porque:

1. **Funciona no Windows do Pai sem administrador**, no nível mais forte (base-container). O Windows é o ambiente real e o caso que a pesquisa marcou como difícil.
2. **Não deixou passar conteúdo em nenhum sistema.** As fugas que passaram mostram nomes de pastas (E3) e uma resolução de DNS (E9). No `sandbox-runtime`, a variável de ambiente secreta do pai passa para dentro (E12). No Buddy dá para corrigir isso do nosso lado, mas é uma fuga de conteúdo.
3. **Não traz alertas de segurança altos nas dependências.** O `sandbox-runtime` 0.0.81 traz `node-forge` e `zod` 3 com alertas altos sem correção.
4. **No Windows, o `sandbox-runtime` está em alfa** e exige um preparo que cria uma conta e filtros de rede para a máquina inteira e dá leitura da pasta do usuário. Com o token restrito, as ferramentas que usam o TLS do Windows não fazem HTTPS.

**O que o MXC custa, e como pagamos:**
- **Rede:** a filtragem é por IP. A lista de domínios e o cartão "rede" ficam com um proxy do núcleo, que o ensaio já demonstrou.
- **Configuração por sistema:** a interface ligada para o node no Windows, as pastas acima liberadas só para listar e a rede por backend. Tudo isso fica na camada de execução, coberto por teste.
- **Tempo:** cerca de 0,1 s a mais por comando no macOS e no Linux, e 0,33 s no Windows. É aceitável para comandos de agente.
- **Tamanho:** 108 MB de binários nativos.

## Consequências

- O `@anthropic-ai/sandbox-runtime` sai do registro de dependências quando esta ADR for aceita.
- O `@microsoft/mxc-sdk` passa de dependência do spike a dependência do produto (`runtime`), com `node-pty` e `koffi` instalados sem scripts. O ensaio mostrou que os binários já vêm no pacote.
- **M2.1:** a camada de execução nasce sobre o MXC, com o proxy de domínios no núcleo.

## Aceite

Pai, 2026-10-25 ("Aceito a ADR 0019: a contenção fica com a biblioteca da Microsoft (MXC). Pode seguir para a próxima etapa."), sem medir o `sandbox-runtime` no Windows (o preparo dele é uma mudança de segurança da máquina que só o Pai faria). O `@anthropic-ai/sandbox-runtime` saiu do registro de dependências no mesmo dia.
