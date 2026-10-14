// Relógio canônico do projeto: Curitiba/Brasil.
// Curitiba não tem zona própria no tzdata; segue a zona IANA America/Sao_Paulo.
// Nunca usar offset fixo: o tzdata sabe do histórico (ex.: horário de verão até 2019).
// Cicatriz de 2026-10-14: no Git Bash do Windows, `TZ=America/Sao_Paulo date` devolve +0000 em silêncio.

export const ZONE = 'America/Sao_Paulo';

export function isKnownZone(zone) {
  try {
    new Intl.DateTimeFormat('en', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

function parts(date, zone) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23', timeZoneName: 'longOffset',
  });
  const p = Object.fromEntries(fmt.formatToParts(date).map((x) => [x.type, x.value]));
  const offset = p.timeZoneName.replace('GMT', '') || '+00:00';
  return { ...p, offset };
}

export function formats(date = new Date(), zone = ZONE) {
  const p = parts(date, zone);
  const d = `${p.year}-${p.month}-${p.day}`;
  return {
    zone,
    iso: `${d}T${p.hour}:${p.minute}:${p.second}${p.offset}`,
    stamp: `${d}T${p.hour}${p.minute}${p.second}${p.offset.replace(':', '')}`,
    date: d,
    datePath: `${p.year}/${p.month}/${p.day}`,
    human: new Intl.DateTimeFormat('pt-BR', { timeZone: zone, dateStyle: 'full', timeStyle: 'long' }).format(date),
    utc: date.toISOString(),
  };
}

// Compara o relógio local com o cabeçalho Date de um servidor confiável.
// Sem rede, o resultado é declarado 'unverified', nunca inventado.
export async function verifyClock({
  url = 'https://api.github.com',
  limitSec = 120,
  fetchImpl = fetch,
  now = () => new Date(),
} = {}) {
  try {
    const before = now().getTime();
    const res = await fetchImpl(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
    const after = now().getTime();
    const header = res.headers.get('date');
    if (!header) return { state: 'unverified', reason: 'sem cabeçalho Date', source: url };
    const driftSec = Math.round(((before + after) / 2 - new Date(header).getTime()) / 1000);
    return { state: Math.abs(driftSec) <= limitSec ? 'ok' : 'drift', driftSec, limitSec, source: url };
  } catch (e) {
    return { state: 'unverified', reason: e.message, source: url };
  }
}
