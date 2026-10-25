# Spike: o Cua como computador dos agentes, no Windows do Pai (M2.8)

**Classe:** REGISTRO · **Data:** 2026-10-25T17:42:14-03:00 · **Por:** buddy-dev (sessão `claude-code-desktop-f9fa85`) · **Para:** [plano do M2](../../50-planos/m2/PLANO.md), M2.8; [ficha do Cua](../../20-conhecimento/cua-computador-para-agentes.md)

## Limites aprovados pelo Pai (2026-10-25)

- `@trycua/cua` 0.9.0 só numa pasta separada (`workspace/spike-cua`, fora do git);
- o Docker Desktop que ele já tinha;
- sem o app Spaces, sem QEMU e sem mudar configurações do Windows.

O Docker Desktop estava desligado. Foi ligado para o teste e desligado no fim.

## Resultado (CONFIRMADO)

| O quê | Resultado |
|---|---|
| Diagnóstico (`local().doctor()`, só leitura) | contêiner pronto pelo Docker Desktop 29.6.2, com runc e **sem gVisor** (o Docker Desktop não tem onde guardar o `runsc`); QEMU ausente (fora do teste, como aprovado); Lume só no macOS |
| Criar o computador (contêiner Linux, imagem do Cua) | 91 s na primeira vez, quase tudo para baixar a imagem de 4,6 GB; o `cua-spacesd` respondeu em 9 ms |
| Memória | cerca de 800 MB com o computador parado |
| OpenCode lá dentro, por ACP (`sandbox.agents().run`) | respondeu em 35 s, contando a instalação. A chave do Go entrou só nesta execução. **O Cua instala o OpenCode 1.18.32**, a versão que ele fixa, e não a 2.0.32 do Pai |
| Arquivos do Pai vistos lá dentro | nenhum; nenhuma pasta do Windows aparece no contêiner |
| Ida e volta de arquivo | enviado em 8 ms; o OpenCode alterou o arquivo (3 ferramentas); `run.artifacts()` listou o que mudou; baixado em 2 ms; a alteração veio certa |
| **Política de saída do Cua** | **recusada no Docker Desktop do Windows** ("Operation not supported": a VM do Docker Desktop não tem o recurso de firewall que o Cua usa). Na QEMU do Windows também não existe (documentado) |
| Rede só pelo proxy do Buddy | o contêiner não alcança o proxy no loopback do Windows. Abrir o proxy para fora do loopback faria o Windows pedir liberação no firewall, o que fica fora dos limites |
| Rede sem política | **internet livre** de dentro do contêiner |
| Administrador lá dentro | o usuário tem `sudo` sem senha. Uma regra de rede montada dentro do contêiner seria desfeita pelo agente |

## Achados laterais

- **Telemetria do Cua:** vem ligada por padrão. Nas execuções seguintes, desliguei por variável de ambiente (`CUA_TELEMETRY=0`, `DO_NOT_TRACK=1`), sem mexer em configuração. A primeira execução, antes disso, **provavelmente** enviou tempos e tipos de erro, que é o que o aviso do Cua descreve; sem arquivos, nomes ou conteúdo.
- **Contêineres do Pai:** ao ligar o Docker Desktop, outros contêineres dele subiram sozinhos, pela política de reinício. Pararam de novo ao desligar.
- **Antivírus:** o Pai informou que o Kaspersky estava barrando e excluindo o que eu tentava, e o desabilitou. Os arquivos do teste e do repositório foram conferidos e estão inteiros.

## O que ficou na máquina

- a imagem `ghcr.io/trycua/linux` (4,6 GB) no cache do Docker;
- a pasta de estado `~/.cua`;
- a biblioteca em `workspace/spike-cua`.

O computador de teste foi apagado, e o Docker Desktop, desligado.

## Conclusão

No Windows do Pai, o Cua entrega o que promete para **processos e arquivos**: cada agente num computador próprio, sem ver as pastas do Pai, com a ida e volta de arquivos pronta para o diff. **Não entrega o controle da rede**: lá dentro, a internet fica livre, e nem a política do Cua nem o proxy do Buddy chegam ao contêiner sem mudar o Windows.
