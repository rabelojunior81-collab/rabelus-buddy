# Arquivo morto

**Classe:** ARQUEOLOGIA · somente leitura · o que entra aqui nunca sai.

Nada neste projeto se apaga ([ADR 0004](../docs/60-decisoes/0004-nada-se-apaga.md)). O que sai de uso entra aqui por:

```sh
npm run bd -- archive <caminhos...> --reason "por que saiu de uso" --name "nome curto"
```

O comando move com `git mv` (o histórico segue o arquivo) para `archive/<carimbo>-<slug>/`, escreve `LAPIDE.md` com o motivo e `manifest.json` com o sha256 de cada arquivo.

`archive/changelog/` recebe os lotes podados do `.buddy-dev/CHANGELOG.md` (teto de 50 entradas), sempre depois de as lições do lote entrarem na `LEARNING-CURVE.md`.

Para reaproveitar algo daqui: copie para fora citando a lápide. Nunca mova de volta.
