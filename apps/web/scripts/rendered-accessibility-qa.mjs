import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';

const BASE_URL = process.env.QA_BASE_URL || 'http://127.0.0.1:3100';
const OUT_DIR = process.env.QA_OUT_DIR || 'apps/web/.qa-rendered';
const ROUTES = ['/', '/dashboard', '/journal', '/quartier', '/world', '/breiz', '/profil', '/contact'];
const VIEWPORT = { width: 1440, height: 1200, deviceScaleFactor: 1, mobile: false };

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

async function findChrome() {
  const candidates = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'];
  for (const command of candidates) {
    const ok = await new Promise((resolve) => {
      const child = spawn(command, ['--version'], { stdio: 'ignore' });
      child.on('error', () => resolve(false));
      child.on('exit', (code) => resolve(code === 0));
    });
    if (ok) return command;
  }
  throw new Error('No Chrome/Chromium binary found on PATH');
}

class Cdp {
  constructor(wsUrl) {
    this.nextId = 1;
    this.pending = new Map();
    this.events = new Map();
    this.ws = new WebSocket(wsUrl);
  }
  async open() {
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true });
      this.ws.addEventListener('error', reject, { once: true });
    });
    this.ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id) {
        const pending = this.pending.get(msg.id);
        if (!pending) return;
        this.pending.delete(msg.id);
        if (msg.error) pending.reject(new Error(`${msg.error.code}: ${msg.error.message}`));
        else pending.resolve(msg.result);
        return;
      }
      if (msg.method) {
        const handlers = this.events.get(msg.method) || [];
        for (const handler of handlers) handler(msg.params);
      }
    });
  }
  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  once(method, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      const handler = (params) => {
        cleanup();
        resolve(params);
      };
      const cleanup = () => {
        clearTimeout(timer);
        const list = this.events.get(method) || [];
        this.events.set(method, list.filter((h) => h !== handler));
      };
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error(`Timed out waiting for ${method}`));
      }, timeoutMs);
      this.events.set(method, [...(this.events.get(method) || []), handler]);
    });
  }
  close() { this.ws.close(); }
}

async function evaluate(cdp, expression, awaitPromise = true) {
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise,
    returnByValue: true,
    userGesture: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || 'Runtime.evaluate failed');
  }
  return result.result?.value;
}

async function waitReady(cdp) {
  for (let i = 0; i < 80; i += 1) {
    const state = await evaluate(cdp, 'document.readyState');
    if (state === 'complete') break;
    await sleep(100);
  }
  await sleep(350);
}

async function navigate(cdp, route) {
  const loaded = cdp.once('Page.loadEventFired', 20000).catch(() => null);
  await cdp.send('Page.navigate', { url: `${BASE_URL}${route}` });
  await loaded;
  await waitReady(cdp);
  await evaluate(cdp, `
    (async () => {
      const style = document.createElement('style');
      style.id = 'qa-motion-freeze';
      style.textContent = '*{animation:none!important;transition:none!important;caret-color:transparent!important}';
      document.head.appendChild(style);
      const max = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
      for (let y = 0; y < max; y += 700) {
        window.scrollTo(0, y);
        await new Promise(r => setTimeout(r, 35));
      }
      window.scrollTo(0, 0);
      await new Promise(r => setTimeout(r, 80));
      return true;
    })()
  `);
}

