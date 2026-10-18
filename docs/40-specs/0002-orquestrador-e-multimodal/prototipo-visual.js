// Protótipo interativo da SPEC 0002 (M1). Sem ligação com o núcleo: o catálogo de modelos é o instantâneo medido
// ao vivo (catalogo-modelos-instantaneo.json); harnesses, os modelos deles e a conversa são de exemplo.
// Duas camadas, duas escolhas (Pai): HARNESS (quem executa) e MODELO (provedor/roteador → lab → modelo).
'use strict';
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
// Ícones servidos localmente (baixados do registro oficial do ACP): a página não depende de site de fora.
const CDN = 'icones/harness/';
const MOBILE = () => innerWidth <= 720;

// ---------- camada 1: harness ----------
const harnesses = [
  { id: 'buddy', name: 'Buddy', desc: 'Orquestrador: usa os seus provedores e delega aos outros', icon: null, state: 'pronto' },
  { id: 'claude', name: 'Claude Code', desc: 'Anthropic · login próprio', icon: 'claude-acp.svg', state: 'pronto', models: [['Claude Opus 5.5', 'o mais capaz'], ['Claude Sonnet 5.5', 'equilíbrio'], ['Claude Haiku 5.5', 'rápido']] },
  { id: 'codex', name: 'Codex', desc: 'OpenAI · entra com o ChatGPT', icon: 'codex-acp.svg', state: 'pronto', models: [['gpt-6.1-sol', 'padrão'], ['gpt-6-sol', ''], ['gpt-6-luna', 'rápido']] },
  { id: 'opencode', name: 'OpenCode', desc: 'usa os provedores configurados nele', icon: 'opencode.svg', state: 'pronto', models: [['opencode-go/kimi-k3', ''], ['opencode-go/glm-5.3', ''], ['opencode-go/qwen3.8-max', '']] },
  { id: 'copilot', name: 'Copilot', desc: 'GitHub', icon: 'github-copilot-cli.svg', state: 'precisa de login', models: [] },
  { id: 'pi', name: 'Pi', desc: 'harness mínimo, multiprovedor', icon: 'pi-acp.svg', state: 'pronto', models: [['(o Pi informa ao abrir a sessão)', '']] },
  { id: 'hermes', name: 'Hermes', desc: 'fora do registro oficial do ACP', icon: '', state: 'pronto', models: [['(o Hermes informa ao abrir a sessão)', '']] },
  { id: 'gemini', name: 'Gemini CLI', desc: 'não instalado', icon: 'gemini.svg', state: 'não instalado' },
];
const hIco = (h, s = 18) => h.icon === null ? `<span class="dot" style="width:${s}px;height:${s}px"></span>`
  : h.icon ? `<span class="ico" style="--src:url('${CDN}${h.icon}');width:${s}px;height:${s}px"></span>`
  : `<span class="ico box" style="width:${s}px;height:${s}px"></span>`;
const stateCls = (s) => s === 'pronto' ? 'ok' : s === 'precisa de login' ? 'warn' : '';

