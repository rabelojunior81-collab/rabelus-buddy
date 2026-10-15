import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { checkBlogDelivery } from '../lib/blog.mjs';

// Cada teste monta um "Blog" de verdade: um remoto bare e um clone com posts, daily e manifesto.
let origin, blog;
const SINCE = '2026-10-15T03:00:00-03:00';

function sh(cwd, ...args) {
  return execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function commitAt(iso, msg) {
  sh(blog, 'add', '-A');
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', msg], {
    cwd: blog, stdio: 'ignore', env: { ...process.env, GIT_AUTHOR_DATE: iso, GIT_COMMITTER_DATE: iso },
  });
}

const post = (author, { daily = true } = {}) => `<!DOCTYPE html><html><head><meta name="author" content="${author}" /></head><body>
<p>${daily ? '<a href="../daily/2026-10-15-buddy-dev.html">daily editorial</a>' : 'sem daily'}</p></body></html>`;

function writePost(slug, author, opts) {
  writeFileSync(join(blog, 'posts', `${slug}.html`), post(author, opts));
}
function writeDaily(links) {
  writeFileSync(join(blog, 'daily', '2026-10-15-buddy-dev.html'),
    `<html><body>${links.map((s) => `<a href="../posts/${s}.html">x</a>`).join('')}</body></html>`);
}
function writeManifest(slugs) {
  writeFileSync(join(blog, 'posts-manifest.json'), JSON.stringify({ posts: slugs.map((slug) => ({ slug })) }));
}

beforeEach(() => {
  const base = mkdtempSync(join(tmpdir(), 'buddy-blog-'));
  origin = join(base, 'origin.git');
  blog = join(base, 'blog');
  execFileSync('git', ['init', '-q', '--bare', '-b', 'master', origin]);
  execFileSync('git', ['clone', '-q', origin, blog], { stdio: 'ignore' });
  mkdirSync(join(blog, 'posts'));
  mkdirSync(join(blog, 'daily'));
  writePost('2026-10-14-antigo', 'buddy-dev');
  writeManifest(['2026-10-14-antigo']);
  commitAt('2026-10-14T10:00:00-03:00', 'antigo');
  sh(blog, 'push', '-q', '-u', 'origin', 'HEAD');
});

const check = () => checkBlogDelivery(blog, { since: SINCE, fetch: false });

test('sem post publicado depois do início da sessão: reprova', () => {
  const r = check();
  assert.equal(r.ok, false);
  assert.match(r.problems.join('\n'), /nenhum post/);
});

test('post publicado, com daily ligada nos dois sentidos e no manifesto: aprova', () => {
  writePost('2026-10-15-novo', 'Buddy Fenix');
  writeDaily(['2026-10-15-novo']);
  writeManifest(['2026-10-15-novo', '2026-10-14-antigo']);
  commitAt('2026-10-15T03:30:00-03:00', 'blog: post');
  sh(blog, 'push', '-q');
  const r = check();
  assert.deepEqual(r.problems, []);
  assert.equal(r.ok, true);
  assert.deepEqual(r.posts, ['posts/2026-10-15-novo.html']);
});

test('post de outro autor não conta', () => {
  writePost('2026-10-15-do-irmao', 'LARS Rabelus');
  commitAt('2026-10-15T03:30:00-03:00', 'post do irmão');
  sh(blog, 'push', '-q');
  assert.match(check().problems.join('\n'), /nenhum post/);
});

test('post sem push: reprova', () => {
  writePost('2026-10-15-novo', 'Buddy Fenix');
  writeDaily(['2026-10-15-novo']);
  writeManifest(['2026-10-15-novo']);
  commitAt('2026-10-15T03:30:00-03:00', 'blog: post');
  const r = check();
  assert.equal(r.ok, false);
  assert.match(r.problems.join('\n'), /sem push/);
});

test('alteração não commitada no Blog: reprova', () => {
  writePost('2026-10-15-rascunho', 'Buddy Fenix');
  assert.match(check().problems.join('\n'), /não commitad/);
});

test('daily ausente, sem link de volta ou fora do manifesto: reprova com cada motivo', () => {
  writePost('2026-10-15-novo', 'Buddy Fenix', { daily: false });
  commitAt('2026-10-15T03:30:00-03:00', 'blog: post');
  sh(blog, 'push', '-q');
  const p = check().problems.join('\n');
  assert.match(p, /daily .*2026-10-15-buddy-dev\.html.* ausente/);
  assert.match(p, /não liga para a daily/);
  assert.match(p, /fora do posts-manifest/);
});

test('Blog ausente: reprova com instrução de clone', () => {
  const r = checkBlogDelivery(join(blog, 'nao-existe'), { since: SINCE, fetch: false });
  assert.equal(r.ok, false);
  assert.match(r.problems.join('\n'), /gh repo clone/);
});
