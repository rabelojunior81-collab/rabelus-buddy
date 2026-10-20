# Ensaio: anexos na console nova (M1.3b)

**Classe:** REGISTRO · **Data:** 2026-10-20T00:58:56-03:00 · **Por:** buddy-dev (sessão `claude-code-vs-code-d51ce9`) · **Para:** SPEC 0002, critérios 9 e 11 (AGENTS §5.9)

## Como

- **Núcleo temporário:** iniciado pelo `bd serve` com o código da branch `feat/m1-3-multimodal`, com estado próprio, porta 47399 e o catálogo real. Ele foi reiniciado pelo `bd serve` depois da correção e encerrado no fim.
- **Navegador:** Chromium real, a 1440 e a 375 px.
- **Imagem:** um PNG de 64×64 pixels, todo vermelho (RGB 220, 20, 20).

## O que aconteceu

1. **Anexar:** com o **Nemotron 3.5 Super VL (free)** escolhido no seletor, a imagem entrou pelo 📎 (seletor de arquivos de verdade) e virou chip. Um `contexto.md` arrastado para a caixa (o contorno tracejado aparece) virou o segundo chip ([captura](./m13b-1440-chips.png)).
2. **Enviar:** a pergunta "Qual é a cor da imagem anexada?" foi enviada, e o **Nemotron respondeu "vermelho"** em 4,2 s. A mensagem na conversa mostra os dois anexos pelo nome, e os chips da caixa foram limpos ([captura](./m13b-1440-resposta.png)).
3. **Recusar:** com um modelo `gpt-oss` escolhido, tentar anexar a imagem foi **recusado antes de subir**, com o motivo: "quem vai executar não enxerga imagem; escolha um modelo com visão".
4. **Celular:** a 375 px, sem rolagem para os lados ([captura](./m13b-375-caixa.png)).

## Achado e correção, com teste antes

- **📎 largo no celular.** A 375 px, o botão de anexar herdava a regra que faz as pílulas dividirem o espaço; ficava largo e espremia o modelo até "g…". Agora tem só o tamanho dele: 36 px, e o modelo volta a 188 px.

## Limites

- **Colar imagem:** o caminho de colar está no código e na estrutura testada, mas não foi exercitado com a área de transferência real neste ensaio. Arrastar e o seletor de arquivos foram.
- **Validação do Pai:** anexar uma imagem pela console é parte do ensaio real com o Pai (critério 12, M1.6).