// ---------- camada 2: modelo ----------
const svg = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const CAP = {
  vision: ['Visão', svg('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>')],
  reasoning: ['Raciocínio', svg('<path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/>')],
  tools: ['Ferramentas', svg('<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>')],
  video: ['Vídeo', svg('<rect x="2" y="6" width="14" height="12" rx="2"/><path d="m22 8-6 4 6 4z"/>')],
  open: ['Pesos abertos', svg('<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/>')],
};
const CAP_ORDER = ['vision', 'reasoning', 'tools', 'video', 'open'];
const capsHtml = (m) => `<span class="caps">${CAP_ORDER.filter((c) => m[c]).map((c) => `<span class="cap ${c}" title="${CAP[c][0]}${c === 'reasoning' && Array.isArray(m.reasoning) ? ': ' + m.reasoning.join(', ') : ''}">${CAP[c][1]}</span>`).join('')}</span>`;
const FILTERS = [...CAP_ORDER.map((c) => [c, CAP[c][0], `<span class="cap ${c}">${CAP[c][1]}</span>`]), ['free', 'Grátis', '<span class="cap open">$</span>'], ['big', 'Contexto de 1M+', '<span class="cap video">⇔</span>']];
const passes = (m) => [...st.filters].every((f) => f === 'free' ? m.free : f === 'big' ? (m.ctx ?? 0) >= 1e6 : Boolean(m[f]));
const ctxText = (n) => !n ? '' : n >= 1e6 ? `${+(n / 1e6).toFixed(1)}M` : `${Math.round(n / 1000)}k`;
// Assinatura já está dita na aba do provedor: o selo na linha só repetia e cortava o nome (achado no ensaio).
const priceHtml = (p, m) => p.kind === 'assinatura' ? ''
  : m.free ? '<span class="sub" title="Gratuito">grátis</span>'
  : m.tier ? `<span class="price" title="Preço por token (API paga, teto US$ 20)">${'$'.repeat(m.tier)}<i>${'$'.repeat(3 - m.tier)}</i></span>` : '';
const SHORT = { chatgpt: 'ChatGPT', 'opencode-go': 'OpenCode Go', 'ollama-cloud': 'Ollama', openrouter: 'OpenRouter' };

let cat = null;
const st = { harness: 'buddy', prov: 'ollama-cloud', model: 'kimi-k3', hmodel: {}, effort: 'medium', filters: new Set(), lab: '*', fav: new Set(['ollama-cloud|kimi-k3', 'chatgpt|gpt-6.1-sol']), recent: [], act: 0, attachments: [] };
const EFFORT = { default: ['Padrão', 'o provedor decide'], low: ['Baixo', 'mais rápido'], medium: ['Médio', 'equilíbrio'], high: ['Alto', 'mais cuidadoso, mais lento'], xhigh: ['Muito alto', ''], max: ['Máximo', ''], ultra: ['Ultra', 'o mais lento'] };
const H = () => harnesses.find((h) => h.id === st.harness);
const P = (id = st.prov) => cat.providers.find((p) => p.id === id);
const M = () => P().models.find((m) => m.id === st.model) ?? P().models[0];
const effortsOf = (m) => ['default', ...(Array.isArray(m.reasoning) ? m.reasoning : m.reasoning ? ['low', 'medium', 'high'] : [])];
const labIco = (lab) => { const l = cat.labs[lab]; return l && lab !== 'outros' ? `<span class="lab" style="--src:url('${l.logo}')"></span>` : `<span class="labfb">${esc((l?.name ?? lab).slice(0, 2).toUpperCase())}</span>`; };
const toast = (t) => { const e = document.createElement('div'); e.className = 'toast'; e.textContent = t; document.body.append(e); setTimeout(() => e.remove(), 2200); };

// ---------- popovers: um aberto por vez, ancorado no botão ----------
let openPop = null;
function place(pop, anchor) {
  const r = anchor.getBoundingClientRect();
  pop.style.bottom = `${innerHeight - r.top + 8}px`;
  pop.style.maxHeight = `${Math.min(MOBILE() ? innerHeight * .72 : 560, r.top - 16)}px`;
  if (!MOBILE()) pop.style.left = `${Math.max(8, Math.min(r.left, innerWidth - pop.offsetWidth - 8))}px`;
  $('scrim').hidden = !MOBILE();
}
function show(pop, anchor, render) {
  if (openPop && openPop.pop === pop) { close(); return; }
  close();
  pop.hidden = false; anchor.setAttribute('aria-expanded', 'true');
  openPop = { pop, anchor };
  render(); place(pop, anchor);
}
function close() {
  if (!openPop) return;
  openPop.pop.hidden = true; openPop.anchor.setAttribute('aria-expanded', 'false');
  $('fMenu').hidden = true; $('fBtn').setAttribute('aria-expanded', 'false');
  $('scrim').hidden = true;
  openPop = null;
}
const closeFilter = () => { $('fMenu').hidden = true; $('fBtn').setAttribute('aria-expanded', 'false'); };
document.addEventListener('mousedown', (e) => {
  // O menu de filtro fecha ao clicar fora dele (achado no ensaio: ficava aberto cobrindo a lista).
  if (!$('fMenu').hidden && !$('fMenu').contains(e.target) && !$('fBtn').contains(e.target)) closeFilter();
  if (openPop && !openPop.pop.contains(e.target) && !openPop.anchor.contains(e.target)) close();
});
addEventListener('resize', () => { if (openPop) place(openPop.pop, openPop.anchor); });
document.querySelectorAll('.sclose').forEach((b) => { b.onclick = () => close(); });
// Gaveta do celular: conversas e harnesses (antes o ☰ não fazia nada).
const drawer = (open) => { document.querySelector('aside').classList.toggle('open', open); $('menuBtn').setAttribute('aria-expanded', String(open)); $('scrim').hidden = !open; };
$('menuBtn').onclick = () => { close(); drawer(true); };
$('scrim').onclick = () => { close(); drawer(false); };
document.querySelector('aside').addEventListener('click', (e) => { if (MOBILE() && e.target.closest('.thread, .agent, .new')) drawer(false); });

