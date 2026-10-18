// Contexto essencial de governança (regra do Pai, 2026-10-18): a compactação de contexto não pode quebrar o
// mecanismo. Depois de compactar (e ao abrir ou retomar), o harness recebe isto antes de agir: quem sou, a sessão e
// o escopo exatos, o estado do git, o que está reservado e rodando, o que aguarda o Pai, o próximo passo do plano,
// os últimos registros da sessão e as regras do que fazer e do que não fazer. Fica abaixo de 10 mil caracteres
// (o limite do gancho SessionStart do Claude Code, verificado em 2026-10-18).
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { commonDir, currentBranch, tryGit } from './git.mjs';
import { currentSession, logEvent, status } from './bus.mjs';
import { listServers } from './servers.mjs';
import { checkValidations } from './validacoes.mjs';
import { formats } from './time.mjs';

const cut = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

function activePlan(root) {
  const base = join(root, 'docs/50-planos');
  if (!existsSync(base)) return null;
  for (const d of readdirSync(base, { withFileTypes: true }).filter((x) => x.isDirectory()).map((x) => x.name).sort().reverse()) {
    const p = join(base, d, 'PLANO.md');
    if (!existsSync(p)) continue;
    const t = readFileSync(p, 'utf8');
    if (!/\*\*Estado:\*\*\s*em execução/.test(t)) continue;
    const next = /^\s*- \[ \] (.+)$/m.exec(t)?.[1] ?? '(todas as sub-fases marcadas)';
    return { path: `docs/50-planos/${d}/PLANO.md`, next: cut(next, 400) };
  }
  return null;
}

function statusNow(root) {
  const p = join(root, '.buddy-dev/STATUS.md');
  if (!existsSync(p)) return null;
  // O "Agora" mais recente (o último), nunca um parágrafo antigo esquecido acima dele.
  const line = readFileSync(p, 'utf8').split('\n').filter((l) => /\*\*Agora/.test(l)).at(-1);
  return line ? cut(line.slice(line.lastIndexOf('**Agora')), 900) : null;
}

function sessionEvents(root, id, n = 8) {
  const dir = join(root, '.buddy-dev/bus/ledger');
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true }).map(String).filter((f) => f.includes(id) && f.endsWith('.json')).sort().slice(-n)
    .map((f) => { try { return JSON.parse(readFileSync(join(dir, f), 'utf8')); } catch { return null; } })
    .filter(Boolean).map((e) => `- ${e.ts.slice(11, 16)} ${e.type}: ${cut(e.summary, 200)}`);
}

export function governanceContext(root) {
  const out = [];
  out.push(`CONTEXTO DE GOVERNANÇA (bd contexto, ${formats().iso}) — Rabelus Buddy`);
  out.push('Se você foi invocado como buddy-dev (Buddy Fenix), a identidade mora em .buddy-dev/ (AGENTS.md, BOOTSTRAP.md). Com o Pai: pt-BR, claro, sem só citar arquivos; grau de certeza declarado.');
  const s = currentSession(root);
  if (s) {
    out.push(`SESSÃO: ${s.id} · ${s.harness} · ${s.model} · desde ${s.startedAt ?? s.started ?? '?'}`);
    out.push(`ESCOPO: ${cut(s.scope ?? '', 600)}`);
  } else {
    out.push('SESSÃO: sem sessão aberta neste worktree. Antes de agir: bd session start --harness … --model … --scope "<escopo real>", git pull --ff-only, bd pre.');
  }
  const branch = currentBranch(root);
  const dirty = (tryGit(root, 'status', '--porcelain') ?? '').split('\n').filter(Boolean).length;
  const lr = tryGit(root, 'rev-list', '--left-right', '--count', '@{u}...HEAD');
  const sync = lr ? (([b, a]) => `${a} à frente, ${b} atrás do upstream`)(lr.split(/\s+/)) : 'sem upstream';
  out.push(`GIT: branch ${branch}${branch === 'main' ? ' (trabalho novo nasce em branch)' : ''} · ${sync} · ${dirty} arquivo(s) não commitado(s)`);
  const claims = (status(root).claims ?? []).filter((c) => !c.expired);
  out.push(`CLAIMS ATIVOS: ${claims.length ? claims.map((c) => `${c.resource} (${c.session})`).join(', ') : 'nenhum'} — claim antes de editar documento vivo`);
  const servers = listServers(root);
  out.push(`SERVIDORES VIVOS: ${servers.length ? servers.map((x) => `${x.id} ${x.name}${x.port ? ` porta ${x.port}` : ''} (sessão ${x.session ?? '—'})`).join(', ') : 'nenhum'} — reaproveite (bd serve) e encerre ao terminar (bd serve --stop)`);
  let pai = [];
  try { pai = checkValidations(root).aguardaPai ?? []; } catch { /* sem registro de validações */ }
  out.push(`AGUARDA O PAI: ${pai.length ? pai.map((v) => `${v.id} — ${cut(v.descricao, 160)}`).join('; ') : 'nada'}`);
  const now = statusNow(root);
  if (now) out.push(`ESTADO (STATUS.md): ${now}`);
  const plan = activePlan(root);
  out.push(plan ? `PLANO ATIVO: ${plan.path} → próximo: ${plan.next}` : 'PLANO ATIVO: nenhum em execução');
  if (s) {
    const ev = sessionEvents(root, s.id);
    if (ev.length) out.push(`ÚLTIMOS REGISTROS DA SESSÃO:\n${ev.join('\n')}`);
  }
  out.push('RITO: ANTES bd session start, git pull --ff-only, bd pre · DURANTE bd claim antes de editar documento vivo; teste antes do código; commit e push a cada passo; bd session log de decisão, erro e aprendizado; servidor só por bd serve · DEPOIS bd changelog add, diário, superfícies em dia ANTES do bd session end, post e daily no Blog (gate VERDE, QA 375/1440), bd session end, bd post, PR, CI verde, bd merge.');
  out.push('NÃO FAZER: nunca apagar (archive com lápide); nunca afrouxar teste; nunca segredo no repositório nem impresso; nunca pedir ao Pai teste não ensaiado nem por terminal; não instalar harness nem dependência sem aprovação; fora do repositório só leitura justificada; nunca deixar servidor esquecido; código com escape ou regex se edita com Edit/Write.');
  out.push('RELER ANTES DE AGIR: AGENTS.md, .buddy-dev/STATUS.md, o plano ativo e as regras do Pai em .buddy-dev/MEMORY.md. A memória de trabalho não é fonte.');
  return out.join('\n');
}

// PostCompact: o resumo fica fora do repositório (pode conter dado pessoal); o ledger guarda só o fato.
export function recordCompaction(root, { trigger = 'auto', summary = '' } = {}) {
  const dir = join(commonDir(root), 'buddy-bus', 'compactions');
  mkdirSync(dir, { recursive: true });
  const f = formats();
  const file = join(dir, `${f.stamp}-${trigger}.md`);
  writeFileSync(file, `# Compactação (${trigger}) em ${f.iso}\n\n${summary}\n`);
  if (currentSession(root)) logEvent(root, { type: 'compactacao', summary: `contexto compactado (${trigger}); resumo guardado fora do repositório; bd contexto reinjetado`, data: { trigger, chars: summary.length } });
  return { file };
}
