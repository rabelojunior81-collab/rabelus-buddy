// Gate do Blog: toda sessão com o Pai entrega um post e a daily editorial ligada a ele.
//
// Regra do Blog (BLOG_GOVERNANCE §5, v2.0): "Toda interação com o Pai → post no blog.
// Sem exceção." Em 2026-10-15 o buddy-dev fechou uma sessão sem post e o Pai pediu
// enforcement. Este módulo confere, no clone local do Blog, o que já está publicado:
// - um post do buddy-dev commitado no upstream depois do início da sessão;
// - a daily do dia do post, que liga para ele, e o post ligando de volta à daily;
// - o post no posts-manifest.json;
// - o clone limpo e sem commits pendentes de push.

import { existsSync, readFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { tryGit } from './git.mjs';

export const AUTHORS = ['Buddy Fenix', 'buddy-dev'];
export const DAILY_SLUG = 'buddy-dev';
export const BLOG_REPO = 'rabelojunior81-collab/rabelus-lab-blog';

// Onde mora o clone do Blog: BD_BLOG_DIR ou <repo>/workspace/blog (ignorado pelo git).
export function blogDir(root, env = process.env) {
  return env.BD_BLOG_DIR || join(root, 'workspace', 'blog');
}

const authorOf = (html) => html.match(/<meta\s+name="author"\s+content="([^"]*)"/i)?.[1];

export function checkBlogDelivery(dir, { since, authors = AUTHORS, dailySlug = DAILY_SLUG, fetch = true } = {}) {
  const problems = [];
  const fail = (m) => problems.push(m);
  const result = () => ({ ok: problems.length === 0, problems, posts });
  let posts = [];

  if (!existsSync(dir) || tryGit(dir, 'rev-parse', '--is-inside-work-tree') !== 'true') {
    fail(`clone do Blog ausente em ${dir}: gh repo clone ${BLOG_REPO} ${dir}`);
    return result();
  }
  if (fetch) tryGit(dir, 'fetch', '-q', 'origin');
  const upstream = tryGit(dir, 'rev-parse', '--abbrev-ref', '@{u}');
  if (!upstream) {
    fail('Blog sem upstream: o clone precisa acompanhar origin');
    return result();
  }
  const dirty = tryGit(dir, 'status', '--porcelain');
  if (dirty) fail(`Blog com alterações não commitadas:\n    ${dirty.split('\n').join('\n    ')}`);
  const ahead = Number(tryGit(dir, 'rev-list', '--count', `${upstream}..HEAD`) ?? 0);
  if (ahead) fail(`Blog com ${ahead} commit(s) sem push`);

  // Posts que entraram no upstream depois do início da sessão (só o que está publicado conta).
  const touched = (tryGit(dir, 'log', upstream, `--since=${since}`, '--name-only', '--pretty=format:', '--', 'posts/') ?? '')
    .split('\n').map((s) => s.trim()).filter((f) => /^posts\/[^/]+\.html$/.test(f));
  posts = [...new Set(touched)].filter((f) => {
    if (!existsSync(join(dir, f))) return false;
    return authors.includes(authorOf(readFileSync(join(dir, f), 'utf8')));
  }).sort();
  if (!posts.length) {
    fail(`nenhum post de ${authors.join(' / ')} publicado no Blog desde ${since} (BLOG_GOVERNANCE §5: toda sessão com o Pai gera um post)`);
    return result();
  }

  let manifest = [];
  try {
    manifest = JSON.parse(readFileSync(join(dir, 'posts-manifest.json'), 'utf8')).posts.map((p) => p.slug);
  } catch {
    fail('posts-manifest.json ilegível');
  }

  for (const f of posts) {
    const slug = basename(f, '.html');
    const date = slug.slice(0, 10);
    const dailyRel = `daily/${date}-${dailySlug}.html`;
    const dailyPath = join(dir, dailyRel);
    if (!existsSync(dailyPath)) fail(`daily ${dailyRel} ausente para ${f}`);
    else if (!readFileSync(dailyPath, 'utf8').includes(`${slug}.html`)) fail(`${dailyRel} não liga para ${f}`);
    if (!readFileSync(join(dir, f), 'utf8').includes(`${date}-${dailySlug}.html`)) fail(`${f} não liga para a daily ${dailyRel}`);
    if (!manifest.includes(slug)) fail(`${f} fora do posts-manifest.json`);
  }
  return result();
}
