// Anexos (SPEC 0002, escopo 7 e critério 9): imagem e texto que o Pai anexa à mensagem. Ficam na pasta de trabalho, em
// anexos/<sha256>.<ext>; o log guarda só a referência (hash, nome, tipo, espécie, tamanho), nunca o conteúdo. O conteúdo
// é lido do arquivo, com o hash conferido, só na hora de montar o pedido ao provedor ou ao harness.

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';

export type AttachmentKind = 'image' | 'text';
export interface Attachment { hash: string; name: string; mime: string; kind: AttachmentKind; size: number }
// Conteúdo para o pedido (nunca vai ao log): imagem em base64, texto como texto.
export interface AttachmentFile { kind: AttachmentKind; name: string; mime: string; data?: string; text?: string }

export class AttachmentError extends Error {}

// Tipos da SPEC: PNG, JPEG, WebP e GIF; texto, markdown e código.
const IMAGES: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };
const TEXT_APP = new Set(['application/json', 'application/javascript', 'application/typescript', 'application/x-typescript', 'application/xml', 'application/x-yaml', 'application/yaml', 'application/x-sh', 'application/toml']);
export const IMAGE_MAX = 5 * 1024 * 1024;
export const TEXT_MAX = 1024 * 1024;

const kindOf = (mime: string): AttachmentKind | null => (IMAGES[mime] ? 'image' : mime.startsWith('text/') || TEXT_APP.has(mime) ? 'text' : null);
// Extensão do arquivo guardado: a do tipo, para imagem; a do nome (só letras e números), para texto.
const extOf = (a: { mime: string; name: string }) => IMAGES[a.mime] ?? (extname(a.name).slice(1).replace(/[^a-z0-9]/gi, '').toLowerCase() || 'txt');
const pathOf = (workspace: string, a: { hash: string; mime: string; name: string }) => join(workspace, 'anexos', `${a.hash}.${extOf(a)}`);
// Nome sem caminho e sem caracteres de controle; vazio vira "anexo".
const cleanName = (name: string) => basename(String(name).replace(/\\/g, '/')).replace(/[\u0000-\u001f]/g, '').slice(0, 200) || 'anexo';

export function storeAttachment(workspace: string, input: { name: string; mime: string; data: string }): Attachment {
  const mime = String(input.mime).toLowerCase();
  const kind = kindOf(mime);
  if (!kind) throw new AttachmentError(`tipo de anexo não aceito: ${mime} (imagem PNG, JPEG, WebP ou GIF; texto ou código)`);
  const bytes = Buffer.from(String(input.data), 'base64');
  const max = kind === 'image' ? IMAGE_MAX : TEXT_MAX;
  if (bytes.length > max) throw new AttachmentError(`tamanho do anexo acima do limite (${Math.round(max / 1024 / 1024)} MB para ${kind === 'image' ? 'imagem' : 'texto'})`);
  if (kind === 'text') {
    try { new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { throw new AttachmentError('o anexo de texto não é texto UTF-8'); }
  }
  const hash = createHash('sha256').update(bytes).digest('hex');
  const a: Attachment = { hash, name: cleanName(input.name), mime, kind, size: bytes.length };
  mkdirSync(join(workspace, 'anexos'), { recursive: true });
  writeFileSync(pathOf(workspace, a), bytes);
  return a;
}

export function loadAttachment(workspace: string, a: Attachment): AttachmentFile {
  let bytes: Buffer;
  try { bytes = readFileSync(pathOf(workspace, a)); } catch { throw new AttachmentError(`anexo ${a.name} não está mais na pasta de trabalho`); }
  if (createHash('sha256').update(bytes).digest('hex') !== a.hash) throw new AttachmentError(`o arquivo do anexo ${a.name} não confere com o hash registrado`);
  return a.kind === 'image' ? { kind: 'image', name: a.name, mime: a.mime, data: bytes.toString('base64') } : { kind: 'text', name: a.name, mime: a.mime, text: bytes.toString('utf8') };
}