async function collectRouteFacts(cdp, route) {
  return evaluate(cdp, `(() => {
    const visible = (el) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const clippedSrOnly =
        cs.position === 'absolute' &&
        cs.overflow === 'hidden' &&
        r.width <= 1.5 &&
        r.height <= 1.5 &&
        (cs.clip !== 'auto' || cs.clipPath !== 'none');
      return !clippedSrOnly &&
        cs.display !== 'none' &&
        cs.visibility !== 'hidden' &&
        Number(cs.opacity) > 0 &&
        r.width > 0.5 &&
        r.height > 0.5;
    };
    const directText = (el) => Array.from(el.childNodes).some((n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
    const pointsFor = (r) => [
      [r.left + r.width * .5, r.top + r.height * .5],
      [r.left + r.width * .2, r.top + r.height * .2],
      [r.left + r.width * .8, r.top + r.height * .2],
      [r.left + r.width * .2, r.top + r.height * .8],
      [r.left + r.width * .8, r.top + r.height * .8],
    ].filter(([x,y]) => x >= 0 && y >= 0 && x < innerWidth && y < innerHeight);
    const bgImage = (el) => {
      const cs = getComputedStyle(el);
      const before = getComputedStyle(el, '::before');
      const after = getComputedStyle(el, '::after');
      return [cs.backgroundImage, before.backgroundImage, after.backgroundImage].filter(v => v && v !== 'none');
    };
    const reasonsFor = (el) => {
      const reasons = new Set();
      for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
        for (const bg of bgImage(n)) reasons.add(bg.startsWith('linear-gradient') || bg.startsWith('radial-gradient') ? 'gradient' : 'background-image');
      }
      const r = el.getBoundingClientRect();
      for (const [x,y] of pointsFor(r)) {
        for (const layer of document.elementsFromPoint(x, y)) {
          if (layer.tagName === 'IMG' || layer.tagName === 'PICTURE' || layer.tagName === 'CANVAS' || layer.tagName === 'VIDEO') reasons.add(layer.tagName.toLowerCase());
          for (const bg of bgImage(layer)) reasons.add(bg.startsWith('linear-gradient') || bg.startsWith('radial-gradient') ? 'gradient' : 'background-image');
        }
      }
      return [...reasons];
    };
    let idx = 0;
    const texts = [];
    for (const el of document.querySelectorAll('body *')) {
      if (!directText(el) || !visible(el)) continue;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const reasons = reasonsFor(el);
      if (!reasons.length) continue;
      const qaId = 'qa-text-' + (++idx);
      el.setAttribute('data-qa-text-id', qaId);
      let opacity = 1;
      for (let n = el; n; n = n.parentElement) opacity *= Number(getComputedStyle(n).opacity || 1);
      texts.push({
        qaId,
        text: Array.from(el.childNodes).filter(n => n.nodeType === Node.TEXT_NODE).map(n => n.textContent).join(' ').replace(/\\s+/g,' ').trim().slice(0,180),
        tag: el.tagName.toLowerCase(),
        color: cs.color,
        fontSize: Number.parseFloat(cs.fontSize),
        fontWeight: Number.parseInt(cs.fontWeight, 10) || 400,
        opacity,
        textShadow: cs.textShadow,
        reasons,
        rect: { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height },
      });
    }
    const interactives = [...document.querySelectorAll('a[href],button,input,select,textarea,[role="button"],[tabindex]')]
      .filter(visible)
      .map((el) => {
        const raw = el.getBoundingClientRect();
        const wrappingLabel = el.matches('input,select,textarea') ? el.closest('label') : null;
        const effective = wrappingLabel && visible(wrappingLabel)
          ? wrappingLabel.getBoundingClientRect()
          : raw;
        return {
          tag: el.tagName.toLowerCase(),
          label: el.getAttribute('aria-label') || wrappingLabel?.textContent.trim().replace(/\\s+/g,' ').slice(0,100) || el.textContent.trim().replace(/\\s+/g,' ').slice(0,100),
          width: effective.width,
          height: effective.height,
          rawWidth: raw.width,
          rawHeight: raw.height,
          targetSource: wrappingLabel ? 'wrapping-label' : 'element',
          role: el.getAttribute('role'),
          position: getComputedStyle(el).position,
        };
      });
    return {
      route: ${JSON.stringify(route)},
      title: document.title,
      complexTexts: texts,
      interactives,
    };
  })()`);
}

async function screenshotClip(cdp, rect) {
  const x = Math.max(0, Math.floor(rect.x));
  const y = Math.max(0, Math.floor(rect.y));
  const width = Math.max(1, Math.min(900, Math.ceil(rect.width)));
  const height = Math.max(1, Math.min(500, Math.ceil(rect.height)));
  return cdp.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: true,
    clip: { x, y, width, height, scale: 1 },
  });
}

async function analyzeImages(cdp, originalB64, backgroundB64, fgCss, effectiveOpacity) {
  const payload = JSON.stringify({ originalB64, backgroundB64, fgCss, effectiveOpacity });
  return evaluate(cdp, `(async () => {
    const p = ${payload};
    const load = (b64) => new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = 'data:image/png;base64,' + b64;
    });
    const parse = (css) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      const ctx = canvas.getContext('2d', { willReadFrequently:true });
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = css;
      ctx.fillRect(0, 0, 1, 1);
      const px = ctx.getImageData(0, 0, 1, 1).data;
      return { r: px[0], g: px[1], b: px[2], a: px[3] / 255 };
    };
    const srgb = (v) => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; };
    const lum = (r,g,b) => .2126*srgb(r) + .7152*srgb(g) + .0722*srgb(b);
    const ratio = (a,b) => (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
    const [orig,bg] = await Promise.all([load(p.originalB64), load(p.backgroundB64)]);
    const w = Math.min(orig.width, bg.width), h = Math.min(orig.height, bg.height);
    const c1 = document.createElement('canvas'), c2 = document.createElement('canvas');
    c1.width = c2.width = w; c1.height = c2.height = h;
    const x1 = c1.getContext('2d', { willReadFrequently:true }), x2 = c2.getContext('2d', { willReadFrequently:true });
    x1.drawImage(orig, 0, 0, w, h); x2.drawImage(bg, 0, 0, w, h);
    const a = x1.getImageData(0,0,w,h).data, b = x2.getImageData(0,0,w,h).data;
    const fg = parse(p.fgCss);
    const alpha = Math.max(0, Math.min(1, fg.a * p.effectiveOpacity));
    const ratios = [];
    for (let i=0; i<a.length; i+=4) {
      const delta = Math.abs(a[i]-b[i]) + Math.abs(a[i+1]-b[i+1]) + Math.abs(a[i+2]-b[i+2]);
      if (delta < 18 || b[i+3] < 230) continue;
      const br=b[i], bgc=b[i+1], bb=b[i+2];
      const fr=fg.r*alpha + br*(1-alpha), fgc=fg.g*alpha + bgc*(1-alpha), fb=fg.b*alpha + bb*(1-alpha);
      ratios.push(ratio(lum(fr,fgc,fb), lum(br,bgc,bb)));
    }
    ratios.sort((x,y)=>x-y);
    const q = (f) => ratios.length ? ratios[Math.min(ratios.length-1, Math.floor((ratios.length-1)*f))] : null;
    return { width:w, height:h, glyphPixels:ratios.length, min:q(0), p05:q(.05), median:q(.5), p95:q(.95) };
  })()`);
}

