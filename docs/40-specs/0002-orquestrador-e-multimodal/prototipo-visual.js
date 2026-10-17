// Protótipo interativo da SPEC 0002 (M1). Sem ligação com o núcleo: o catálogo de modelos é o instantâneo
// medido ao vivo (catalogo-modelos-instantaneo.json); harnesses, modelos deles e conversa são de exemplo.
// Duas camadas, duas escolhas (Pai): HARNESS (quem executa) e MODELO (com que cérebro).
'use strict';
const $ = (id) => document.getElementById(id);
const CDN = 'https://cdn.agentclientprotocol.com/registry/v1/latest/';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// ---------- camada 1: harness ----------
// models: modelos que o harness informa pelo ACP na criação da sessão (aqui, EXEMPLO marcado).
const harnesses = [
  { id: 'buddy', name: 'Buddy', desc: 'Orquestrador do Rabelus Buddy: usa os seus provedores e delega aos outros', icon: null, state: 'pronto' },
  { id: 'claude', name: 'Claude Code', desc: 'Anthropic · login próprio', icon: 'claude-acp.svg', state: 'pronto', models: ['Claude Opus 5.5', 'Claude Sonnet 5.5', 'Claude Haiku 5.5'] },
  { id: 'codex', name: 'Codex', desc: 'OpenAI · login com o ChatGPT', icon: 'codex-acp.svg', state: 'pronto', models: ['gpt-6.1-sol', 'gpt-6-sol', 'gpt-6-luna'] },
  { id: 'opencode', name: 'OpenCode', desc: 'usa os provedores configurados nele', icon: 'opencode.svg', state: 'pronto', models: ['opencode-go/kimi-k3', 'opencode-go/glm-5.3', 'opencode-go/qwen3.8-max'] },
  { id: 'copilot', name: 'Copilot', desc: 'GitHub', icon: 'github-copilot-cli.svg', state: 'precisa de login', models: ['(informados depois do login)'] },
  { id: 'pi', name: 'Pi', desc: 'harness mínimo (ADR 0016)', icon: 'pi-acp.svg', state: 'pronto', models: ['(informados pelo Pi)'] },
  { id: 'hermes', name: 'Hermes', desc: 'fora do registro oficial do ACP', icon: '', state: 'pronto', models: ['(informados pelo Hermes)'] },
  { id: 'gemini', name: 'Gemini CLI', desc: 'não instalado · gemini --acp', icon: 'gemini.svg', state: 'não instalado' },
];
const ico = (h, size = 18) => h.icon === null ? `<span class="ico buddy" style="width:${size}px;height:${size}px"></span>`
  : h.icon ? `<span class="ico" style="--src:url('${CDN}${h.icon}');width:${size}px;height:${size}px"></span>`
  : `<span class="ico" style="width:${size}px;height:${size}px;-webkit-mask:none;mask:none;background:none;border:1.5px solid currentColor;border-radius:5px"></span>`;