// ---------- harness ----------
function renderHarness() {
  $('hList').innerHTML = harnesses.map((h) => `<button class="mrow ${st.harness === h.id ? 'sel' : ''}" role="option" data-h="${h.id}" aria-selected="${st.harness === h.id}" aria-disabled="${h.state === 'não instalado'}">
    ${hIco(h, 22)}<span class="tx"><b>${esc(h.name)}</b><small>${esc(h.desc)}</small></span><span class="state ${stateCls(h.state)}">${esc(h.state)}</span></button>`).join('');
}
$('hBtn').onclick = () => show($('hPop'), $('hBtn'), renderHarness);
$('hList').onclick = (e) => {
  const b = e.target.closest('[data-h]'); if (!b) return;
  if (b.getAttribute('aria-disabled') === 'true') { toast('Gemini CLI não está instalado: a console mostra como instalar'); return; }
  setHarness(b.dataset.h); close();
};
function setHarness(id) { st.harness = id; st.act = 0; renderComposer(); render(); }

// ---------- modelo ----------
function rowsNow() {
  const q = $('mSearch').value.trim().toLowerCase();
  if (st.harness !== 'buddy') return (H().models ?? []).filter(([n]) => !q || n.toLowerCase().includes(q));
  const p = P();
  return p.models.filter((m) => passes(m) && (!q || `${m.name} ${m.id} ${cat.labs[m.lab]?.name ?? ''}`.toLowerCase().includes(q))
    && (st.lab === '*' || (st.lab === '★' ? st.fav.has(`${p.id}|${m.id}`) || st.recent.includes(`${p.id}|${m.id}`) : m.lab === st.lab)));
}
function renderModel() {
  const buddy = st.harness === 'buddy';
  $('seg').hidden = !buddy; $('rail').hidden = !buddy; $('fBtn').hidden = !buddy;
  if (buddy) {
    $('seg').innerHTML = cat.providers.map((p) => `<button role="tab" data-p="${p.id}" aria-selected="${st.prov === p.id}"><b>${SHORT[p.id].replace('OpenCode ', '<span class="lg">OpenCode </span>')}</b><small>${p.models.filter(passes).length} · ${p.kind === 'assinatura' ? 'assinatura' : 'roteador'}</small></button>`).join('');
    const p = P();
    const labs = {}; for (const m of p.models) if (passes(m)) labs[m.lab] = (labs[m.lab] ?? 0) + 1;
    const labIds = Object.keys(labs).sort((a, b) => labs[b] - labs[a]);
    $('rail').innerHTML = `<button data-l="*" aria-selected="${st.lab === '*'}" title="Todos os labs">▦</button><button data-l="★" aria-selected="${st.lab === '★'}" title="Favoritos e recentes">★</button><hr>`
      + labIds.map((l) => `<button data-l="${l}" aria-selected="${st.lab === l}" title="${esc(cat.labs[l]?.name ?? l)} · ${labs[l]}">${labIco(l)}</button>`).join('');
    $('fMenu').innerHTML = FILTERS.map(([k, t, i]) => `<button data-f="${k}">${i}${t}${st.filters.has(k) ? '<span class="ck">✓</span>' : ''}</button>`).join('');
    $('fBtn').classList.toggle('on', st.filters.size > 0);
    $('actf').innerHTML = [...st.filters].map((f) => `<button data-x="${f}" title="Tirar o filtro">${FILTERS.find((x) => x[0] === f)[1]} ✕</button>`).join('');
    $('mSrc').title = `Capacidades segundo: ${cat.fontes[p.id]} · medido em ${cat.geradoEm}`;
  } else { $('actf').innerHTML = ''; $('mSrc').title = 'Modelos e capacidades informados pelo harness no ACP (session/new)'; }

  const rows = rowsNow();
  st.act = Math.min(st.act, Math.max(0, rows.length - 1));
  let html = '';
  if (!buddy) {
    html = `<div class="gh">${hIco(H(), 14)} Modelos do ${esc(H().name)}</div>` + (rows.length ? rows.map(([n, d], i) => `<button class="row ${i === st.act ? 'act' : ''} ${st.hmodel[st.harness] === n ? 'sel' : ''}" data-i="${i}" role="option">
      <span class="t1">${hIco(H(), 16)}<span class="nm">${esc(n)}</span></span><span class="rt"></span><span class="t2">${esc(d || 'informado pelo harness')}</span></button>`).join('')
      : `<div class="empty">${H().state === 'precisa de login' ? `Entre no ${esc(H().name)} para ver os modelos.` : 'Nenhum modelo.'}</div>`);
  } else {
    const p = P();
    const groups = [];
    if (st.lab === '*' && !$('mSearch').value) {
      const favs = rows.filter((m) => st.fav.has(`${p.id}|${m.id}`));
      if (favs.length) groups.push(['★', 'Favoritos', favs]);
    }
    const by = {}; for (const m of rows) (by[m.lab] ??= []).push(m);
    for (const l of Object.keys(by).sort((a, b) => by[b].length - by[a].length)) groups.push([l, cat.labs[l]?.name ?? l, by[l]]);
    const flat = [];
    for (const [l, title, ms] of groups) {
      html += `<div class="gh">${l === '★' ? '★' : labIco(l)} ${esc(title)}</div>`;
      for (const m of ms) {
        const i = flat.length; flat.push(m);
        const key = `${p.id}|${m.id}`;
        html += `<button class="row ${i === st.act ? 'act' : ''} ${st.model === m.id && st.prov === p.id ? 'sel' : ''}" data-i="${i}" role="option" title="${esc(m.id)}">
          <span class="t1">${labIco(m.lab)}<span class="nm">${esc(m.name)}</span>${priceHtml(p, m)}<span class="star ${st.fav.has(key) ? 'on' : ''}" data-fav="${esc(key)}" title="${st.fav.has(key) ? 'Tirar dos favoritos' : 'Favoritar'}">★</span></span>
          <span class="rt">${capsHtml(m)}<span class="ctx">${ctxText(m.ctx)}</span></span>
          <span class="t2">${esc(m.desc || m.id)}</span></button>`;
      }
    }
    st.flat = flat;
  }
  $('mList').innerHTML = html && (buddy ? st.flat.length : true) ? html : '<div class="empty">Nenhum modelo com esses filtros.<br>Tire um filtro ou troque de provedor.</div>';
  $('mList').querySelector('.row.act')?.scrollIntoView({ block: 'nearest' });
}
function openModel() { $('mSearch').value = ''; st.act = 0; show($('mPop'), $('mBtn'), renderModel); if (!$('mPop').hidden && !MOBILE()) $('mSearch').focus(); }
function choose(i) {
  if (st.harness !== 'buddy') { const r = rowsNow()[i]; if (r) st.hmodel[st.harness] = r[0]; }
  else { const m = (st.flat ?? [])[i]; if (!m) return; st.model = m.id; const k = `${st.prov}|${m.id}`; st.recent = [k, ...st.recent.filter((x) => x !== k)].slice(0, 6); }
  close(); renderComposer();
}
$('mBtn').onclick = openModel;
$('seg').onclick = (e) => { const b = e.target.closest('[data-p]'); if (!b) return; closeFilter(); st.prov = b.dataset.p; st.lab = '*'; st.act = 0; renderModel(); };
$('rail').onclick = (e) => { const b = e.target.closest('[data-l]'); if (!b) return; st.lab = b.dataset.l; st.act = 0; renderModel(); $('mList').scrollTop = 0; };
$('mSearch').oninput = () => { st.act = 0; renderModel(); };
$('fBtn').onclick = (e) => { e.stopPropagation(); $('fMenu').hidden = !$('fMenu').hidden; $('fBtn').setAttribute('aria-expanded', String(!$('fMenu').hidden)); };
$('fMenu').onclick = (e) => { const b = e.target.closest('[data-f]'); if (!b) return; const f = b.dataset.f; st.filters.has(f) ? st.filters.delete(f) : st.filters.add(f); st.act = 0; renderModel(); $('fMenu').hidden = false; };
$('actf').onclick = (e) => { const b = e.target.closest('[data-x]'); if (!b) return; st.filters.delete(b.dataset.x); renderModel(); };
$('mList').onclick = (e) => {
  const s = e.target.closest('[data-fav]');
  if (s) { e.stopPropagation(); const k = s.dataset.fav; st.fav.has(k) ? st.fav.delete(k) : st.fav.add(k); renderModel(); return; }
  const b = e.target.closest('[data-i]'); if (b) choose(Number(b.dataset.i));
};

