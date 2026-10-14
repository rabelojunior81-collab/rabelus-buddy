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

// Fontes de referência, em ordem. Cicatriz de 2026-10-14: o cabeçalho Date do
// api.github.com oscilou 1s, 10s e 31s em minutos (cache de CDN); a trace da
// Cloudflare traz o horário do servidor com milissegundos e ficou em ±0,3s.
export const CLOCK_SOURCES = [
  {
    url: 'https://www.cloudflare.com/cdn-cgi/trace',
    method: 'GET',
    read: async (res) => Number((await res.text()).match(/^ts=([\d.]+)$/m)?.[1]) * 1000 || null,
  },
  {
    url: 'https://www.google.com',
    method: 'HEAD',
    read: async (res) => (res.headers.get('date') ? new Date(res.headers.get('date')).getTime() : null),
  },
];

// Compara o relógio local com a primeira fonte que responder.
// Sem nenhuma fonte, o resultado é declarado 'unverified', nunca inventado.
export async function verifyClock({
  sources = CLOCK_SOURCES,
  limitSec = 120,
  fetchImpl = fetch,
  now = () => new Date(),
} = {}) {
  const errors = [];
  for (const { url, method, read } of sources) {
    try {
      const before = now().getTime();
      const res = await fetchImpl(url, { method, signal: AbortSignal.timeout(5000) });
      const after = now().getTime();
      const remote = await read(res);
      if (!remote) throw new Error('resposta sem horário');
      const driftSec = Math.round(((before + after) / 2 - remote) / 1000);
      return { state: Math.abs(driftSec) <= limitSec ? 'ok' : 'drift', driftSec, limitSec, source: url };
    } catch (e) {
      errors.push(`${url}: ${e.message}`);
    }
  }
  return { state: 'unverified', reason: errors.join('; ') };
}