// ---------- camada 2: modelo ----------
const svg = (d) => `<svg class="cap" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const CAP = {
  vision: { t: 'Visão', i: svg('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>') },
  reasoning: { t: 'Raciocínio', i: svg('<path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/>') },
  tools: { t: 'Ferramentas', i: svg('<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>') },
  video: { t: 'Vídeo', i: svg('<rect x="2" y="6" width="14" height="12" rx="2"/><path d="m22 8-6 4 6 4z"/>') },
  open: { t: 'Pesos abertos', i: svg('<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/>') },
  ctx: { t: 'Contexto', i: svg('<path d="M3 6h18M3 12h12M3 18h7"/>') },
  plan: { t: 'Na assinatura', i: svg('<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>') },
  free: { t: 'Grátis', i: svg('<path d="M20 12v10H4V12M2 7h20v5H2zM12 22V7"/>') },
  paid: { t: 'Pago (API)', i: svg('<path d="M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>') },
};
const FILTERS = [['vision', 'Visão'], ['reasoning', 'Raciocínio'], ['tools', 'Ferramentas'], ['free', 'Grátis'], ['open', 'Pesos abertos'], ['big', 'Contexto 1M+']];
const ctxText = (n) => !n ? '—' : n >= 1e6 ? `${+(n / 1e6).toFixed(1)}M` : `${Math.round(n / 1000)}k`;
const priceCap = (p, m) => p.kind === 'assinatura' ? 'plan' : m.free ? 'free' : 'paid';
const has = (p, m, c) => c === 'big' ? (m.ctx ?? 0) >= 1e6 : c === 'free' ? m.free || p.kind === 'assinatura' && false : Boolean(m[c]);

let cat = null;
const st = { harness: 'buddy', prov: 'chatgpt', model: 'gpt-6.1-sol', hmodel: {}, effort: 'medium', filters: new Set(), recent: [], attachments: [], act: 0 };
const EFFORT_NAME = { default: 'Padrão', low: 'Baixo', medium: 'Médio', high: 'Alto', xhigh: 'Muito alto', max: 'Máximo', ultra: 'Ultra' };
const H = () => harnesses.find((h) => h.id === st.harness);
const P = (id = st.prov) => cat.providers.find((p) => p.id === id);
const M = () => P().models.find((m) => m.id === st.model);
const effortsOf = (m) => ['default', ...(Array.isArray(m.reasoning) ? m.reasoning : m.reasoning ? ['low', 'medium', 'high'] : [])];
const labIcon = (lab) => { const l = cat.labs[lab]; return l && !/outros/.test(lab) ? `<span class="lab" style="--src:url('${l.logo}')" title="${esc(l.name)}"></span>` : `<span class="lab-fb">${esc((l?.name ?? lab).slice(0, 2).toUpperCase())}</span>`; };
const toast = (t) => { const e = document.createElement('div'); e.className = 'toast'; e.textContent = t; document.body.append(e); setTimeout(() => e.remove(), 2200); };

// ---------- menu de harness ----------
function renderHarnessMenu() {
  $('hmenu').innerHTML = harnesses.map((h) => `<button class="mi" role="option" data-h="${h.id}" aria-disabled="${h.state === 'não instalado'}" aria-selected="${st.harness === h.id}">
    ${ico(h, 22)}<span class="tx"><b>${esc(h.name)}</b><small>${esc(h.desc)} · ${esc(h.state)}</small></span>${st.harness === h.id ? '<span class="ok">✓</span>' : ''}</button>`).join('');
}
$('harnessBtn').onclick = (e) => { e.stopPropagation(); $('hmenu').hidden = !$('hmenu').hidden; if (!$('hmenu').hidden) { const r = $('harnessBtn').getBoundingClientRect(); $('hmenu').style.left = Math.max(8, Math.min(r.left, innerWidth - 388)) + 'px'; $('hmenu').style.bottom = (innerHeight - r.top + 8) + 'px'; renderHarnessMenu(); $('hmenu').querySelector('[aria-selected="true"]')?.focus(); } };
$('hmenu').onclick = (e) => {
  const b = e.target.closest('[data-h]');
  if (!b || b.getAttribute('aria-disabled') === 'true') { if (b) toast('Não instalado: a console mostra o site para instalar'); return; }
  st.harness = b.dataset.h; $('hmenu').hidden = true; renderComposer(); render();
};

// ---------- paleta de modelos ----------
function openPalette() { $('palette').hidden = false; st.act = 0; renderPalette(); $('plSearch').value = ''; $('plSearch').focus(); }
function closePalette() { $('palette').hidden = true; $('pickBtn').focus(); }
function visibleRows() {
  const q = $('plSearch').value.trim().toLowerCase();
  if (st.harness !== 'buddy') return (H().models ?? []).filter((n) => !q || n.toLowerCase().includes(q)).map((n) => ({ kind: 'h', id: n, name: n }));
  const p = P();
  return p.models.filter((m) => (!q || `${m.name} ${m.id} ${cat.labs[m.lab]?.name}`.toLowerCase().includes(q)) && [...st.filters].every((f) => f === 'free' ? m.free : has(p, m, f)));
}
function renderPalette() {
  const buddy = st.harness === 'buddy';
  $('plFilters').innerHTML = buddy ? FILTERS.map(([k, t]) => `<button class="fchip" data-f="${k}" aria-pressed="${st.filters.has(k)}">${CAP[k]?.i ?? CAP.ctx.i}${t}</button>`).join('') : `<span class="meta">${ico(H())} Modelos informados por ${esc(H().name)} pelo ACP (exemplo no protótipo). As capacidades vêm do próprio harness.</span>`;
  $('plTabs').innerHTML = buddy ? cat.providers.map((p) => {
    const n = p.models.filter((m) => [...st.filters].every((f) => f === 'free' ? m.free : has(p, m, f))).length;
    return `<button class="tab" role="tab" data-p="${p.id}" aria-selected="${st.prov === p.id}"><b>${esc(p.name)}</b><small>${n} modelos · ${esc(p.kind)}</small></button>`;
  }).join('') : `<button class="tab" aria-selected="true"><b>${esc(H().name)}</b><small>modelos do harness</small></button>`;
  const rows = visibleRows();
  st.act = Math.min(st.act, Math.max(0, rows.length - 1));
  let html = '';
  if (!buddy) {
    html = rows.map((r, i) => `<button class="row ${i === st.act ? 'act' : ''} ${st.hmodel[st.harness] === r.id ? 'sel' : ''}" data-i="${i}">${ico(H())}<span class="nm">${esc(r.name)}</span><span class="rt">${st.hmodel[st.harness] === r.id ? '<span class="ck">✓</span>' : ''}</span></button>`).join('');
  } else {
    const p = P();
    const recent = st.recent.filter((r) => r.prov === p.id).map((r) => rows.find((m) => m.id === r.model)).filter(Boolean);
    const groups = [];
    if (recent.length && !$('plSearch').value) groups.push(['__recent', 'Recentes', recent]);
    const byLab = {};
    for (const m of rows) (byLab[m.lab] ??= []).push(m);
    for (const lab of Object.keys(byLab).sort((a, b) => byLab[b].length - byLab[a].length)) groups.push([lab, cat.labs[lab]?.name ?? lab, byLab[lab]]);
    let i = 0;
    const idx = [];
    for (const [lab, title, ms] of groups) {
      html += `<div class="grp-h">${lab === '__recent' ? CAP.ctx.i : labIcon(lab)}${esc(title)} <span style="font-weight:500">· ${ms.length}</span></div>`;
      for (const m of ms) {
        idx.push(m);
        const caps = ['vision', 'reasoning', 'tools', 'video', 'open'].filter((c) => m[c]);
        html += `<button class="row ${i === st.act ? 'act' : ''} ${st.model === m.id && st.prov === p.id ? 'sel' : ''}" data-i="${i}" role="option">
          ${labIcon(m.lab)}<span class="nm">${esc(m.name)}</span>
          <span class="rt"><span class="icons">${caps.map((c) => `<span class="on" title="${CAP[c].t}${c === 'reasoning' && Array.isArray(m.reasoning) ? `: ${m.reasoning.join(', ')}` : ''}">${CAP[c].i}</span>`).join('')}</span>
          <span class="meta">${/sem dados/.test(m.source) ? 'capacidades desconhecidas · ' : ctxText(m.ctx) + ' · '}<span class="badge2">${CAP[priceCap(p, m)].t}</span></span></span>
          <span class="id">${esc(m.id)}</span>${st.model === m.id && st.prov === p.id ? '' : ''}</button>`;
        i++;
      }
    }
    st.idx = idx;
  }
  $('plList').innerHTML = html || '<div class="meta" style="padding:24px">Nenhum modelo com esses filtros. Tire um filtro ou troque de provedor.</div>';
  $('plFoot').innerHTML = `<span><span class="kbd">↑</span> <span class="kbd">↓</span> navegar</span><span><span class="kbd">Enter</span> escolher</span><span><span class="kbd">Esc</span> fechar</span><span style="margin-left:auto">${buddy ? `fonte: ${esc(cat.fontes[st.prov])} · ${esc(cat.geradoEm)}` : 'fonte: ACP (session/new)'}</span>`;
  $('plList').querySelector('.row.act')?.scrollIntoView({ block: 'nearest' });
}
function choose(i) {
  if (st.harness !== 'buddy') { const r = visibleRows()[i]; if (r) st.hmodel[st.harness] = r.id; }
  else { const m = (st.idx ?? [])[i]; if (!m) return; st.model = m.id; st.recent = [{ prov: st.prov, model: m.id }, ...st.recent.filter((r) => !(r.prov === st.prov && r.model === m.id))].slice(0, 5); }
  closePalette(); renderComposer();
}
$('pickBtn').onclick = openPalette;
$('plClose').onclick = closePalette;
$('palette').onclick = (e) => { if (e.target === $('palette')) closePalette(); };
$('plSearch').oninput = () => { st.act = 0; renderPalette(); };
$('plFilters').onclick = (e) => { const b = e.target.closest('[data-f]'); if (!b) return; const f = b.dataset.f; st.filters.has(f) ? st.filters.delete(f) : st.filters.add(f); st.act = 0; renderPalette(); };
$('plTabs').onclick = (e) => { const b = e.target.closest('[data-p]'); if (!b) return; st.prov = b.dataset.p; st.act = 0; renderPalette(); $('plSearch').focus(); };
$('plList').onclick = (e) => { const b = e.target.closest('[data-i]'); if (b) choose(Number(b.dataset.i)); };
document.addEventListener('keydown', (e) => {
  if (!$('palette').hidden) {
    const n = st.harness === 'buddy' ? (st.idx ?? []).length : visibleRows().length;
    if (e.key === 'Escape') closePalette();
    else if (e.key === 'ArrowDown') { e.preventDefault(); st.act = Math.min(n - 1, st.act + 1); renderPalette(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); st.act = Math.max(0, st.act - 1); renderPalette(); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(st.act); }
    return;
  }
  if (e.key === 'Escape') $('hmenu').hidden = true;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette(); }
});
document.addEventListener('click', (e) => { if (!e.target.closest('#hmenu') && !e.target.closest('#harnessBtn')) $('hmenu').hidden = true; });

// ---------- caixa de mensagem ----------
function renderComposer() {
  const h = H();
  $('harnessBtn').innerHTML = `${ico(h, 16)}${esc(h.name)} ▾`;
  if (st.harness === 'buddy') {
    const p = P(); const m = M();
    $('pickBtn').innerHTML = `${labIcon(m.lab)}${esc(m.name)} <span style="opacity:.6;font-weight:500">· ${esc(p.name)}</span> ▾`;
    const ef = effortsOf(m);
    if (!ef.includes(st.effort)) st.effort = ef.includes('medium') ? 'medium' : 'default';
    $('effortBtn').hidden = false;
    $('effortBtn').innerHTML = `${CAP.reasoning.i} ${EFFORT_NAME[st.effort]}`;
    $('effortBtn').disabled = ef.length === 1;
    $('imgBtn').disabled = !m.vision;
    $('imgBtn').title = m.vision ? 'Anexar imagem' : `${m.name} não enxerga imagem: escolha um modelo com o ícone de visão`;
    const all = ['vision', 'reasoning', 'tools', 'video', 'open'];
    // Só o que o modelo tem; o único aviso de falta é a visão, que explica o botão de imagem desligado.
    $('caps').innerHTML = (m.vision ? '' : `<span class="capchip no" title="Este modelo não enxerga imagem">${CAP.vision.i}sem visão</span>`) + all.filter((c) => m[c]).map((c) => `<span class="capchip" title="${CAP[c].t}${c === 'reasoning' && Array.isArray(m.reasoning) ? ': ' + m.reasoning.join(', ') : ''}">${CAP[c].i}${CAP[c].t}${c === 'reasoning' && Array.isArray(m.reasoning) ? ` (${m.reasoning.length})` : ''}</span>`).join('')
      + `<span class="capchip" title="Janela de contexto">${CAP.ctx.i}${ctxText(m.ctx)}</span><span class="capchip">${CAP[priceCap(p, m)].i}${CAP[priceCap(p, m)].t}</span>`
      + `<span class="src" title="Capacidades segundo: ${esc(m.source)} (medido em ${esc(cat.geradoEm)})">ⓘ fonte</span>`;
  } else {
    const hm = st.hmodel[st.harness] ?? (h.models ?? [])[0] ?? '—';
    $('pickBtn').innerHTML = `${ico(h, 16)}${esc(hm)} <span style="opacity:.6;font-weight:500">· do ${esc(h.name)}</span> ▾`;
    $('effortBtn').hidden = true;
    $('imgBtn').disabled = false;
    $('caps').innerHTML = `<span class="capchip">${ico(h, 14)} ${esc(h.name)} executa; as permissões passam pelo núcleo</span><span class="src" title="Capacidades declaradas pelo harness no ACP (initialize)">ⓘ fonte</span>`;
  }
  $('chips').innerHTML = st.attachments.map((x) => `<span class="chip-att">${x.kind === 'img' ? '🖼' : '📄'} ${x.name}</span>`).join('');
}
$('effortBtn').onclick = () => { const ef = effortsOf(M()); st.effort = ef[(ef.indexOf(st.effort) + 1) % ef.length]; renderComposer(); };
$('attachBtn').onclick = () => { st.attachments.push({ kind: 'txt', name: 'notas.md' }); renderComposer(); toast('Arquivo anexado (exemplo)'); };
$('imgBtn').onclick = () => { st.attachments.push({ kind: 'img', name: 'print.png' }); renderComposer(); toast('Imagem anexada (exemplo)'); };
$('send').onclick = () => {
  const text = $('task').value.trim();
  if (!text) { toast('Escreva uma mensagem'); return; }
  v = 'chat';
  const h = H();
  const who = st.harness === 'buddy' ? `Buddy · ${esc(M().name)} · ${esc(P().name)} · ${EFFORT_NAME[st.effort]}` : `${esc(h.name)} · ${esc(st.hmodel[st.harness] ?? (h.models ?? [''])[0])} (via ACP)`;
  extra += `<div class="msg-you"><div>${esc(text)}</div>${st.attachments.length ? `<div class="attach">${st.attachments.map(() => '<span class="thumb"></span>').join('')}</div>` : ''}</div>
    <div class="who">${ico(h, 16)}${who}</div><div class="live"><span class="spin"></span>Pensando · 0 s · (protótipo: nada é enviado)</div>`;
  $('task').value = ''; st.attachments = []; render(); renderComposer();
};
$('task').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('send').click(); } });

// ---------- barra lateral e conversa de exemplo ----------
$('agents').innerHTML = harnesses.filter((h) => h.id !== 'buddy').map((h) => `<div class="agent" data-agent="${h.state === 'não instalado' ? '' : h.id}" style="cursor:${h.state === 'não instalado' ? 'default' : 'pointer'}">${ico(h)}${esc(h.name)}${h.icon === '' ? ' <small style="opacity:.6">fora do registro</small>' : ''}<span class="st ${h.state === 'pronto' ? '' : 'off'}" title="${esc(h.state)}"></span></div>`).join('');
const home = () => `<h1>Como posso ajudar, Pai?</h1>
  <div class="pills">${harnesses.filter((h) => h.state !== 'não instalado').map((h) => `<button class="pill ${st.harness === h.id ? 'on' : ''}" data-agent="${h.id}">${ico(h)}${esc(h.name)}</button>`).join('')}</div>
  <div class="sugg">Revise este repositório e proponha melhorias</div>
  <div class="sugg">O que há nesta imagem? (anexe um print)</div>
  <div class="sugg">Peça ao Codex para escrever os testes, e ao Claude Code para revisar</div>
  <div class="sugg">Resuma o que mudou hoje nos meus projetos</div>`;
const chat = () => `<div class="msg-you"><div>Revise o README e corrija o que estiver desatualizado. Use o Codex.</div><div class="attach"><span class="thumb"></span></div></div>
  <div class="who">${ico(harnesses[0], 16)}Buddy delegou a ${ico(harnesses[2], 16)} Codex · gpt-6.1-sol</div>
  <details class="details" open><summary>Raciocínio e ações (3)</summary><div>Leu README.md (412 linhas) · comparou com STATUS.md · encontrou 3 trechos desatualizados</div></details>
  <div class="perm">${ico(harnesses[2])}<span>Codex quer editar <code>README.md</code> (+12 −9)</span><span class="sp"></span><button class="btn-ghost" onclick="toast('Negado (exemplo)')">Negar</button><button class="btn-sm" onclick="toast('Aprovado (exemplo)')">Aprovar</button></div>
  <div class="answer">Encontrei três trechos desatualizados: o estado do M0, a ordem dos marcos e o atalho da console. A edição aguarda sua aprovação acima.</div>${extra}`;
let v = 'home';
let extra = '';
const render = () => { $('content').innerHTML = v === 'home' ? home() : chat(); document.querySelectorAll('.sugg').forEach((s) => { s.onclick = () => { $('task').value = s.textContent; $('task').focus(); }; }); };
document.addEventListener('click', (e) => { const a = e.target.closest('.pills [data-agent], .agents [data-agent]'); if (a && a.dataset.agent) { st.harness = a.dataset.agent; render(); renderComposer(); } });
$('view').onclick = () => { v = v === 'home' ? 'chat' : 'home'; render(); };
$('theme').onclick = () => { const r = document.documentElement; r.dataset.theme = r.dataset.theme === 'dark' ? 'light' : 'dark'; };
const q = new URLSearchParams(location.search);
if (q.get('tema')) document.documentElement.dataset.theme = q.get('tema');
if (q.get('tela') === 'conversa') v = 'chat';

fetch('catalogo-modelos-instantaneo.json').then((r) => r.json()).then((j) => {
  cat = j;
  $('snapDate').textContent = j.geradoEm;
  render(); renderComposer();
  if (q.get('prov')) st.prov = q.get('prov');
  if (q.get('paleta')) openPalette();
  if (q.get('harness')) { st.harness = q.get('harness'); renderComposer(); $('hmenu').hidden = false; renderHarnessMenu(); }
});