async function measureComplexText(cdp, item) {
  await evaluate(cdp, `(() => {
    const el = document.querySelector('[data-qa-text-id="${item.qaId}"]');
    if (!el) return false;
    el.scrollIntoView({block:'center',inline:'nearest'});
    return true;
  })()`);
  await sleep(60);
  const fresh = await evaluate(cdp, `(() => {
    const el = document.querySelector('[data-qa-text-id="${item.qaId}"]');
    const r = el?.getBoundingClientRect();
    return r ? {x:r.left+scrollX,y:r.top+scrollY,width:r.width,height:r.height} : null;
  })()`);
  if (!fresh || fresh.width < 1 || fresh.height < 1) return { ...item, status:'unmeasurable', reason:'empty-rect' };
  const original = await screenshotClip(cdp, fresh);
  await evaluate(cdp, `(() => {
    const el = document.querySelector('[data-qa-text-id="${item.qaId}"]');
    if (!el) return false;
    el.dataset.qaOldColor = el.style.getPropertyValue('color');
    el.dataset.qaOldFill = el.style.getPropertyValue('-webkit-text-fill-color');
    el.dataset.qaOldShadow = el.style.getPropertyValue('text-shadow');
    el.style.setProperty('color','transparent','important');
    el.style.setProperty('-webkit-text-fill-color','transparent','important');
    el.style.setProperty('text-shadow','none','important');
    return true;
  })()`);
  await sleep(20);
  const background = await screenshotClip(cdp, fresh);
  await evaluate(cdp, `(() => {
    const el = document.querySelector('[data-qa-text-id="${item.qaId}"]');
    if (!el) return false;
    const restore = (name,key) => {
      const value = el.dataset[key] || '';
      if (value) el.style.setProperty(name,value); else el.style.removeProperty(name);
      delete el.dataset[key];
    };
    restore('color','qaOldColor'); restore('-webkit-text-fill-color','qaOldFill'); restore('text-shadow','qaOldShadow');
    return true;
  })()`);
  const pixels = await analyzeImages(cdp, original.data, background.data, item.color, item.opacity);
  const large = item.fontSize >= 24 || (item.fontSize >= 18.66 && item.fontWeight >= 700);
  const threshold = large ? 3 : 4.5;
  let status = 'review';
  if (pixels.glyphPixels < 8 || pixels.min == null) status = 'unmeasurable';
  else if (pixels.min >= threshold) status = 'pass-estimate';
  else if ((pixels.p05 ?? 0) < threshold) status = 'fail-estimate';
  return { ...item, threshold, pixels, status };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Rendered accessibility QA');
  lines.push('');
  lines.push(`Base URL: \`${report.baseUrl}\``);
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push('');
  lines.push('> Browser evidence, not a claim of full WCAG conformance. Pixel contrast on complex backgrounds is an estimate based on rendered Chrome screenshots with the text temporarily made transparent, then sampled only where glyph pixels changed.');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Distinct route titles: **${report.titles.unique ? 'PASS' : 'FAIL'}** (${report.titles.distinctCount}/${report.routes.length})`);
  lines.push(`- /quartier interactive targets under 24×24 CSS px: **${report.targets.undersized.length}**`);
  lines.push(`- Complex-background text candidates: **${report.complex.total}**`);
  lines.push(`- Pixel estimate: **${report.complex.pass} pass**, **${report.complex.fail} fail**, **${report.complex.review} review/unmeasurable**`);
  lines.push('');
  lines.push('## Titles');
  lines.push('');
  lines.push('| Route | document.title |'); lines.push('|---|---|');
  for (const r of report.routes) lines.push(`| \`${r.route}\` | ${String(r.title).replaceAll('|','\\|')} |`);
  lines.push('');
  lines.push('## /quartier targets below 24×24 CSS px');
  lines.push('');
  if (!report.targets.undersized.length) lines.push('None.');
  else {
    lines.push('| Element | Label | Size |'); lines.push('|---|---|---:|');
    for (const t of report.targets.undersized) lines.push(`| ${t.tag} | ${String(t.label||'').replaceAll('|','\\|')} | ${t.width.toFixed(1)}×${t.height.toFixed(1)} (${t.targetSource}) |`);
  }
  lines.push('');
  lines.push('## Complex-background text');
  lines.push('');
  lines.push('| Route | Status | Ratio min / p05 | Threshold | Text | Background signal |');
  lines.push('|---|---|---:|---:|---|---|');
  for (const x of report.complex.items) {
    const ratio = x.pixels ? `${x.pixels.min?.toFixed(2) ?? '—'} / ${x.pixels.p05?.toFixed(2) ?? '—'}` : '—';
    lines.push(`| \`${x.route}\` | ${x.status} | ${ratio} | ${x.threshold ?? '—'} | ${String(x.text||'').replaceAll('|','\\|')} | ${(x.reasons||[]).join(', ')} |`);
  }
  lines.push('');
  lines.push('## Evidence limits');
  lines.push('');
  lines.push('- The pixel method is intended to resolve the old “image/gradient = indeterminate” bucket, but it remains an automated approximation rather than a human visual review.');
  lines.push('- Dynamic states not reached during the route sweep are outside this run.');
  lines.push('- Target-size reporting is literal rendered CSS geometry; WCAG spacing exceptions are not automatically adjudicated.');
  return lines.join('\n');
}

