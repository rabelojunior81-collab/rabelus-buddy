# Relógio e fuso de Curitiba

**Classe:** CONHECIMENTO · **Última verificação:** 2026-10-14T10:24:20-03:00 · **Estado:** vigente

## O que importa para o buddy

Toda data do projeto usa a zona IANA `America/Sao_Paulo` (Curitiba não tem zona própria) com offset explícito. A hora vem do tzdata do runtime (`Intl`), nunca de offset fixo nem do `date` do shell. O relógio local é conferido contra a trace da Cloudflare.

## Fatos verificados

| Fato | Fonte | Verificado em |
|---|---|---|
| Windows desta máquina em "E. South America Standard Time" (UTC-03:00 Brasília) | `Get-TimeZone` (medição local) | 2026-10-14 |
| `TZ=America/Sao_Paulo date` no Git Bash (MSYS) devolve `+0000` em silêncio | medição local, Git 2.56.0.windows.2 | 2026-10-14 |
| `Intl` do Node 26.11.1 resolve `America/Sao_Paulo` e o histórico (2018-12-01 → `-02:00`, horário de verão) | teste `scripts/test/time.test.mjs` | 2026-10-14 |
| `Date` do `api.github.com` oscilou 1 s, 10 s e 31 s em minutos | 8 amostras locais | 2026-10-14 |
| `https://www.cloudflare.com/cdn-cgi/trace` traz `ts=` com milissegundos; desvio local ±0,3 s | 3 amostras locais (RTT ~120 ms) | 2026-10-14 |
| `Date` do `www.google.com` com desvio 0–1 s | 3 amostras locais | 2026-10-14 |

## Explicação

Um fuso não é um número: é uma regra que muda com leis. O Brasil teve horário de verão até 2019; uma conta "UTC-3 fixo" erraria qualquer data daquela época e erraria de novo se a lei mudar. Por isso usamos o banco de dados de fusos (tzdata) que o runtime atualiza.

Para conferir se o relógio da máquina está certo, compara-se com um servidor. Cabeçalhos `Date` de APIs atrás de CDN podem vir de cache e errar por dezenas de segundos; a trace da Cloudflare é gerada na hora e tem milissegundos.

## Implicações

- `scripts/lib/time.mjs` é a única fonte de hora do projeto; `bd now --verify` antes de datar.
- Sem rede, o estado é `unverified` e assim é registrado; nunca se inventa valor.
- Limite de desvio aceito: 120 s.

## Histórico de verificações

- 2026-10-14T10:24:20-03:00 · buddy-dev (claude-code-c33594) · criação da ficha