// ---------- esforço e [+] ----------
function renderEffort() {
  const ef = effortsOf(M());
  $('eList').innerHTML = ef.map((k) => `<button class="mrow ${st.effort === k ? 'sel' : ''}" data-e="${k}"><span class="cap reasoning">${CAP.reasoning[1]}</span><span class="tx"><b>${EFFORT[k][0]}</b>${EFFORT[k][1] ? `<small>${EFFORT[k][1]}</small>` : ''}</span></button>`).join('');
}
$('eBtn').onclick = () => show($('ePop'), $('eBtn'), renderEffort);
$('eList').onclick = (e) => { const b = e.target.closest('[data-e]'); if (!b) return; st.effort = b.dataset.e; close(); renderComposer(); };
function renderPlus() {
  const buddy = st.harness === 'buddy';
  const vis = !buddy || M().vision;
  $('plusList').innerHTML = `<button class="mrow" data-a="file"><span style="font-size:18px">📄</span><span class="tx"><b>Anexar arquivo</b><small>texto, código, markdown</small></span></button>
    <button class="mrow" data-a="img" aria-disabled="${!vis}"><span style="font-size:18px">🖼</span><span class="tx"><b>Anexar imagem</b><small>${vis ? 'PNG, JPEG, WebP' : 'este modelo não enxerga imagem'}</small></span></button>
    ${buddy && effortsOf(M()).length > 1 ? `<button class="mrow" data-a="effort"><span class="cap reasoning">${CAP.reasoning[1]}</span><span class="tx"><b>Esforço: ${EFFORT[st.effort][0]}</b><small>toque para trocar</small></span></button>` : ''}`;
}
$('plusBtn').onclick = () => show($('plusPop'), $('plusBtn'), renderPlus);
$('plusList').onclick = (e) => {
  const b = e.target.closest('[data-a]'); if (!b || b.getAttribute('aria-disabled') === 'true') return;
  if (b.dataset.a === 'effort') { close(); show($('ePop'), $('plusBtn'), renderEffort); return; }
  attach(b.dataset.a === 'img' ? 'img' : 'txt'); close();
};
function attach(kind) { st.attachments.push({ kind, name: kind === 'img' ? 'print.png' : 'notas.md' }); renderComposer(); }
$('aBtn').onclick = () => attach(st.harness !== 'buddy' || M().vision ? 'img' : 'txt');