let chrome;
let chromeStderr = '';
try {
  await mkdir(OUT_DIR, { recursive: true });
  const command = await findChrome();
  const chromeProfileDir = await mkdtemp(`${tmpdir()}/emopet-chrome-qa-`);
  chrome = spawn(command, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    '--remote-debugging-port=9222', '--remote-debugging-address=127.0.0.1', `--user-data-dir=${chromeProfileDir}`, '--no-first-run', '--no-default-browser-check', `--window-size=${VIEWPORT.width},${VIEWPORT.height}`, 'about:blank',
  ], { stdio: ['ignore','pipe','pipe'] });
  chrome.stderr?.on('data', (chunk) => { chromeStderr += chunk.toString(); });

  let target;
  for (let i=0; i<200; i+=1) {
    try {
      const list = await fetch('http://127.0.0.1:9222/json/list').then(r => r.json());
      target = list.find(x => x.type === 'page');
      if (target?.webSocketDebuggerUrl) break;
    } catch {}
    await sleep(100);
  }
  if (!target?.webSocketDebuggerUrl) {
    throw new Error(`Chrome DevTools endpoint did not become ready. Chrome stderr tail: ${chromeStderr.slice(-2000)}`);
  }

  const cdp = new Cdp(target.webSocketDebuggerUrl);
  await cdp.open();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', VIEWPORT);

  const routeFacts = [];
  const complexResults = [];
  for (const route of ROUTES) {
    await navigate(cdp, route);
    const facts = await collectRouteFacts(cdp, route);
    routeFacts.push(facts);
    for (const item of facts.complexTexts) {
      const result = await measureComplexText(cdp, item);
      complexResults.push({ route, ...result });
    }
  }

  const titles = routeFacts.map(r => r.title);
  const uniqueTitles = new Set(titles);
  const quartier = routeFacts.find(r => r.route === '/quartier');
  const undersized = (quartier?.interactives || []).filter(x => x.width < 24 || x.height < 24);
  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    viewport: VIEWPORT,
    routes: routeFacts.map(({complexTexts,interactives,...rest}) => rest),
    titles: { unique: uniqueTitles.size === titles.length, distinctCount: uniqueTitles.size },
    targets: { undersized },
    complex: {
      total: complexResults.length,
      pass: complexResults.filter(x => x.status === 'pass-estimate').length,
      fail: complexResults.filter(x => x.status === 'fail-estimate').length,
      review: complexResults.filter(x => !['pass-estimate','fail-estimate'].includes(x.status)).length,
      items: complexResults,
    },
  };
  await writeFile(`${OUT_DIR}/report.json`, JSON.stringify(report, null, 2));
  await writeFile(`${OUT_DIR}/report.md`, renderMarkdown(report));
  console.log(renderMarkdown(report));
  cdp.close();
} finally {
  if (chrome && !chrome.killed) chrome.kill('SIGTERM');
}
