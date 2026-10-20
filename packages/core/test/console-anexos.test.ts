// SPEC 0002, critérios 9 e 11 (M1.3b): anexos na caixa da console nova. Anexar, arrastar e colar; cada anexo sobe na
// hora e vira chip removível; imagem só quando quem executa enxerga; o tipo do navegador é corrigido pela extensão; a
// mensagem na conversa mostra os anexos; os motivos novos aparecem em frase.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const PAGE = readFileSync(join(import.meta.dirname, '..', 'console', 'index.html'), 'utf8');
function pure<T>(names: string[]): T {
  const a = PAGE.indexOf('// <puras>');
  const b = PAGE.indexOf('// </puras>');
  return new Function(`${PAGE.slice(a, b)}; return { ${names.join(', ')} };`)() as T;
}

test('tipo do anexo: imagem e texto aceitos; o tipo do navegador corrigido pela extensão; o resto recusado (critério 9)', () => {
  const { attachMime } = pure<{ attachMime: (name: string, type: string) => string | null }>(['attachMime']);
  assert.equal(attachMime('foto.png', 'image/png'), 'image/png');
  assert.equal(attachMime('foto.JPG', ''), 'image/jpeg', 'sem tipo: pela extensão');
  assert.equal(attachMime('app.ts', 'video/mp2t'), 'text/plain', '.ts chega como vídeo MPEG-TS no navegador');
  assert.equal(attachMime('notas.md', ''), 'text/markdown');
  assert.equal(attachMime('dados.json', 'application/json'), 'application/json');
  assert.equal(attachMime('script.py', 'text/x-python'), 'text/x-python');
  assert.equal(attachMime('doc.pdf', 'application/pdf'), null);
  assert.equal(attachMime('filme.mp4', 'video/mp4'), null);
});

test('imagem só quando quem executa enxerga: Automático sim; modelo sem visão não; harness pela sonda (critério 9)', () => {
  const { canAttachImage } = pure<{ canAttachImage: (o: { harness: string; model: { vision?: boolean } | null; probe: { image?: boolean } | null }) => boolean }>(['canAttachImage']);
  assert.equal(canAttachImage({ harness: 'buddy', model: null, probe: null }), true, 'Automático: o núcleo pula as rotas sem visão');
  assert.equal(canAttachImage({ harness: 'buddy', model: { vision: true }, probe: null }), true);
  assert.equal(canAttachImage({ harness: 'buddy', model: { vision: false }, probe: null }), false);
  assert.equal(canAttachImage({ harness: 'opencode', model: null, probe: { image: true } }), true);
  assert.equal(canAttachImage({ harness: 'opencode', model: null, probe: { image: false } }), false);
  assert.equal(canAttachImage({ harness: 'opencode', model: null, probe: null }), false, 'harness ainda não conferido: espera a sonda');
});

test('página: anexar, arrastar e colar; sobe na hora; chips; a tarefa leva os hashes; a conversa mostra os anexos; motivos em frase (critérios 9 e 11)', () => {
  assert.match(PAGE, /id="aBtn"[^>]*data-i18n-aria="console\.attach\.add"/, 'botão de anexar');
  assert.match(PAGE, /<input id="aFile" type="file" multiple/, 'seletor de arquivos');
  assert.match(PAGE, /id="chips"/, 'chips dos anexos');
  assert.ok(PAGE.includes("addEventListener('drop'"), 'arrastar');
  assert.ok(PAGE.includes("addEventListener('paste'"), 'colar');
  assert.ok(PAGE.includes("api('attachment.put', {"), 'sobe pelo núcleo');
  assert.match(PAGE, /params\.attachments = pending/, 'a tarefa leva os anexos');
  assert.match(PAGE, /m\.attachments/, 'a mensagem mostra os anexos');
  assert.match(PAGE, /noVisionRoute: 'console\.reason\.noVisionRoute'/);
  assert.match(PAGE, /attachmentMissing: 'console\.reason\.attachmentMissing'/);
  for (const lang of ['pt-BR', 'en']) {
    const cat = JSON.parse(readFileSync(join(import.meta.dirname, '..', '..', '..', 'locales', lang, 'console.json'), 'utf8')) as { console: { reason: Record<string, unknown> } };
    for (const k of ['noVisionRoute', 'attachmentMissing']) assert.equal(typeof cat.console.reason[k], 'string', `${lang}: console.reason.${k}`);
  }
});