// ---------- teclado ----------
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openModel(); return; }
  if (!openPop) return;
  if (e.key === 'Escape') { e.preventDefault(); const a = openPop.anchor; close(); a.focus(); return; }
  if (openPop.pop !== $('mPop')) return;
  const n = st.harness === 'buddy' ? (st.flat ?? []).length : rowsNow().length;
  if (e.key === 'ArrowDown') { e.preventDefault(); st.act = Math.min(n - 1, st.act + 1); renderModel(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); st.act = Math.max(0, st.act - 1); renderModel(); }
  else if (e.key === 'Enter') { e.preventDefault(); choose(st.act); }
});

// ---------- caixa de mensagem ----------
function renderComposer() {
  const h = H();
  $('hBtn').innerHTML = `${hIco(h, 18)}<span class="nm">${esc(h.name)}</span><span class="chev">▾</span>`;
  if (st.harness === 'buddy') {
    const p = P(); const m = M(); st.model = m.id;
    $('mBtn').innerHTML = `${labIco(m.lab)}<span class="nm">${esc(m.name)}</span>${capsHtml(m)}<span class="chev">▾</span>`;
    $('mBtn').title = `${m.name} · ${p.name} — clique para trocar (Ctrl+K)`;
    const ef = effortsOf(m); if (!ef.includes(st.effort)) st.effort = ef.includes('medium') ? 'medium' : 'default';
    $('eBtn').hidden = ef.length === 1;
    $('eBtn').innerHTML = `<span class="cap reasoning">${CAP.reasoning[1]}</span>${EFFORT[st.effort][0]}<span class="chev">▾</span>`;
    $('task').placeholder = `Escreva para o Buddy (${m.name} · ${SHORT[p.id]})…`;
    // Celular: as capacidades ganham linha própria sob a caixa (na pílula, espremiam o nome).
    $('capsRow').innerHTML = CAP_ORDER.filter((c) => m[c]).map((c) => `<span><span class="cap ${c}">${CAP[c][1]}</span>${CAP[c][0]}</span>`).join('') + (m.ctx ? `<span>${ctxText(m.ctx)} de contexto</span>` : '');
  } else {
    const hm = st.hmodel[st.harness] ?? (h.models?.[0]?.[0] ?? 'modelo do harness');
    $('mBtn').innerHTML = `${hIco(h, 16)}<span class="nm">${esc(hm)}</span><span class="chev">▾</span>`;
    $('mBtn').title = `Modelos do ${h.name}`;
    $('eBtn').hidden = true;
    $('task').placeholder = `Escreva para o ${h.name}…`;
    $('capsRow').innerHTML = '';
  }
  $('chips').innerHTML = st.attachments.map((x, i) => `<span class="chip">${x.kind === 'img' ? '🖼' : '📄'} ${x.name} <button class="star" data-rm="${i}" title="Remover">✕</button></span>`).join('');
}
$('chips').onclick = (e) => { const b = e.target.closest('[data-rm]'); if (b) { st.attachments.splice(Number(b.dataset.rm), 1); renderComposer(); } };
$('send').onclick = () => {
  const text = $('task').value.trim();
  if (!text) { $('task').focus(); toast('Escreva uma mensagem'); return; }
  v = 'chat';
  const h = H();
  const who = st.harness === 'buddy' ? `${esc(M().name)} · ${SHORT[st.prov]} · ${EFFORT[st.effort][0]}` : `${esc(h.name)} · ${esc(st.hmodel[st.harness] ?? h.models?.[0]?.[0] ?? '')}`;
  extra += `<div class="you">${esc(text)}${st.attachments.length ? ` <span class="meta-line">${st.attachments.map((a) => (a.kind === 'img' ? '🖼 ' : '📄 ') + a.name).join(' · ')}</span>` : ''}</div>
    <div class="meta-line">${hIco(h, 16)} ${who}</div><div class="live"><span class="spin"></span>Pensando · 0 s · (protótipo: nada é enviado)</div>`;
  $('task').value = ''; st.attachments = []; render(); renderComposer();
  const sc = document.querySelector('.scroll'); sc.scrollTop = sc.scrollHeight;
};
$('task').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('send').click(); } });

