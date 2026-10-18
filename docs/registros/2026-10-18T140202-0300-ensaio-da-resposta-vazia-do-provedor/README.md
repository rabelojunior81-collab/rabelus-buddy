# Ensaio: resposta vazia do provedor

**Classe:** REGISTRO · **Data:** 2026-10-18 · **Por:** buddy-dev (sessão `claude-code-vs-code-33be25`) · **Para:** PLANO M1, M1.1 (achado no [ensaio do M1.0](../2026-10-18T123449-0300-ensaio-do-m1-0-contrato-tipado/README.md))

## Antes

Uma resposta sem texto, sem ferramenta e com 0 tokens de saída terminava a execução como **"concluída"**, sem aviso.

## Agora

Essa resposta vale como **falha da rota**. O log registra `provider.error` com código `emptyResponse`, e a ordem segue para o próximo provedor (`provider.switched`, motivo `emptyResponse`). Sem outro provedor, a execução **para** com o motivo `provider.emptyResponse`, que a console mostra como "o provedor respondeu vazio (nenhum texto, 0 tokens); tente outro provedor ou repita".

Uma resposta sem texto mas **com** tokens de saída continua concluindo: é a regra que evita falso positivo. Há um teste para cada um dos três casos, escritos antes do código.

## Ensaio no navegador (1707×769)

O ensaio usou um núcleo temporário com dois provedores falsos que respondem vazio, na ordem automática. A conversa mostrou, nesta ordem:
- a recusa do primeiro;
- a troca para o segundo;
- a recusa do segundo;
- a parada com o motivo em português ([captura](./vazio-01-troca-e-motivo.png)).

O núcleo real do Pai não foi tocado.
