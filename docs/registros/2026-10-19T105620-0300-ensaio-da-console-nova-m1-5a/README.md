# Ensaio: console nova, casca da M1.5a

**Classe:** REGISTRO · **Data:** 2026-10-19T10:56:20-03:00 · **Por:** buddy-dev (sessão `claude-code-vs-code-51d166`) · **Para:** SPEC 0002, critério 11 (AGENTS §5.9)

## Como

- **Núcleo temporário:** iniciado pelo `bd serve` com o código da branch `feat/m1-5-console-nova`, com estado numa pasta própria e console na porta 47399, longe dos dados do Pai. Foi reiniciado pelo próprio `bd serve` a cada correção e encerrado no fim.
- **Dados de exemplo:** duas conversas e uma aprovação pendente, criadas pelo IPC.
- **Navegador:** Chromium real (Playwright), a 1440 e a 375 px, nos dois temas.
- **Harnesses:** os da barra lateral são os reais do computador, achados pelo registro do ACP.

## O que foi conferido

| Tela | 1440 px | 375 px |
|---|---|---|
| Início: marca, saudação, harnesses encontrados (6), sugestões, cartão de aprovação sobre a caixa | [claro](./m15a-1440-claro-inicio.png) | [escuro](./m15a-375-escuro-inicio.png) |
| Conversa: balões, lista, bloco de código, conversa ativa marcada na barra lateral | [escuro](./m15a-1440-escuro-conversa.png) | [claro](./m15a-375-claro-conversa.png) |
| Ajustes: provedores, ChatGPT, chaves, consumo, execuções, idioma, tema, pasta | [escuro](./m15a-1440-escuro-ajustes.png) | [claro](./m15a-375-claro-ajustes.png) |
| Gaveta do celular: conversas e harnesses | — | [claro](./m15a-375-claro-gaveta.png) |

- **Rolagem horizontal:** nenhuma, a 1440 nem a 375 px, com Ajustes aberto ou fechado. Medida por `scrollWidth` e pela busca de elementos que passam da borda.
- **Comportamentos:** trocar o idioma com a conversa aberta não deu erro. Ajustes abre com o foco no fechar; Esc fecha e devolve o foco. Aprovar resolve o pedido, e o cartão sai. A gaveta abre com a máscara por trás.
- **Marca:** carregada da própria console (`/brand`, com token).
- **Console da página:** só um aviso informativo do campo de senha fora de formulário (de antes da M1.5a) e, durante os reinícios, as falhas de conexão esperadas.
- **Contraste AA:** medido pelo teste `console-nova.test.ts` nos dois temas, para texto, secundário, discreto, destaque, estados e botão principal, sobre o fundo, o brilho e o vidro. Pior caso: 4,70.

## Achados e correções

1. **Contraste do protótipo.** O texto discreto, os estados no tema claro e o texto do botão principal ficavam abaixo de 4,5. A luminosidade subiu, com o mesmo matiz oliva.
2. **Fundo claro fora da paleta.** O protótipo usava matiz 112, fora da faixa 118–125 da SPEC. Passou a 118.
3. **Tela inicial fora do documento.** Com uma conversa aberta, a página buscava partes da tela inicial por id, e quebraria na troca de idioma e na atualização dos harnesses. Teste antes; agora usa a referência guardada.
4. **Ícones invisíveis no escuro.** Os SVG do registro são pretos, e `<img>` não herda a cor do texto. Teste antes; o ícone virou máscara na cor do texto, como no protótipo.
5. **Bloco de código pesado no claro.** O fundo virou um tom oliva translúcido, leve nos dois temas.
6. **Celular:**
   - os rótulos das pílulas e do "Mostrar raciocínio" passaram a ser escondidos só da vista: com `display: none`, o leitor de tela perdia o nome;
   - o botão de enviar caía para uma segunda linha, e agora fica à direita, na mesma linha.
7. **Provedores nos Ajustes.** O selo da credencial espremia o nome do modelo; a linha agora quebra.

## Limites

- **O que fica para a M1.5b:** as pílulas de harness na tela inicial ainda são só mostra (não escolhem nada). Escolher o harness, conversar com ele e o cartão de permissão com ícone são da M1.5b.
- **O que fica para a M1.5c:** o seletor de modelo do catálogo.
- **Validação do Pai:** a do Pai pela console vem no fim da M1.5 (M1.5d).