// ---------- barra lateral e conversa de exemplo ----------
$('agents').innerHTML = harnesses.filter((h) => h.id !== 'buddy').map((h) => `<button class="agent ${h.state === 'não instalado' ? 'off' : ''}" data-agent="${h.id}" title="${esc(h.desc)} · ${esc(h.state)}">${hIco(h)}${esc(h.name)}<span class="st ${h.state === 'pronto' ? '' : h.state === 'precisa de login' ? 'warn' : 'off'}"></span></button>`).join('');
const home = () => `<h1>Como posso ajudar, Pai?</h1>
  <div class="starters">${harnesses.filter((h) => h.state !== 'não instalado').map((h) => `<button class="starter ${st.harness === h.id ? 'on' : ''}" data-agent="${h.id}">${hIco(h)}${esc(h.name)}</button>`).join('')}</div>
  <button class="sugg">Revise este repositório e proponha melhorias</button>
  <button class="sugg">O que há nesta imagem? (anexe um print)</button>
  <button class="sugg">Peça ao Codex para escrever os testes, e ao Claude Code para revisar</button>
  <button class="sugg">Resuma o que mudou hoje nos meus projetos</button>`;
const chat = () => `<div class="you">Revise o README e corrija o que estiver desatualizado. Use o Codex.</div>
  <div class="meta-line">${hIco(harnesses[0], 16)} Buddy delegou a ${hIco(harnesses[2], 16)} Codex · gpt-6.1-sol</div>
  <div class="perm">${hIco(harnesses[2])}<span>Codex quer editar <code>README.md</code> (+12 −9)</span><span class="sp"></span><button class="btn" onclick="toast('Negado (exemplo)')">Negar</button><button class="btn pri" onclick="toast('Aprovado (exemplo)')">Aprovar</button></div>
  <p>Encontrei três trechos desatualizados: o estado do M0, a ordem dos marcos e o atalho da console. A edição aguarda sua aprovação acima.</p>${extra}`;
