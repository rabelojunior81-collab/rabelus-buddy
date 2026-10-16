// Identificação do cliente e confiança TLS, comuns a todos os provedores.

import tls from 'node:tls';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const version = (JSON.parse(readFileSync(join(import.meta.dirname, '..', '..', 'package.json'), 'utf8')) as { version: string }).version;
// Termos do Go: o cliente se identifica com user agent próprio (ficha assinaturas-de-agentes).
export const USER_AGENT = `rabelus-buddy/${version}`;

// Certificados do sistema somados aos embutidos no Node (registro 2026-10-16: o Node 26.11 recusava a
// cadeia do OpenRouter). Nunca desliga a verificação; só amplia a confiança ao repositório do sistema.
let trusted = false;
export function trustSystemCAs(): void {
  if (trusted) return;
  tls.setDefaultCACertificates([...tls.getCACertificates('default'), ...tls.getCACertificates('system')]);
  trusted = true;
}