let v = 'home';
let extra = '';
function render() {
  $('content').innerHTML = v === 'home' ? home() : chat();
  document.querySelectorAll('.sugg').forEach((s) => { s.onclick = () => { $('task').value = s.textContent; $('task').focus(); }; });
}
document.addEventListener('click', (e) => { const a = e.target.closest('.starter[data-agent], .agent[data-agent]'); if (!a) return; const h = harnesses.find((x) => x.id === a.dataset.agent); if (h.state === 'não instalado') { toast(`${h.name} não está instalado`); return; } setHarness(h.id); });
$('view').onclick = () => { v = v === 'home' ? 'chat' : 'home'; render(); };
const toggleTheme = () => { const r = document.documentElement; r.dataset.theme = r.dataset.theme === 'dark' ? 'light' : 'dark'; };
$('theme').onclick = toggleTheme; $('themeM').onclick = toggleTheme;
$('newChat').onclick = () => { v = 'home'; extra = ''; render(); $('task').focus(); };
const q = new URLSearchParams(location.search);
if (q.get('tema')) document.documentElement.dataset.theme = q.get('tema');
if (q.get('tela') === 'conversa') v = 'chat';

fetch('catalogo-modelos-instantaneo.json').then((r) => r.json()).then((j) => {
  cat = j;
  $('snapDate').textContent = j.geradoEm;
  render(); renderComposer();
  if (q.get('prov')) st.prov = q.get('prov');
  if (q.get('harness')) setHarness(q.get('harness'));
  if (q.get('abrir') === 'modelo') openModel();
  if (q.get('abrir') === 'harness') $('hBtn').click();
});
