/* HYGIEIA coaching intake: app (build, 11 Nov 2026).
   Behaviour: build-spec.md sections 3 to 9 and 11 (option B with the Sections sheet and the multi-file strip),
   Alsos v2 structure, gate 1 fixes. Back end: the live Supabase Edge Function `intake` (do not change it here).
   No third-party code. Nothing about the client ever goes in a URL; answers stay on the device until Send. */
(function () {
  'use strict';

  /* ================================================================ CONFIG */
  var CONFIG = {
    FUNCTION_URL: 'https://mftjdzupjdxksupwqtdx.supabase.co/functions/v1/intake',
    FORM_VERSION: '2026-11-12.3',
    SIZE_LIMIT_MB: 15,            // the server's limit (intake bucket and index.ts)
    REQUEST_TIMEOUT_MS: 30000,    // a send that takes longer counts as failed (build-spec 5)
    UNDO_MS: 5000,
    PHOTO_LONG_EDGE: 2000,
    PHOTO_QUALITY: 0.82
  };
  /* ======================================================================== */

  var HY = window.HY;
  var INTAKE = HY.INTAKE, STR = HY.STR;
  var SECTIONS = INTAKE.sections;
  var TOTAL = HY.countItems(INTAKE);
  var LIMIT = CONFIG.SIZE_LIMIT_MB * 1024 * 1024;
  var QMAP = {};
  SECTIONS.forEach(function (s) { s.q.forEach(function (q) { QMAP[q.id] = { q: q, s: s }; }); });
  var SCREENS = [];
  // Screens are packed at run time to fill the real viewport without scrolling (pack(), 12 Nov 2026).
  // A question with an optional upload gets the upload on a screen of its own, shown only when it applies.
  var NS = 0, AVAIL = 0, QIDX = {};
  (function () { var k = 0; SECTIONS.forEach(function (s) { s.q.forEach(function (q) { QIDX[q.id] = k++; }); }); })();
  function scr(n) { return SCREENS[n - 1]; }
  function shown(n) { var x = scr(n); return x.part !== 'upload' || showUpload(x.q[0]); }
  function nextVis(n) { for (var k = n + 1; k <= NS; k++) if (shown(k)) return k; return null; }
  function prevVis(n) { for (var k = n - 1; k >= 1; k--) if (shown(k)) return k; return null; }
  function keyOf(x) { return x.q[0].id + (x.part === 'upload' ? ':U' : ''); }
  function findScreen(key) {
    var up = /:U$/.test(key), id = String(key).replace(/:U$/, '');
    for (var i = 0; i < SCREENS.length; i++) {
      var x = SCREENS[i];
      if ((x.part === 'upload') === up && x.q.some(function (q) { return q.id === id; })) return i + 1;
    }
    return up ? findScreen(id) : 1;
  }
  function partition(hs, hh, avail, gap, flex) {
    var n = hs.length;
    function cost(a, b) { var t = a === 0 ? hh : 0; for (var i = a; i < b; i++) t += hs[i] + (i > a ? gap : 0); return t; }
    var N = 1, a0 = 0, i;
    for (i = 1; i < n; i++) if (cost(a0, i + 1) > avail) { N++; a0 = i; }
    // Same page count, but balanced: minimise the fullest page.
    var best = [], cut = [];
    for (var k = 0; k <= N; k++) { best.push([]); cut.push([]); for (i = 0; i <= n; i++) { best[k].push(Infinity); cut[k].push(0); } }
    best[0][0] = 0;
    for (k = 1; k <= N; k++) for (i = k; i <= n; i++) for (var j = k - 1; j < i; j++) {
      var cc = cost(j, i), lf = avail - cc;
      var stretch = false; for (var z = j; z < i; z++) if (flex[z]) stretch = true;
      // Least squared leftover, so pages come out even; a page with a long-answer box has none (the box stretches).
      var c = best[k - 1][j] + (lf < 0 ? 1e9 + cc : stretch ? 0 : lf * lf);
      if (c < best[k][i]) { best[k][i] = c; cut[k][i] = j; }
    }
    var pages = [], end = n;
    for (k = N; k >= 1; k--) { var st = cut[k][end], pg = []; for (i = st; i < end; i++) pg.push(i); pages.unshift(pg); end = st; }
    return pages;
  }
  function cssNum(name, d) { var v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)); return isNaN(v) ? d : v; }
  function pack() {
    var probe = $('safeProbe'), safe = probe ? Math.max(0, probe.offsetHeight - 16) : 0;
    var gap = cssNum('--qgap-min', 28);
    AVAIL = Math.max(240, window.innerHeight - cssNum('--topfix', 51) - cssNum('--barfix', 85) - safe - cssNum('--padt', 20) - cssNum('--padb', 16));
    document.documentElement.style.setProperty('--avail', AVAIL + 'px');
    var box = document.createElement('div');
    box.className = 'main measure'; box.setAttribute('aria-hidden', 'true');
    box.style.width = els.main.getBoundingClientRect().width + 'px';
    document.body.appendChild(box);
    var out = [];
    renderPart = 'main';
    SECTIONS.forEach(function (s) {
      box.innerHTML = '<div class="view sec">' + headHTML(s) + '<div class="qs">' + s.q.map(renderQ).join('') + '</div></div>';
      var head = box.querySelector('.sechead');
      var hh = head.offsetHeight + parseFloat(getComputedStyle(head).marginBottom || 0);
      var hs = Array.prototype.map.call(box.querySelectorAll('.qs > .block'), function (b) { return b.offsetHeight; });
      s.first = out.length + 1;
      var flex = Array.prototype.map.call(box.querySelectorAll('.qs > .block'), function (b) { return !!b.querySelector(':scope > textarea'); });
      partition(hs, hh, AVAIL, gap, flex).forEach(function (pg) {
        var qs = pg.map(function (i) { return s.q[i]; });
        out.push({ s: s, q: qs, i: pg[0], part: null });
        qs.forEach(function (q) { if (q.upload && q.t !== 'photos') out.push({ s: s, q: [q], i: pg[0], part: 'upload' }); });
      });
      s.last = out.length;
    });
    renderPart = null;
    box.remove();
    SCREENS = out; NS = out.length;
  }
  function headHTML(s) {
    var sp = s.t.lastIndexOf(' ');
    var tt = esc(s.t.slice(0, sp + 1)) + '<span style="white-space:nowrap">' + esc(s.t.slice(sp + 1)) + svg('down', 'dn') + '</span>';
    return '<header class="sechead"><h1 class="lt" id="h-sec" tabindex="-1"><button type="button" class="ltbtn" data-act="sheet" aria-haspopup="dialog">' + tt + '</button></h1>' +
      (s.lead ? '<p class="lead">' + esc(s.lead) + '</p>' : '') + '</header>';
  }
  // Spread what's on the screen over the height it has: long-answer boxes stretch (CSS), short pages open their gaps.
  function fit(v) {
    var qs = v.querySelector('.qs'); if (!qs) return;
    v.classList.remove('sparse'); v.classList.remove('tight'); v.style.removeProperty('--qgap');
    v.classList.add('nat'); var used = v.offsetHeight; v.classList.remove('nat');
    if (used > AVAIL) { v.classList.add('tight'); return; }   // one big question on a small phone: compact it
    var left = AVAIL - used, n = qs.children.length, gap = cssNum('--qgap-min', 28);
    if (left <= 0 || qs.querySelector('textarea')) return;
    // Room to spare: open the follow-up boxes instead of hiding them behind a tap.
    Array.prototype.forEach.call(v.querySelectorAll('.notepill'), function (np) {
      if (left < 110) return;
      np.hidden = true; np.nextElementSibling.hidden = false; left -= 84;
    });
    if (n > 1) v.style.setProperty('--qgap', Math.min(72, gap + left / n) + 'px');
    if (left > AVAIL * 0.42) v.classList.add('sparse');
  }
  var renderPart = null;  // 'main' leaves a split question's upload off; 'upload' renders only the upload
  (function () { var p = HY.selfCheck(); if (p.length) console.error('HYGIEIA intake data check failed: ' + p.join('; ')); })();

  var $ = function (id) { return document.getElementById(id); };
  var els = {
    top: $('top'), topBack: $('topBack'), barTitle: $('barTitle'), step: $('step'), prog: $('prog'), progFill: $('progFill'),
    banners: $('banners'), offlineBanner: $('offlineBanner'), saveBanner: $('saveBanner'),
    main: $('main'), bar: $('bar'), barIn: $('barIn'), toastWrap: $('toastWrap'), live: $('live'), upLive: $('upLive'),
    sheetWrap: $('sheetWrap'), sheet: $('sheet'), scrim: $('scrim'), side: $('side')
  };

  /* ---------------------------------------------------------------- helpers */
  var ICON = {
    back: '<path d="M15 18l-6-6 6-6"/>',
    down: '<path d="M7 10l5 5 5-5"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    close: '<path d="M7 7l10 10M17 7L7 17"/>',
    plus: '<path d="M12 5.5v13M5.5 12h13"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
    alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5v.01"/>',
    offline: '<path d="M2 8.8a15 15 0 0 1 4.2-2.6M9.9 5.2A15 15 0 0 1 22 8.8M5 12.5a10 10 0 0 1 4.3-2.2M14.8 10.4A10 10 0 0 1 19 12.5M8.5 16a5 5 0 0 1 7 0M12 20h.01M3 3l18 18"/>',
    file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>'
  };
  function svg(name, cls) {
    return '<svg class="i' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + ICON[name] + '</svg>';
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmt(s, v) { return s.replace(/\{(\w+)\}/g, function (m, k) { return Object.prototype.hasOwnProperty.call(v, k) ? v[k] : m; }); }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function mq(q) { return window.matchMedia ? window.matchMedia(q).matches : false; }
  function reduced() { return mq('(prefers-reduced-motion: reduce)'); }
  function todayISO() { var d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); }
  function fmtDate(d) {
    try { return new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }).format(d).replace(/\.$/, ''); }
    catch (e) { return d.toDateString(); }
  }
  function fmtISODate(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? fmtDate(new Date(+m[1], +m[2] - 1, +m[3])) : iso; }
  function fmtTime(hm) {
    var m = /^(\d{1,2}):(\d{2})/.exec(hm || ''); if (!m) return hm;
    var h = +m[1], ap = h >= 12 ? 'pm' : 'am'; h = h % 12 || 12;
    return h + ':' + m[2] + ' ' + ap;
  }
  function fmtSize(b) { return b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'; }
  function midTrunc(s, max) { max = max || 30; return s.length <= max ? s : s.slice(0, max - 11) + '…' + s.slice(-10); }
  function plural(n, one, many) { return n === 1 ? one : fmt(many, { n: n }); }
  function isWin() {
    var p = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '';
    return /win/i.test(p);
  }
  function makeKey() {
    var abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
    var b = new Uint8Array(20); crypto.getRandomValues(b);
    var s = ''; for (var i = 0; i < b.length; i++) s += abc[b[i] & 63];
    return s;
  }
  function uid() { var b = new Uint8Array(8); crypto.getRandomValues(b); return Array.prototype.map.call(b, function (x) { return x.toString(16).padStart(2, '0'); }).join(''); }

  /* ---------------------------------------------------------------- token and state */
  var params = new URLSearchParams(location.search);
  var TOKEN = (params.get('c') || '').trim().toLowerCase();
  var TOKEN_OK = /^[a-f0-9]{36}$/.test(TOKEN);
  var LS_KEY = 'hy-intake:v1:' + TOKEN;

  var data = null;            // persisted per link
  var cur = null;             // current screen
  var editFrom = null;        // section opened from review (its Next becomes Back to review)
  var consentTicked = false;  // never remembered from an earlier session
  var failCount = 0;
  var saveOk = true;
  var sendingNow = false;
  var linkDead = false;
  var visitToasted = false;
  var fileInput = null;

  function blankData() {
    return { A: {}, F: [], R: [], cur: 'welcome', visited: [], startedAt: null, updatedAt: null, sentAt: null,
      submissionKey: makeKey(), firstName: null, sending: false, nudged: false };
  }
  function loadLocal() {
    try { var raw = localStorage.getItem(LS_KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }
  var saveTimer = null;
  function saveSoon(fromInput) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { saveNow(fromInput); }, 250);
  }
  function saveNow(fromInput) {
    clearTimeout(saveTimer); saveTimer = null;
    if (!data || !TOKEN_OK) return;
    data.updatedAt = new Date().toISOString();
    if (!data.startedAt) data.startedAt = data.updatedAt;
    var ok = true;
    try {
      var F = data.F.map(function (f) {
        return { id: f.id, slot: f.slot, qid: f.qid, key: f.key, name: f.name, size: f.size, type: f.type, addedAt: f.addedAt,
          status: f.status, progress: f.progress, path: f.path, signedUrl: f.signedUrl, prev: f.prev };
      });
      var copy = Object.assign({}, data, { F: F });
      localStorage.setItem(LS_KEY, JSON.stringify(copy));
    } catch (e) { ok = false; }
    if (ok !== saveOk) { saveOk = ok; updateBanners(); updateSavedLine(); }
    if (ok && fromInput && !visitToasted && typeof cur === 'number' && !toastState) {
      visitToasted = true;
      toast(STR.savedToast, { ms: 1500 });
    }
  }
  function flushSave() { if (saveTimer) saveNow(); }

  /* ---------------------------------------------------------------- IndexedDB for file bytes (never localStorage) */
  var IDB = (function () {
    var dbp = null, mem = new Map();
    function open() {
      if (dbp) return dbp;
      dbp = new Promise(function (res) {
        try {
          var r = indexedDB.open('hy-intake', 1);
          r.onupgradeneeded = function () { r.result.createObjectStore('files'); };
          r.onsuccess = function () { res(r.result); };
          r.onerror = function () { res(null); };
          r.onblocked = function () { res(null); };
        } catch (e) { res(null); }
      });
      return dbp;
    }
    function k(id) { return TOKEN + ':' + id; }
    function run(mode, fn) {
      return open().then(function (db) {
        if (!db) return null;
        return new Promise(function (res) {
          try {
            var t = db.transaction('files', mode), st = t.objectStore('files'), out = null;
            var r = fn(st);
            if (r) r.onsuccess = function () { out = r.result; };
            t.oncomplete = function () { res(out); };
            t.onerror = t.onabort = function () { res(null); };
          } catch (e) { res(null); }
        });
      });
    }
    return {
      put: function (id, blob) { mem.set(id, blob); return run('readwrite', function (st) { return st.put(blob, k(id)); }); },
      get: function (id) {
        if (mem.has(id)) return Promise.resolve(mem.get(id));
        return run('readonly', function (st) { return st.get(k(id)); }).then(function (b) { if (b) mem.set(id, b); return b || null; });
      },
      del: function (id) { mem.delete(id); return run('readwrite', function (st) { return st.delete(k(id)); }); }
    };
  })();

  /* ---------------------------------------------------------------- answers and counts */
  function filled(v) { return Array.isArray(v) ? v.length > 0 : (v !== undefined && v !== null && String(v).trim() !== ''); }
  function liveFiles(slotPrefix) {
    return data.F.filter(function (f) { return f.status !== 'removing' && (f.slot === slotPrefix || f.slot.indexOf(slotPrefix + ':') === 0); });
  }
  function qAnswered(q) {
    var A = data.A;
    if (q.t === 'pair') { if (filled(A[q.id + 'a']) || filled(A[q.id + 'b'])) return true; }
    else if (filled(A[q.id])) return true;
    if (q.note && filled(A[q.id + 'n'])) return true;
    if (q.upload && liveFiles(q.id).length) return true;
    return false;
  }
  function secCount(s) { var a = 0; s.q.forEach(function (q) { if (qAnswered(q)) a++; }); return a; }
  function secComplete(s) {
    var a = secCount(s);
    if (a === s.q.length) return true;
    var done = false;
    s.q.forEach(function (q) { if (q.completes && data.A[q.id] === q.completes.value) done = true; });
    return done;
  }
  function answeredTotal() { return SECTIONS.reduce(function (n, s) { return n + secCount(s); }, 0); }
  function fileCount() { return data.F.filter(function (f) { return f.status !== 'removing'; }).length; }
  function hasProgress() {
    if (!data) return false;
    if (Object.keys(data.A).some(function (k) { return filled(data.A[k]); })) return true;
    if (fileCount()) return true;
    return (typeof data.cur === 'number' && data.cur > 1) || data.cur === 'review' || data.cur === 'consent';
  }

  function answerText(q) {
    var A = data.A, v = A[q.id];
    switch (q.t) {
      case 'pair':
        var parts = [];
        ['a', 'b'].forEach(function (h, i) {
          var x = A[q.id + h];
          if (filled(x)) parts.push(q.p[i] + ' ' + (q.time ? fmtTime(x) : x));
        });
        return parts.join(', ');
      case 'num': return filled(v) ? String(v).trim() + ' ' + q.u : '';
      case 'time': return filled(v) ? fmtTime(v) : '';
      case 'date': return filled(v) ? fmtISODate(v) : '';
      case 'scale': return filled(v) ? fmt(STR.outOf10, { n: v }) : '';
      case 'multi':
        if (!filled(v)) return '';
        return q.rank ? v.map(function (x, i) { return (i + 1) + ' ' + x; }).join(', ') : v.join(', ');
      case 'photos':
        return q.upload.slots.filter(function (sl) { return liveFiles(q.id + ':' + sl.key).length; })
          .map(function (sl) { return sl.label; }).join(', ');
      default: return filled(v) ? String(v).trim() : '';
    }
  }
  function joinQ(label, text) { return /[?]$/.test(label) ? label + ' ' + text : label + ': ' + text; }

  function buildSummary(consented) {
    var first = data.firstName;
    var lines = [first ? fmt(STR.sumHead, { FIRST: first.toUpperCase() }) : STR.sumHeadNoName,
      fmt(STR.sumDate, { date: fmtDate(new Date()) }), ''];
    var skipped = [];
    SECTIONS.forEach(function (s) {
      var head = lines.length;
      lines.push(s.n + '. ' + s.t);
      s.q.forEach(function (q) {
        var t = answerText(q);
        if (q.upload && q.t !== 'photos') {
          var names = liveFiles(q.id).map(function (f) { return f.name; });
          if (names.length) t = (t ? t + ' ' : '') + '(' + names.join(', ') + ')';
        }
        if (t) lines.push(q.id + ' ' + joinQ(q.q, t));
        if (q.note && filled(data.A[q.id + 'n'])) lines.push(q.id + ' ' + joinQ(q.note, String(data.A[q.id + 'n']).trim()));
        if (!qAnswered(q)) skipped.push(q.id);
      });
      if (lines.length === head + 1) lines.pop(); else lines.push('');
    });
    if (skipped.length) lines.push(fmt(STR.sumSkipped, { ids: skipped.join(', ') }));
    lines.push(fmt(STR.sumConsent, { v: consented ? STR.yes : STR.notTicked }));
    return lines.join('\n');
  }
  function buildAnswers() {
    var out = {};
    Object.keys(data.A).forEach(function (k) { if (filled(data.A[k])) out[k] = data.A[k]; });
    out.files = data.F.filter(function (f) { return f.status === 'uploaded'; })
      .map(function (f) { return { slot: f.slot, path: f.path, name: f.name, size: f.size, type: f.type }; });
    return out;
  }

  /* ---------------------------------------------------------------- network */
  function api(body, ms) {
    var ctl = new AbortController();
    var t = setTimeout(function () { ctl.abort(); }, ms || CONFIG.REQUEST_TIMEOUT_MS);
    var payload = Object.assign({ token: TOKEN, submissionKey: data.submissionKey }, body);
    return fetch(CONFIG.FUNCTION_URL, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload),
      signal: ctl.signal, cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer'
    }).then(function (r) {
      return r.json().catch(function () { return null; }).then(function (j) {
        if (!j) return { ok: false, error: 'server_error', http: r.status };
        j.http = r.status; return j;
      });
    }).catch(function () { return { ok: false, error: 'network' }; })
      .finally(function () { clearTimeout(t); });
  }
  function getLink() {
    var ctl = new AbortController();
    var t = setTimeout(function () { ctl.abort(); }, CONFIG.REQUEST_TIMEOUT_MS);
    return fetch(CONFIG.FUNCTION_URL + '?c=' + encodeURIComponent(TOKEN), {
      method: 'GET', signal: ctl.signal, cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer'
    }).then(function (r) { return r.json().catch(function () { return { ok: false, error: 'server_error' }; }); })
      .catch(function () { return { ok: false, error: 'network' }; })
      .finally(function () { clearTimeout(t); });
  }

  /* ---------------------------------------------------------------- files: type, shrink, store */
  var EXT = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', heic: 'image/heic', heif: 'image/heif', webp: 'image/webp', pdf: 'application/pdf' };
  function mimeOf(f) {
    var t = (f.type || '').toLowerCase();
    if (t === 'image/jpg' || t === 'image/pjpeg') t = 'image/jpeg';
    if (!t || t === 'application/octet-stream') {
      var m = /\.([a-z0-9]+)$/i.exec(f.name || '');
      t = (m && EXT[m[1].toLowerCase()]) || t;
    }
    return t;
  }
  function typeOk(t, kind) {
    if (/^image\/(jpeg|png|heic|heif|webp)$/.test(t)) return true;
    return kind === 'file' && t === 'application/pdf';
  }
  function decodable(t) { return /^image\/(jpeg|png|webp)$/.test(t); }
  function bitmapOf(file) {
    if (!window.createImageBitmap) return Promise.reject(new Error('no bitmap'));
    return createImageBitmap(file, { imageOrientation: 'from-image' }).catch(function () { return createImageBitmap(file); });
  }
  // Shrink photos on the device: long edge 2000 px, JPEG about 0.82. Also strips location data from the photo.
  // If the browser can't decode it (HEIC off Safari), it goes as is.
  function prepare(file, type) {
    var name = file.name || 'photo';
    if (!/^image\//.test(type)) return Promise.resolve({ blob: file.slice(0, file.size, type), name: name, type: type });
    return bitmapOf(file).then(function (bmp) {
      var s = Math.min(1, CONFIG.PHOTO_LONG_EDGE / Math.max(bmp.width, bmp.height));
      var w = Math.max(1, Math.round(bmp.width * s)), h = Math.max(1, Math.round(bmp.height * s));
      var c = document.createElement('canvas'); c.width = w; c.height = h;
      var ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); ctx.drawImage(bmp, 0, 0, w, h);
      if (bmp.close) bmp.close();
      return new Promise(function (res) { c.toBlob(res, 'image/jpeg', CONFIG.PHOTO_QUALITY); });
    }).then(function (out) {
      if (!out || !out.size) throw new Error('encode');
      return { blob: out, name: name.replace(/\.[^.]+$/, '') + '.jpg', type: 'image/jpeg' };
    }).catch(function () {
      return { blob: file.slice(0, file.size, type), name: name, type: type };
    });
  }

  /* thumbnails: object URLs from the stored bytes */
  var thumbs = new Map();
  function hydrateThumbs(root) {
    (root || document).querySelectorAll('img[data-fid]').forEach(function (img) {
      var id = img.getAttribute('data-fid');
      if (thumbs.has(id)) { img.src = thumbs.get(id); return; }
      IDB.get(id).then(function (b) {
        if (!b) return;
        var u = URL.createObjectURL(b); thumbs.set(id, u); img.src = u;
      });
    });
  }
  function dropThumb(id) { var u = thumbs.get(id); if (u) { URL.revokeObjectURL(u); thumbs.delete(id); } }

  /* ---------------------------------------------------------------- uploads */
  var active = null;
  function findRec(id) { for (var i = 0; i < data.F.length; i++) if (data.F[i].id === id) return data.F[i]; return null; }
  function slotInfo(slotId) {
    var p = slotId.split(':'); var q = QMAP[p[0]].q;
    var sl = q.upload.slots.filter(function (x) { return x.key === p[1]; })[0];
    return { q: q, slot: sl };
  }
  function pump() {
    if (active || sendingNow || linkDead || !navigator.onLine || !data) return;
    var rec = data.F.filter(function (f) { return f.status === 'queued'; })[0];
    if (!rec) return;
    active = { rec: rec };
    active.promise = uploadRec(rec).then(function (r) { active = null; pump(); return r; });
  }
  function putFile(rec, blob) {
    return new Promise(function (res) {
      var x = new XMLHttpRequest();
      rec._xhr = x;
      x.open('PUT', rec.signedUrl);
      x.setRequestHeader('content-type', rec.type);
      x.timeout = 180000;
      x.upload.onprogress = function (e) { if (e.lengthComputable) setProgress(rec, Math.min(99, Math.round(e.loaded / e.total * 100))); };
      x.onload = function () { res({ status: x.status, text: x.responseText || '' }); };
      x.onerror = function () { res({ status: -1, text: '' }); };
      x.ontimeout = function () { res({ status: -1, text: '' }); };
      x.onabort = function () { res({ status: 0, aborted: true }); };
      x.send(blob);
    });
  }
  function uploadRec(rec, attempt) {
    attempt = attempt || 0;
    if (rec.status === 'removing' || !findRec(rec.id)) return Promise.resolve(false);
    rec.status = 'uploading'; rec.progress = rec.progress || 0; refreshFile(rec);
    var stillMine = function () { return rec.status === 'uploading' && !!findRec(rec.id); };
    return IDB.get(rec.id).then(function (blob) {
      if (!blob) { rec.status = 'failed'; refreshFile(rec); saveSoon(); return false; }
      var step = rec.path && rec.signedUrl ? Promise.resolve({ ok: true, path: rec.path, signedUrl: rec.signedUrl })
        : api({ action: 'upload-url', kind: rec.key, mime: rec.type, bytes: blob.size, filename: rec.name });
      return step.then(function (r) {
        if (!stillMine()) return false;
        if (!r.ok) {
          if (r.error === 'unknown_link') { onLinkDead(); return false; }
          throw r;
        }
        rec.path = r.path; rec.signedUrl = r.signedUrl; saveSoon();
        return putFile(rec, blob).then(function (res) {
          rec._xhr = null;
          if (res.aborted || !stillMine()) return false;
          if ((res.status >= 200 && res.status < 300) || /duplicate|already exists/i.test(res.text)) {
            rec.status = 'uploaded'; rec.progress = 100; rec.signedUrl = null;
            refreshFile(rec); saveSoon(); announceUpload(rec, 100);
            return true;
          }
          if (res.status >= 400 && res.status < 500 && attempt < 2) {
            // The one-time link has expired or been used: let it go and ask for a new one.
            var old = rec.path; rec.path = null; rec.signedUrl = null; queueRemoval(old);
            return uploadRec(rec, attempt + 1);
          }
          throw res;
        });
      });
    }).catch(function () {
      if (!stillMine()) return false;
      if (attempt < 2 && navigator.onLine) {
        return sleep(1500 * (attempt + 1)).then(function () { return stillMine() ? uploadRec(rec, attempt + 1) : false; });
      }
      rec.status = navigator.onLine ? 'failed' : 'queued';
      rec.progress = 0; refreshFile(rec); saveSoon();
      return false;
    });
  }
  function setProgress(rec, n) {
    rec.progress = n;
    document.querySelectorAll('[data-prog="' + rec.id + '"]').forEach(function (bar) {
      var i = bar.querySelector('i'); if (i) i.style.transform = 'scaleX(' + (n / 100) + ')';
      bar.setAttribute('aria-valuenow', String(n));
    });
    document.querySelectorAll('[data-pct="' + rec.id + '"]').forEach(function (t) { t.textContent = fmt(STR.uploading, { n: n }); });
    if (sendingNow) { var st = $('sendTrack'); if (st) st.querySelector('i').style.transform = 'scaleX(' + (n / 100) + ')'; }
    announceUpload(rec, n);
  }
  function announceUpload(rec, n) {
    var step = Math.floor(n / 25) * 25;
    if (rec._ann === step || step === 0) return;
    rec._ann = step;
    var info = slotInfo(rec.slot);
    if (n < 100) liveSay(els.upLive, fmt(STR.uploadingName, { Slot: cap(info.slot.name), n: step }));
    else liveSay(els.upLive, cap(info.slot.name) + ': ' + STR.added);
  }
  var removals = { busy: false };
  function queueRemoval(path) {
    if (!path) return;
    if (data.R.indexOf(path) < 0) data.R.push(path);
    saveSoon(); flushRemovals();
  }
  function flushRemovals() {
    if (removals.busy || !navigator.onLine || !data.R.length || linkDead) return;
    removals.busy = true;
    var path = data.R[0];
    api({ action: 'remove-file', path: path }).then(function (r) {
      removals.busy = false;
      if (r.ok || r.error === 'bad_path') { data.R = data.R.filter(function (p) { return p !== path; }); saveSoon(); flushRemovals(); }
      else setTimeout(flushRemovals, 8000); // quietly, the client isn't told
    });
  }

  function addFiles(slotId, files, replaceId) {
    var info = slotInfo(slotId), kind = info.q.upload.kind;
    var tile = isTileUpload(info.q);
    var list = Array.prototype.slice.call(files || []);
    if (tile) list = list.slice(0, 1);
    setSlotError(slotId, '');
    var chain = Promise.resolve(), added = 0;
    list.forEach(function (f) {
      chain = chain.then(function () {
        var type = mimeOf(f);
        if (!typeOk(type, kind)) { setSlotError(slotId, kind === 'photo' ? STR.wrongPhoto : STR.wrongFile); return; }
        if (!decodable(type) && f.size > LIMIT) { setSlotError(slotId, tooBigMsg(kind, type)); return; }
        return prepare(f, type).then(function (p) {
          if (p.blob.size > LIMIT) { setSlotError(slotId, tooBigMsg(kind, type)); return; }
          var rec = { id: uid(), slot: slotId, qid: info.q.id, key: info.slot.key, name: p.name, size: p.blob.size, type: p.type,
            addedAt: new Date().toISOString(), status: 'queued', progress: 0, path: null, signedUrl: null };
          return IDB.put(rec.id, p.blob).then(function () { data.F.push(rec); added++; });
        });
      });
    });
    return chain.then(function () {
      if (!added) return; // nothing queued: leave the slot (and any error under it) as it is
      if (replaceId) { var old = findRec(replaceId); if (old) commitRemove(old); }
      var errText = (document.getElementById('se-' + slotId) || {}).textContent || '';
      refreshUpload(info.q.id, 'rm:' + lastIn(slotId));
      if (errText) setSlotError(slotId, errText);
      afterAnswerChange(info.q.id);
      saveNow(true);
      pump();
    });
  }
  function lastIn(slotId) { var l = liveFiles(slotId); return l.length ? l[l.length - 1].id : ''; }
  function tooBigMsg(kind, type) {
    return fmt(kind === 'photo' || /^image\//.test(type) ? STR.tooBigPhoto : STR.tooBigFile, { mb: CONFIG.SIZE_LIMIT_MB });
  }
  function setSlotError(slotId, msg) {
    var e = document.getElementById('se-' + slotId);
    if (!e) return;
    if (msg) { e.innerHTML = svg('alert') + '<span>' + esc(msg) + '</span>'; e.hidden = false; liveSay(els.upLive, msg); }
    else { e.textContent = ''; e.hidden = true; }
  }
  function commitRemove(rec) {
    if (rec._xhr) { try { rec._xhr.abort(); } catch (e) { /* gone */ } }
    data.F = data.F.filter(function (f) { return f.id !== rec.id; });
    IDB.del(rec.id); dropThumb(rec.id);
    if (rec.path) queueRemoval(rec.path);
    saveSoon();
  }
  function removeRec(rec, focusAfter) {
    var slotId = rec.slot, info = slotInfo(slotId);
    var sibs = liveFiles(slotId), idx = sibs.indexOf(rec);
    if (rec._xhr) { try { rec._xhr.abort(); } catch (e) { /* gone */ } rec._xhr = null; }
    rec.prev = rec.status === 'uploaded' ? 'uploaded' : 'queued';
    rec.status = 'removing';
    var after = sibs.filter(function (f) { return f !== rec; });
    var nextFocus = after[idx] || after[idx - 1];
    refreshUpload(info.q.id, focusAfter === false ? null : (nextFocus ? 'rm:' + nextFocus.id : 'add:' + slotId));
    afterAnswerChange(info.q.id);
    saveNow();
    var isPhoto = /^image\//.test(rec.type);
    toast(isPhoto ? STR.photoRemoved : STR.fileRemoved, {
      ms: CONFIG.UNDO_MS,
      undo: function () {
        rec.status = rec.prev || 'queued'; rec.prev = null;
        refreshUpload(info.q.id, 'rm:' + rec.id);
        afterAnswerChange(info.q.id); saveNow(); pump();
      },
      expire: function () { if (rec.status === 'removing') commitRemove(rec); }
    });
  }
  function cancelRec(rec) {
    var slotId = rec.slot, info = slotInfo(slotId);
    commitRemove(rec);
    refreshUpload(info.q.id, 'add:' + slotId);
    afterAnswerChange(info.q.id); saveNow();
    if (active && active.rec === rec) { /* pump continues when the aborted promise settles */ }
  }
  function retryRec(rec) { rec.status = 'queued'; rec.progress = 0; refreshFile(rec); saveNow(); pump(); }
  function pickFiles(slotId, replaceId) {
    var info = slotInfo(slotId);
    if (!fileInput) {
      fileInput = document.createElement('input');
      fileInput.type = 'file'; fileInput.className = 'sr'; fileInput.tabIndex = -1;
      fileInput.setAttribute('aria-hidden', 'true');
      document.body.appendChild(fileInput);
    }
    fileInput.accept = info.q.upload.accept;
    fileInput.multiple = !isTileUpload(info.q);
    fileInput.onchange = function () {
      var fs = fileInput.files; if (fs && fs.length) addFiles(slotId, fs, replaceId);
      fileInput.value = '';
    };
    fileInput.click();
  }

  /* ---------------------------------------------------------------- live regions and toasts */
  function liveSay(region, text) {
    region.textContent = '';
    setTimeout(function () { region.textContent = text; }, 60);
  }
  var toastState = null;
  function toast(msg, opt) {
    opt = opt || {};
    if (toastState) endToast(true);
    var t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = '<span>' + esc(msg) + '</span>' + (opt.undo ? '<button type="button" class="textbtn" aria-label="' + esc(STR.undoName) + '">' + esc(STR.undo) + '</button>' : '');
    els.toastWrap.innerHTML = ''; els.toastWrap.appendChild(t);
    var st = { el: t, opt: opt, remaining: opt.ms || 2000, started: Date.now(), timer: null, paused: false };
    toastState = st;
    function run() { st.started = Date.now(); st.timer = setTimeout(function () { if (toastState === st) endToast(false); }, st.remaining); }
    function pause() { if (st.paused) return; st.paused = true; clearTimeout(st.timer); st.remaining = Math.max(800, st.remaining - (Date.now() - st.started)); }
    function resume() { if (!st.paused) return; st.paused = false; run(); }
    t.addEventListener('mouseenter', pause); t.addEventListener('mouseleave', function () { if (!t.contains(document.activeElement)) resume(); });
    t.addEventListener('focusin', pause); t.addEventListener('focusout', function () { setTimeout(function () { if (!t.contains(document.activeElement) && !t.matches(':hover')) resume(); }, 0); });
    if (opt.undo) {
      t.querySelector('button').addEventListener('click', function () {
        var u = opt.undo; opt.expire = null; opt.undo = null; endToast(true); u();
      });
    }
    run();
  }
  function endToast(instant) {
    var st = toastState; if (!st) return;
    toastState = null; clearTimeout(st.timer);
    if (st.opt.expire) st.opt.expire();
    if (instant || reduced()) { if (st.el.parentNode) st.el.parentNode.removeChild(st.el); return; }
    st.el.classList.add('out');
    setTimeout(function () { if (st.el.parentNode) st.el.parentNode.removeChild(st.el); }, 220);
  }

  /* ---------------------------------------------------------------- question markup */
  function idOf(s) { return s.replace(/\./g, '-'); }
  function describedBy(ids) { ids = ids.filter(Boolean); return ids.length ? ' aria-describedby="' + ids.join(' ') + '"' : ''; }
  function hintHTML(q) { return q.hint ? '<p class="hint" id="h-' + idOf(q.id) + '">' + esc(q.hint) + '</p>' : ''; }
  function errHTML(key) { return '<p class="err" id="e-' + key + '" hidden></p>'; }
  function noteHTML(q) {
    if (!q.note) return '';
    var id = 'f-' + idOf(q.id) + 'n';
    var pill = !!q.o && !data.A[q.id + 'n'];
    if (pill) return '<button type="button" class="opt notepill" data-act="note" data-for="' + id + '">' + svg('plus') + '<span>' + esc(q.note) + '</span></button>' +
      '<div class="notewrap" hidden><label class="sub notelabel" for="' + id + '">' + esc(q.note) + '</label>' +
      '<input class="field" id="' + id + '" type="text" data-a="' + q.id + 'n" data-stop enterkeyhint="next" autocomplete="off" value=""></div>';
    return '<label class="sub notelabel" for="' + id + '">' + esc(q.note) + '</label>' +
      '<input class="field" id="' + id + '" type="text" data-a="' + q.id + 'n" data-stop enterkeyhint="next" autocomplete="off" value="' + esc(data.A[q.id + 'n'] || '') + '">';
  }
  function val(k) { var v = data.A[k]; return v == null ? '' : v; }

  function renderQ(q) {
    var k = idOf(q.id), h = q.hint ? 'h-' + k : null;
    var A = data.A;
    switch (q.t) {
      case 'text': case 'tel': case 'date':
        var type = q.t === 'date' ? 'date' : q.t === 'tel' ? 'tel' : 'text';
        return '<div class="block" data-q="' + q.id + '"><label class="q" for="f-' + k + '">' + esc(q.q) + '</label>' + hintHTML(q) +
          '<input class="field" id="f-' + k + '" type="' + type + '" data-a="' + q.id + '"' + (q.t === 'date' ? ' data-date max="' + todayISO() + '"' : '') +
          ' data-stop enterkeyhint="next"' + (q.autocomplete ? ' autocomplete="' + q.autocomplete + '"' : ' autocomplete="off"') +
          (q.t === 'tel' ? ' inputmode="tel"' : '') + describedBy([h]) + ' value="' + esc(val(q.id)) + '">' + errHTML(k) + noteHTML(q) + '</div>';
      case 'area':
        return '<div class="block" data-q="' + q.id + '"><label class="q" for="f-' + k + '">' + esc(q.q) + '</label>' + hintHTML(q) +
          '<textarea class="field' + (q.big ? ' bigta' : '') + '" id="f-' + k + '" rows="3" data-a="' + q.id + '" data-stop' +
          (q.placeholder ? ' placeholder="' + esc(q.placeholder) + '"' : '') + describedBy([h]) + '>' + esc(val(q.id)) + '</textarea>' + noteHTML(q) + '</div>';
      case 'num':
        return '<div class="block" data-q="' + q.id + '"><label class="q" for="f-' + k + '">' + esc(q.q) + '</label>' + hintHTML(q) +
          '<span class="nf" id="nf-' + k + '"><input id="f-' + k + '" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="next" data-a="' + q.id + '" data-num data-stop' +
          describedBy([h, 'u-' + k]) + ' value="' + esc(val(q.id)) + '"><span class="u" id="u-' + k + '">' + esc(q.u) + '</span></span>' + errHTML(k) + noteHTML(q) + '</div>';
      case 'time':
        return '<div class="block" data-q="' + q.id + '"><label class="q" for="f-' + k + '">' + esc(q.q) + '</label>' + hintHTML(q) +
          '<input class="big timeone" id="f-' + k + '" type="time" data-a="' + q.id + '" data-stop' + describedBy([h]) + ' value="' + esc(val(q.id)) + '">' + noteHTML(q) + '</div>';
      case 'pair':
        var halves = ['a', 'b'].map(function (x, i) {
          var fid = 'f-' + k + x;
          if (q.time) {
            return '<div><label class="sub" for="' + fid + '">' + esc(q.p[i]) + '</label><input class="big" id="' + fid + '" type="time" data-a="' + q.id + x + '" data-stop value="' + esc(val(q.id + x)) + '"></div>';
          }
          return '<div><label class="sub" for="' + fid + '">' + esc(q.p[i]) + '</label><span class="nf" id="nf-' + k + x + '"><input id="' + fid + '" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="next" data-a="' + q.id + x + '" data-num data-stop value="' + esc(val(q.id + x)) + '"></span>' + errHTML(k + x) + '</div>';
        }).join('');
        return '<fieldset class="block" data-q="' + q.id + '"' + describedBy([h]) + '><legend class="q' + (q.hint ? ' hq' : '') + '">' + esc(q.q) + '</legend>' + hintHTML(q) +
          '<div class="pair">' + halves + '</div>' + noteHTML(q) + '</fieldset>';
      case 'chips': case 'multi':
        if (q.rank) return renderRanked(q);
        var multi = q.t === 'multi', cur = A[q.id];
        var rows = q.o.map(function (o, i) {
          var on = multi ? (Array.isArray(cur) && cur.indexOf(o) >= 0) : cur === o;
          var iid = 'o-' + k + '-' + i;
          return '<div><input class="sr" type="' + (multi ? 'checkbox' : 'radio') + '" name="n-' + k + '" id="' + iid + '" value="' + esc(o) + '" data-a="' + q.id + '"' + (on ? ' checked' : '') + '>' +
            '<label class="opt" for="' + iid + '"><span>' + esc(o) + '</span><span class="mk" aria-hidden="true">' + svg('check') + '</span></label></div>';
        }).join('');
        return '<fieldset class="block" data-q="' + q.id + '" data-stop' + describedBy([h]) + '><legend class="q' + (q.hint ? ' hq' : '') + '">' + esc(q.q) +
          (multi ? ' <span class="helper">' + esc(STR.pickAny) + '</span>' : '') + '</legend>' + hintHTML(q) +
          '<div class="opts' + optClass(q) + '">' + rows + '</div>' + noteHTML(q) + (q.upload && renderPart !== 'main' ? '<div class="upl" id="ua-' + k + '"' + (showUpload(q) ? '' : ' hidden') + '>' + uploadInner(q) + '</div>' : '') + '</fieldset>';
      case 'scale':
        var radios = '';
        for (var n = 1; n <= 10; n++) {
          var lab = fmt(STR.scaleName, { n: n }) + (n === 1 ? ', ' + q.ends[0] : n === 10 ? ', ' + q.ends[1] : '');
          var sid = 's-' + k + '-' + n;
          radios += '<input class="sr" type="radio" name="n-' + k + '" id="' + sid + '" value="' + n + '" data-a="' + q.id + '" data-scale aria-label="' + esc(lab) + '"' + (Number(A[q.id]) === n ? ' checked' : '') + '>' +
            '<label for="' + sid + '" aria-hidden="true">' + n + '</label>';
        }
        return '<fieldset class="block" data-q="' + q.id + '" data-stop><legend class="q">' + esc(q.q) + '</legend>' +
          '<div class="scale">' + radios + '</div><div class="ends" aria-hidden="true"><span>1 ' + esc(q.ends[0]) + '</span><span>10 ' + esc(q.ends[1]) + '</span></div></fieldset>';
      case 'photos':
        return '<fieldset class="block" data-q="' + q.id + '"' + describedBy([h]) + '><legend class="q' + (q.hint ? ' hq' : '') + '">' + esc(q.q) + '</legend>' + hintHTML(q) +
          '<div id="ua-' + k + '">' + uploadInner(q) + '</div></fieldset>';
    }
    return '';
  }
  function optClass(q) {
    var n = q.o.length, mx = Math.max.apply(null, q.o.map(function (o) { return o.length; }));
    if ((n <= 6 && mx <= 5) || (n <= 3 && mx <= 10)) return ' seg seg' + n;
    if (n > 4 || mx <= 14) return ' pills';
    return '';
  }
  function renderUploadScreen(q) {
    var k = idOf(q.id), u = q.upload;
    return '<fieldset class="block" data-q="' + q.id + '"><legend class="q' + (u.screenHint ? ' hq' : '') + '">' + esc(u.screenTitle || q.q) + '</legend>' +
      (u.screenHint ? '<p class="hint">' + esc(u.screenHint) + '</p>' : '') +
      '<div class="upl solo" id="ua-' + k + '">' + uploadInner(q, true) + '</div></fieldset>';
  }
  function renderRanked(q) {
    var k = idOf(q.id);
    var rows = q.o.map(function (o) { return '<button type="button" class="opt" data-rank="' + q.id + '" data-v="' + esc(o) + '" aria-pressed="false"><span>' + esc(o) + '</span><span class="mk" aria-hidden="true"></span></button>'; }).join('');
    return '<fieldset class="block" data-q="' + q.id + '" data-stop aria-describedby="h-' + k + '"><legend class="q hq">' + esc(q.q) + ' <span class="helper">' + esc(STR.inOrder) + '</span></legend>' +
      hintHTML(q) + '<div class="opts' + optClass(q) + '" id="rk-' + k + '">' + rows + '</div><p class="rankmsg" id="rm-' + k + '" aria-live="polite"></p>' + noteHTML(q) + '</fieldset>';
  }
  function syncRanked(q) {
    var list = Array.isArray(data.A[q.id]) ? data.A[q.id] : [];
    var box = document.getElementById('rk-' + idOf(q.id)); if (!box) return;
    box.querySelectorAll('[data-rank]').forEach(function (b) {
      var v = b.getAttribute('data-v'), i = list.indexOf(v);
      b.setAttribute('aria-pressed', i >= 0 ? 'true' : 'false');
      if (i >= 0) b.setAttribute('aria-label', fmt(STR.rankedName, { option: v, n: i + 1 })); else b.removeAttribute('aria-label');
      b.querySelector('.mk').textContent = i >= 0 ? String(i + 1) : '';
    });
  }

  function isTileUpload(q) { return q.upload.kind === 'photo'; }
  function showUpload(q) { return !q.upload.showWhen || data.A[q.id] === q.upload.showWhen || liveFiles(q.id).length > 0; }
  function uploadInner(q, solo) {
    var u = q.upload, out = '';
    if (isTileUpload(q)) {
      if (u.heading && !solo) out += '<span class="slothead">' + esc(u.heading) + '</span>';
      if (u.instruction) out += '<p class="slotsub">' + esc(u.instruction) + '</p>';
      out += '<div class="pgrid">' + u.slots.map(function (sl) { return tileHTML(q, sl); }).join('') + '</div>';
      if (u.count) {
        var n = u.slots.filter(function (sl) { return liveFiles(q.id + ':' + sl.key).length; }).length;
        out += '<p class="count"><span aria-live="polite">' + (n ? esc(fmt(STR.countLine, { n: n })) : '') + '</span><span class="lockline">' + svg('lock') + esc(u.privacy) + '</span></p>';
      } else if (u.privacy) {
        out += '<p class="privacy lockline">' + svg('lock') + esc(u.privacy) + '</p>';
      }
      return out;
    }
    return u.slots.map(function (sl) { return stripHTML(q, sl); }).join('');
  }
  function statusHTML(rec, sl) {
    var info = cap(sl.name);
    if (rec.status === 'uploaded') return '<span class="st">' + svg('check', 'ok') + esc(STR.added) + '</span>';
    if (rec.status === 'failed') return '';
    if (rec.status === 'queued' && !navigator.onLine) return '';
    return '<span class="st" data-pct="' + rec.id + '">' + esc(fmt(STR.uploading, { n: rec.progress || 0 })) + '</span>';
  }
  function msgHTML(rec, sl) {
    if (rec.status === 'failed') {
      return '<p class="tilemsg bad">' + esc(STR.failed) + ' <button type="button" class="textbtn" data-act="retry" data-fid="' + rec.id + '" data-fkey="retry:' + rec.id + '" aria-label="' + esc(fmt(STR.retryName, { slot: sl.name })) + '">' + esc(STR.tryAgain) + '</button></p>';
    }
    if (rec.status === 'queued' && !navigator.onLine) return '<p class="tilemsg">' + esc(STR.queuedOffline) + '</p>';
    if (rec.status === 'queued' || rec.status === 'uploading') {
      return '<p class="tilemsg"><button type="button" class="textbtn" data-act="cancel" data-fid="' + rec.id + '" data-fkey="cancel:' + rec.id + '" aria-label="' + esc(fmt(STR.cancelName, { slot: sl.name })) + '">' + esc(STR.cancel) + '</button></p>';
    }
    return '';
  }
  function upbarHTML(rec, sl) {
    if (rec.status !== 'uploading' && !(rec.status === 'queued' && navigator.onLine)) return '';
    return '<span class="upbar" data-prog="' + rec.id + '" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + (rec.progress || 0) +
      '" aria-label="' + esc(fmt(STR.uploadingName, { Slot: cap(sl.name), n: rec.progress || 0 })) + '"><i style="transform:scaleX(' + ((rec.progress || 0) / 100) + ')"></i></span>';
  }
  function thumbInner(rec, sl, alt) {
    if (decodable(rec.type)) return '<img alt="' + esc(alt) + '" data-fid="' + rec.id + '">';
    return '<span class="neutral" role="img" aria-label="' + esc(alt) + '">' + svg('file') + '<span aria-hidden="true">' + esc(rec.type === 'application/pdf' ? midTrunc(rec.name, 18) : sl.label) + '</span></span>';
  }
  function tileHTML(q, sl) {
    var slotId = q.id + ':' + sl.key, files = liveFiles(slotId), rec = files[files.length - 1];
    var sub = sl.sub ? '<span class="slotsub">' + esc(sl.sub) + '</span>' : '';
    var errP = '<p class="err" id="se-' + slotId + '" hidden></p>';
    if (!rec) {
      return '<div class="tile" data-slot="' + slotId + '"><button type="button" class="add" data-act="add" data-slot="' + slotId + '" data-fkey="add:' + slotId + '" aria-label="' + esc(fmt(STR.addPhotoName, { slot: sl.name })) + '">' +
        svg('plus') + esc(STR.addPhoto) + '</button><div class="meta"><span><span class="pl">' + esc(sl.label) + '</span>' + sub + '</span></div>' + errP + '</div>';
    }
    var dim = rec.status !== 'uploaded' ? ' dim' : '';
    return '<div class="tile" data-slot="' + slotId + '"><span class="img' + dim + '">' + thumbInner(rec, sl, fmt(STR.thumbAlt, { Slot: sl.label })) + upbarHTML(rec, sl) +
      '<button type="button" class="rm" data-act="remove" data-fid="' + rec.id + '" data-fkey="rm:' + rec.id + '" aria-label="' + esc(fmt(STR.removeName, { slot: sl.name })) + '"><span>' + svg('close') + '</span></button></span>' +
      '<div class="meta"><span class="pl">' + esc(sl.label) + '</span>' +
      '<button type="button" class="textbtn" data-act="replace" data-slot="' + slotId + '" data-fid="' + rec.id + '" data-fkey="rep:' + slotId + '" aria-label="' + esc(fmt(STR.replaceName, { slot: sl.name })) + '">' + esc(STR.replace) + '</button></div>' +
      sub + statusHTML(rec, sl) + msgHTML(rec, sl) + errP + '</div>';
  }
  function stripHTML(q, sl) {
    var slotId = q.id + ':' + sl.key, files = liveFiles(slotId), u = q.upload;
    var out = '<div class="fslot" data-slot="' + slotId + '"><span class="slothead">' + esc(sl.label) + '</span>' +
      (u.instruction ? '<span class="slotsub">' + esc(u.instruction) + '</span>' : '');
    if (files.length) {
      out += '<ul class="strip">' + files.map(function (rec) {
        var dim = rec.status !== 'uploaded' ? ' dim' : '';
        return '<li class="frow"><span class="fthumb' + dim + '">' + (decodable(rec.type) ? '<img alt="" data-fid="' + rec.id + '">' : svg('file')) + upbarHTML(rec, sl) + '</span>' +
          '<span class="ftext"><span class="fname">' + esc(midTrunc(rec.name)) + ' · ' + esc(fmtSize(rec.size)) + '</span>' + statusHTML(rec, sl) + msgHTML(rec, sl) + '</span>' +
          '<button type="button" class="frm" data-act="remove" data-fid="' + rec.id + '" data-fkey="rm:' + rec.id + '" aria-label="' + esc(fmt(STR.removeFileName, { file: rec.name })) + '">' + svg('close') + '</button></li>';
      }).join('') + '</ul>';
      out += '<button type="button" class="textbtn addmore" data-act="add" data-slot="' + slotId + '" data-fkey="add:' + slotId + '">' + svg('plus') + esc(STR.addAnotherPage) + '</button>';
    } else {
      out += '<button type="button" class="addrow" data-act="add" data-slot="' + slotId + '" data-fkey="add:' + slotId + '" aria-label="' + esc(fmt(STR.addFileName, { slot: sl.name })) + '">' + svg('plus') + esc(STR.addFile) + '</button>';
    }
    return out + '<p class="err" id="se-' + slotId + '" hidden></p></div>';
  }
  function refreshUpload(qid, focusKey) {
    var q = QMAP[qid].q, box = document.getElementById('ua-' + idOf(qid));
    if (!box) return;
    var a = document.activeElement, key = focusKey || (a && box.contains(a) ? a.getAttribute('data-fkey') : null);
    box.innerHTML = uploadInner(q, box.classList.contains('solo'));
    if (q.upload.showWhen) box.hidden = !showUpload(q);
    hydrateThumbs(box);
    if (key) {
      var t = box.querySelector('[data-fkey="' + key + '"]');
      if (!t && key.indexOf('rm:') === 0) t = box.querySelector('[data-act="add"]');
      if (t) t.focus({ preventScroll: false });
    }
  }
  function refreshFile(rec) { if (data && QMAP[rec.qid]) refreshUpload(rec.qid); }

  /* ---------------------------------------------------------------- screens */
  var RANK = { loading: 0, bad: 0, changed: 0, welcome: 0, resume: 0, review: 24, consent: 25, sending: 26, offline: 27, failed: 27, thanks: 28 };
  function rankOf(s) { return typeof s === 'number' ? s : RANK[s]; }
  function wordmark() {
    return '<span class="hy-wordmark hy-wordmark--small wm" role="img" aria-label="' + esc(STR.wordmarkLabel) + '"><span aria-hidden="true">H<span class="hy-k-hy">Y</span><span class="hy-k-yg">G</span>I<span class="hy-k-ie">E</span><span class="hy-k-ei">I</span><span class="hy-k-ia">A</span></span></span>';
  }
  function first() { return data && data.firstName ? data.firstName : null; }
  function setTitle() {
    document.title = first() ? fmt(STR.pageTitle, { first: first() }) : STR.pageTitleNoName;
  }
  function savedCardText() {
    var a = answeredTotal(), p = fileCount();
    var at = plural(a, STR.oneAnswer, STR.nAnswers);
    return p ? fmt(STR.savedCard, { answers: at, photos: plural(p, STR.onePhoto, STR.nPhotos) }) : fmt(STR.savedCardNoPhotos, { answers: at });
  }

  function view(html, cls) {
    var v = document.createElement('div');
    v.className = 'view' + (cls ? ' ' + cls : '');
    v.innerHTML = html;
    return v;
  }
  function textEl(v, sel, text) { var e = v.querySelector(sel); if (e) e.textContent = text; }

  function build(to) {
    var r = { top: null, bar: null, plain: true, live: null };
    var A, s, v;
    if (to === 'loading') {
      r.el = view(wordmark());
      return r;
    }
    if (to === 'bad' || to === 'changed') {
      var bad = to === 'bad';
      r.el = view(wordmark() + '<h1 class="hd" tabindex="-1" style="margin-top:16px"></h1><p class="lead" style="margin-top:8px;color:var(--hy-text)"></p>' + (bad ? '' : '<div id="copySlot"></div>'));
      textEl(r.el, 'h1', bad ? STR.badH : STR.changedH);
      textEl(r.el, 'p', bad ? STR.badBody : STR.changedBody);
      if (!bad) r.bar = { primary: { label: STR.tryAgain, act: retryLink }, secondary: { label: STR.copy, act: copyAnswers } };
      return r;
    }
    if (to === 'welcome') {
      r.el = view(wordmark() + '<p class="who"><span class="muted">' + esc(STR.from) + '</span> <b>' + esc(STR.fromName) + '</b></p>' +
        '<h1 class="hd" tabindex="-1"></h1><div class="wtext"><p>' + esc(STR.welcomeLead) + '</p><p>' + esc(STR.welcomeNote) + '</p>' +
        '<ul class="facts">' + STR.facts.map(function (f) { return '<li>' + esc(f) + '</li>'; }).join('') +
        '<li>' + esc(STR.factLastBefore) + '<b>' + esc(STR.factLastName) + '</b>' + esc(STR.factLastAfter) + '</li></ul></div>', 'welcome');
      textEl(r.el, 'h1', first() ? fmt(STR.welcomeH, { first: first() }) : STR.welcomeHNoName);
      r.bar = { flat: true, primary: { label: STR.start, act: function () { go(1); } }, under: STR.underStart };
      return r;
    }
    if (to === 'resume') {
      var c = data.cur, lead;
      if (typeof c === 'number') lead = fmt(STR.resumeLead, { title: scr(c).s.t, n: scr(c).s.n });
      else lead = STR.resumeLeadReview;
      r.el = view(wordmark() + '<h1 class="hd" tabindex="-1" style="margin-top:8px"></h1><p class="lead" style="margin-top:8px;color:var(--hy-text)">' + esc(lead) + '</p>');
      textEl(r.el, 'h1', first() ? fmt(STR.resumeH, { first: first() }) : STR.resumeHNoName);
      r.bar = { flat: true,
        primary: { label: STR.resumePrimary, act: function () { go(typeof c === 'number' ? c : 'review'); } },
        secondary: { label: STR.resumeSecondary, act: function () { go(1); } } };
      return r;
    }
    if (typeof to === 'number') {
      var sc = scr(to);
      s = sc.s;
      r.plain = false;
      var up = sc.part === 'upload', firstPg = sc.i === 0 && !up;
      renderPart = up ? 'upload' : 'main';
      var body = sc.q.map(up ? renderUploadScreen : renderQ).join('');
      renderPart = null;
      r.el = view((firstPg ? headHTML(s) : '<h1 class="sr" id="h-sec" tabindex="-1">' + esc(s.t) + '</h1>') + '<div class="qs">' + body + '</div>', 'sec');
      r.top = { back: function () { var pv = prevVis(to); go(pv || 'welcome'); }, title: s.t, sheet: true, large: firstPg,
        step: fmt(STR.step, { n: s.n }), now: s.n, frac: (QIDX[sc.q[0].id] + (up ? 1 : 0)) / TOTAL, valuetext: fmt(STR.progress, { n: s.n, title: s.t }) };
      var nv = nextVis(to);
      var label = (editFrom === s.n && (!nv || scr(nv).s.n !== s.n)) ? STR.backToReview : !nv ? STR.reviewMine : STR.next;
      r.bar = { back: r.top.back, hint: true, primary: { label: label, act: sectionNext } };
      if (firstPg) r.live = fmt(STR.progress, { n: s.n, title: s.t });
      r.after = function () {
        sc.q.forEach(function (q) { if (q.rank) syncRanked(q); });
        hydrateThumbs(r.el);
        fit(r.el);
      };
      return r;
    }
    if (to === 'review') {
      r.plain = false;
      var answered = answeredTotal(), html = '';
      // Review fits one screen (12 Nov 2026): one row per chapter; Edit opens the Sections sheet.
      html = '<ol class="list chaplist">';
      INTAKE.chapters.forEach(function (ch) {
        var secs = SECTIONS.filter(function (x) { return x.chapter === ch.n; });
        var ca = secs.reduce(function (n, x) { return n + secCount(x); }, 0), ct = secs.reduce(function (n, x) { return n + x.q.length; }, 0);
        var done = secs.every(secComplete), ph = 0;
        secs.forEach(function (x) { x.q.forEach(function (q) { if (q.upload) ph += liveFiles(q.id).length; }); });
        html += '<li><span class="rst" aria-hidden="true">' + (done ? svg('check') : '') + '</span><span class="tx"><span class="tx1"><span class="nm">' + esc(ch.title) + '</span><span class="ct">' + esc(ca ? fmt(STR.aOfT, { a: ca, t: ct }) : STR.skipped) + '</span></span>' +
          (ph ? '<span class="ph">' + esc(plural(ph, STR.onePhoto, STR.nPhotos)) + '</span>' : '') + '</span>' +
          '<button type="button" class="textbtn" data-act="sheet" aria-haspopup="dialog" aria-label="' + esc(fmt(STR.editName, { title: ch.title })) + '">' + esc(STR.edit) + '</button></li>';
      });
      html += '</ol>';
      var nudge = '';
      if (secCount(SECTIONS[7]) < 2 && !data.nudged) {
        data.nudged = true; saveSoon();
        nudge = '<div class="nudge"><p>' + esc(STR.nudge) + '</p><button type="button" class="textbtn" data-act="edit" data-n="8" aria-label="' + esc(fmt(STR.editName, { title: SECTIONS[7].t })) + '">' + esc(STR.edit) + '</button></div>';
      }
      r.el = view('<h1 class="lt" tabindex="-1">' + esc(STR.reviewH) + '</h1><p class="sum">' + esc(fmt(STR.reviewSum, { answered: answered, total: TOTAL })) + '</p>' +
        '<p class="lead" style="margin-top:2px">' + esc(STR.reviewLead) + '</p>' + nudge + html);
      r.top = { back: function () { go(NS); }, title: STR.reviewTitle, step: STR.lastStep, now: 23, valuetext: STR.reviewTitle };
      r.bar = { back: r.top.back, primary: { label: STR.reviewPrimary, act: function () { go('consent'); } } };
      r.live = STR.reviewTitle;
      return r;
    }
    if (to === 'consent') {
      r.plain = false;
      consentTicked = false;
      r.el = view('<h1 class="lt" tabindex="-1">' + esc(STR.consentH) + '</h1>' +
        '<div class="going"><h2>' + esc(STR.whatsGoing) + '</h2><ul class="list"><li><span>' + esc(STR.answersRow) + '</span><span class="v">' + esc(fmt(STR.aOfT, { a: answeredTotal(), t: TOTAL })) + '</span></li>' +
        '<li><span>' + esc(STR.photosRow) + '</span><span class="v">' + fileCount() + '</span></li></ul></div>' +
        '<label class="consent" for="consent"><input type="checkbox" id="consent"><span class="box" aria-hidden="true">' + svg('check') + '</span>' +
        '<span class="ctext"><span>' + esc(STR.consentText) + '</span><span>' + esc(STR.consentText2) + '</span></span></label>' +
        '<p class="safety">' + esc(STR.safety) + '</p>');
      r.top = { back: function () { go('review'); }, title: '', step: STR.lastStep, now: 23, valuetext: STR.lastStep };
      r.bar = { back: r.top.back, primary: { label: STR.send, act: trySend, id: 'sendBtn', disabled: true, describedby: 'tickHint' },
        prehint: STR.tickHint, prehintId: 'tickHint' };
      r.live = STR.lastStep;
      return r;
    }
    if (to === 'sending') {
      r.el = view('<p class="eyebrow">' + esc(STR.sendingEyebrow) + '</p><h1 class="hd" tabindex="-1">' + esc(STR.sendingH) + '</h1>' +
        '<p class="lead" style="margin-top:8px">' + esc(STR.sendingBody) + '</p>' +
        '<div class="sendprog" id="sendProg" hidden><p id="sendLine"></p><div class="track" id="sendTrack"><i></i></div></div>');
      return r;
    }
    if (to === 'offline' || to === 'failed') {
      var off = to === 'offline';
      r.el = view((off ? '<p class="eyebrow">' + esc(STR.notSent) + '</p>' : '') + '<h1 class="hd" tabindex="-1">' + esc(off ? STR.offlineH : STR.failedH) + '</h1>' +
        '<p class="lead" style="margin-top:8px;color:var(--hy-text)">' + esc(off ? STR.offlineBody : STR.failedBody) + '</p>' +
        '<p class="card">' + svg('check') + '<span>' + esc(savedCardText()) + '</span></p><div id="copySlot"></div>');
      var showCopy = off || failCount >= 2;
      r.bar = { primary: { label: STR.tryAgain, act: trySend }, preline: showCopy && !off ? STR.stillNot : '',
        secondary: showCopy ? { label: STR.copy, act: copyAnswers } : null };
      return r;
    }
    if (to === 'thanks') {
      r.el = view(wordmark() + '<span class="done" aria-hidden="true">' + svg('check') + '</span><h1 class="hd" tabindex="-1"></h1>' +
        '<div class="body3"><p>' + esc(STR.thanks1) + '</p><p>' + esc(STR.thanks2) + '</p><p class="muted">' + esc(STR.thanks3) + '</p></div>' +
        '<p class="sign">' + esc(STR.signOff) + '</p><p class="foot">' + esc(STR.thanksMore) + '</p>');
      textEl(r.el, 'h1', first() ? fmt(STR.thanksH, { first: first() }) : STR.thanksHNoName);
      return r;
    }
    return r;
  }

  /* top bar, bottom bar */
  var io = null;
  function setTop(t) {
    if (io) { io.disconnect(); io = null; }
    if (!t) { els.top.hidden = true; return; }
    els.top.hidden = false;
    els.topBack.onclick = t.back;
    els.barTitle.innerHTML = t.sheet
      ? '<button type="button" class="secname" data-act="sheet" aria-haspopup="dialog"><span>' + esc(t.title) + '</span>' + svg('down', 'dn') + '</button>'
      : (t.title ? '<span class="secname static">' + esc(t.title) + '</span>' : '');
    els.top.classList.toggle('large', !!t.large);
    els.step.textContent = t.step || '';
    els.prog.setAttribute('aria-valuenow', String(t.now));
    els.prog.setAttribute('aria-valuetext', t.valuetext);
    els.progFill.style.transform = 'scaleX(' + (t.frac != null ? t.frac : t.now / 23) + ')';
  }
  function watchLargeTitle(h1) {
    if (!h1 || !('IntersectionObserver' in window)) { els.top.classList.remove('large'); return; }
    var th = els.top.offsetHeight || 50;
    io = new IntersectionObserver(function (en) {
      en.forEach(function (e) { els.top.classList.toggle('large', e.isIntersecting); });
    }, { rootMargin: '-' + th + 'px 0px 0px 0px', threshold: 0 });
    io.observe(h1);
  }
  var barCfg = null;
  function setBar(b) {
    barCfg = b;
    if (!b) { els.bar.hidden = true; measure(); return; }
    els.bar.hidden = false;
    els.bar.classList.toggle('flat', !!b.flat);
    var p = b.primary;
    var html = (b.back ? '<button type="button" class="textbtn dback" id="dBack">' + svg('back') + esc(STR.back) + '</button>' : '') +
      '<div class="mid">' + (b.hint ? '<p class="kh" id="kh">' + esc(STR.hintLine) + '</p>' : '') +
      (b.preline ? '<p class="barhint">' + esc(b.preline) + '</p>' : '') + '</div>' +
      '<div class="actions"><div class="pwrap">' +
      (b.prehint ? '' : '') +
      '<button type="button" class="primary" id="' + (p.id || 'primaryBtn') + '"' + (p.disabled ? ' aria-disabled="true"' : '') + (p.describedby ? ' aria-describedby="' + p.describedby + '"' : '') + '>' + esc(p.label) + '</button>' +
      (b.prehint ? '<p class="under" id="' + b.prehintId + '">' + esc(b.prehint) + '</p>' : '') +
      (b.under !== undefined ? '<p class="under" id="' + (b.underId || 'underLine') + '"' + (b.under ? '' : ' hidden') + '>' + esc(b.under || '') + '</p>' : '') +
      '</div>' + (b.secondary ? '<div class="sec"><button type="button" class="textbtn" id="secBtn">' + esc(b.secondary.label) + '</button></div>' : '') + '</div>';
    els.barIn.innerHTML = html;
    var pb = els.barIn.querySelector('.primary');
    pb.addEventListener('click', function () { p.act(pb); });
    if (b.back) $('dBack').addEventListener('click', b.back);
    if (b.secondary) $('secBtn').addEventListener('click', b.secondary.act);
    measure();
  }
  function measure() {
    var bh = els.bar.hidden ? 0 : els.bar.offsetHeight;
    document.documentElement.style.setProperty('--bar-h', bh + 'px');
    document.documentElement.style.setProperty('--top-h', (els.top.hidden ? 0 : els.top.offsetHeight) + 'px');
  }
  function updateBarUnder() {
    if (typeof cur !== 'number') return;
    var u = $('blankLine'); if (!u) return;
    var empty = false;
    u.hidden = !empty; u.textContent = empty ? STR.blank : '';
    measure();
  }
  function updateSavedLine() { var l = $('savedLine'); if (l) l.hidden = !saveOk; }
  function updateBanners() {
    var onSection = typeof cur === 'number';
    if (!navigator.onLine && onSection) {
      els.offlineBanner.innerHTML = svg('offline') + '<span>' + esc(STR.offlineBanner) + '</span>';
      els.offlineBanner.hidden = false;
    } else els.offlineBanner.hidden = true;
    if (!saveOk && onSection) {
      els.saveBanner.innerHTML = svg('alert') + '<span>' + esc(STR.saveFailed) + '</span>';
      els.saveBanner.hidden = false;
    } else els.saveBanner.hidden = true;
  }

  /* navigation with the slide motion (build-spec 6) */
  function go(to, opt) {
    opt = opt || {};
    if (sheetOpen) closeSheet(null, true);
    flushSave();
    var from = cur;
    if (typeof to === 'number' && editFrom != null && scr(to).s.n !== editFrom) editFrom = null;
    cur = to;
    if (typeof to === 'number' || to === 'review' || to === 'consent') {
      data.cur = to;
      if (typeof to === 'number') data.curQ = keyOf(scr(to));
      if (typeof to === 'number' && data.visited.indexOf(scr(to).s.n) < 0) data.visited.push(scr(to).s.n);
      data.layout = 2;
      saveNow();
    }
    visitToasted = false;
    var r = build(to);
    var dir = from == null ? 0 : (rankOf(to) >= rankOf(from) ? 1 : -1);
    var animate = from != null && opt.animate !== false;

    var old = els.main.querySelector('.view:not(.leaving)');
    els.main.querySelectorAll('.view.leaving').forEach(function (n) { n.remove(); });
    var oldTop = old ? old.getBoundingClientRect().top : 0;

    setTop(r.top);
    els.main.classList.toggle('plain', r.plain);
    updateBanners();
    window.scrollTo(0, 0);

    if (old && animate) {
      var mainTop = els.main.getBoundingClientRect().top;
      old.classList.add('leaving');
      old.style.top = (oldTop - mainTop) + 'px';
      old.setAttribute('aria-hidden', 'true');
      old.inert = true;
      els.main.appendChild(r.el);
      var rm = reduced();
      var opts = { duration: rm ? 120 : 260, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' };
      var outK = rm ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(' + (-24 * dir) + 'px)' }];
      var inK = rm ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'translateX(' + (24 * dir) + 'px)' }, { opacity: 1, transform: 'none' }];
      if (r.el.animate) {
        var a = old.animate(outK, opts);
        r.el.animate(inK, opts);
        a.onfinish = function () { old.remove(); };
        setTimeout(function () { if (old.parentNode) old.remove(); }, 600);
      } else old.remove();
    } else {
      els.main.innerHTML = '';
      els.main.appendChild(r.el);
    }
    setBar(r.bar);
    if (r.after) r.after();
    renderSide(to, r);
    if (to === 'consent') wireConsent();
    var h1 = r.el.querySelector('h1');
    if (h1 && from != null) h1.focus({ preventScroll: true });
    if (r.live) liveSay(els.live, r.live);
    measure();
  }

  function repack(quiet) {
    if (!data || !TOKEN_OK) return;
    var before = SCREENS.map(function (x) { return x.q.length; }).join(',');
    var key = typeof cur === 'number' ? keyOf(scr(cur)) : null;
    pack();
    if (typeof data.cur === 'number' && data.curQ) data.cur = findScreen(data.curQ);
    if (quiet && before === SCREENS.map(function (x) { return x.q.length; }).join(',')) { var v0 = els.main.querySelector('.view.sec:not(.leaving)'); if (v0) fit(v0); return; }
    if (quiet && isTextLike(document.activeElement)) return;
    if (key) go(findScreen(key), { animate: false });
  }
  function renderSide(to, r) {
    var h = r.el.querySelector('h1'), flow = typeof to === 'number' || to === 'review' || to === 'consent';
    var html = wordmark();
    if (to === 'welcome') html += '<p class="who"><span class="muted">' + esc(STR.from) + '</span> <b>' + esc(STR.fromName) + '</b></p>';
    html += '<div class="sidemid"><p class="sidet" aria-hidden="true">' + esc(h ? h.textContent : '') + '</p>';
    if (typeof to === 'number' && scr(to).s.lead) html += '<p class="sidelead" aria-hidden="true">' + esc(scr(to).s.lead) + '</p>';
    html += '</div>';
    if (flow) {
      var here = typeof to === 'number' ? scr(to).s.chapter : 0;
      html += '<nav class="sidenav" aria-label="' + esc(STR.sheetTitle) + '"><ol>';
      INTAKE.chapters.forEach(function (ch) {
        var secs = SECTIONS.filter(function (x) { return x.chapter === ch.n; });
        var ca = secs.reduce(function (n, x) { return n + secCount(x); }, 0), ct = secs.reduce(function (n, x) { return n + x.q.length; }, 0);
        html += '<li><button type="button" data-ch="' + ch.n + '"' + (ch.n === here ? ' aria-current="step"' : '') + '><span class="nm">' + esc(ch.title) + '</span><span class="ct">' + esc(fmt(STR.aOfT, { a: ca, t: ct })) + '</span></button></li>';
      });
      html += '</ol></nav>';
      if (saveOk) html += '<p class="sidefoot">' + svg('check') + esc(STR.savedLabel) + '</p>';
    }
    els.side.innerHTML = html;
  }
  function sectionNext() {
    flushSave();
    var n = cur, sc = scr(n), nv = nextVis(n);
    if (editFrom === sc.s.n && (!nv || scr(nv).s.n !== sc.s.n)) { editFrom = null; go('review'); return; }
    go(nv || 'review');
  }
  function topBack() { if (els.topBack.onclick) els.topBack.onclick(); }

  /* ---------------------------------------------------------------- consent and send */
  function wireConsent() {
    var cb = $('consent'), btn = $('sendBtn'), hint = $('tickHint');
    cb.checked = false;
    cb.addEventListener('change', function () {
      consentTicked = cb.checked;
      if (cb.checked) { btn.removeAttribute('aria-disabled'); btn.removeAttribute('aria-describedby'); hint.hidden = false; hint.classList.add('keep'); }
      else { btn.setAttribute('aria-disabled', 'true'); btn.setAttribute('aria-describedby', 'tickHint'); hint.hidden = false; hint.classList.remove('keep'); }
      measure();
    });
  }
  function trySend(btn) {
    if (cur === 'consent') {
      var cb = $('consent');
      if (!cb.checked) { cb.focus(); return; }
    }
    doSend();
  }
  function guard(e) { e.preventDefault(); e.returnValue = STR.leaveWarn; return STR.leaveWarn; }
  function setSendLine(n, total) {
    var box = $('sendProg'); if (!box) return;
    box.hidden = false;
    $('sendLine').textContent = fmt(STR.sendingPhotos, { n: n, total: total });
    var tr = $('sendTrack'); if (tr) tr.querySelector('i').style.transform = 'scaleX(0)';
  }
  function doSend() {
    if (sendingNow) return;
    if (!navigator.onLine) { failCount++; go('offline'); return; }
    sendingNow = true;
    data.sending = true; saveNow();
    go('sending');
    window.addEventListener('beforeunload', guard);
    // A remove still inside its Undo window is committed now.
    if (toastState) endToast(true);
    data.F.filter(function (f) { return f.status === 'removing'; }).forEach(commitRemove);

    var wait = active ? active.promise : Promise.resolve();
    wait.then(function () {
      var all = data.F.slice();
      var pending = all.filter(function (f) { return f.status !== 'uploaded'; });
      var done = all.length - pending.length;
      var chain = Promise.resolve(true);
      pending.forEach(function (rec) {
        chain = chain.then(function (ok) {
          if (!ok) return false;
          setSendLine(done + 1, all.length);
          rec.status = 'queued';
          return uploadRec(rec).then(function (r) { if (r) done++; return r; });
        });
      });
      return chain;
    }).then(function (ok) {
      if (!ok) throw { error: linkDead ? 'unknown_link' : 'upload' };
      var sp = $('sendProg'); if (sp) sp.hidden = true;
      return api({ action: 'submit', answers: buildAnswers(), summary: buildSummary(true), answered: answeredTotal(),
        total: TOTAL, formVersion: CONFIG.FORM_VERSION, consent: true });
    }).then(function (r) {
      if (!r.ok) throw r;
      data.sentAt = new Date().toISOString(); data.sending = false; saveNow();
      data.F.forEach(function (f) { IDB.del(f.id); dropThumb(f.id); });
      endSend();
      go('thanks');
    }).catch(function (e) {
      data.sending = false; saveNow();
      failCount++;
      endSend();
      if (e && e.error === 'unknown_link') { linkDead = true; go('changed'); return; }
      go(navigator.onLine ? 'failed' : 'offline');
    });
  }
  function endSend() { sendingNow = false; window.removeEventListener('beforeunload', guard); }

  function copyAnswers() {
    var text = buildSummary(consentTicked || cur === 'offline' || cur === 'failed');
    var done = function () { toast(STR.copied, { ms: 4000 }); };
    var manual = function () {
      var slot = $('copySlot'); if (!slot) return;
      slot.className = 'copybox';
      slot.innerHTML = '<label class="sub" for="copyText">' + esc(STR.copyManual) + '</label><textarea class="field" id="copyText" readonly rows="8"></textarea>';
      var ta = $('copyText'); ta.value = text; ta.focus(); ta.select();
      try { ta.setSelectionRange(0, text.length); } catch (e) { /* fine */ }
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, manual);
    else manual();
  }
  function onLinkDead() {
    linkDead = true;
    if (!sendingNow && cur !== 'thanks') go('changed');
  }
  function retryLink() {
    getLink().then(function (r) {
      if (r.ok) { linkDead = false; if (r.firstName) data.firstName = r.firstName; setTitle(); saveNow();
        if (r.status === 'submitted') { markSent(); go('thanks'); } else { go(hasProgress() ? 'resume' : 'welcome'); pump(); flushRemovals(); } }
      else go('changed', { animate: false });
    });
  }
  function markSent() { if (!data.sentAt) { data.sentAt = new Date().toISOString(); saveNow(); } }

  /* ---------------------------------------------------------------- Sections sheet */
  var sheetOpen = false, sheetOpener = null;
  function sheetHTML() {
    var html = '<div class="grabber" aria-hidden="true"></div><div class="shead"><h2 id="sheetTitle">' + esc(STR.sheetTitle) + '</h2>' +
      '<button type="button" class="textbtn" id="sheetDone" style="padding:0 8px">' + esc(STR.done) + '</button></div><p class="sline">' + esc(STR.sheetLine) + '</p>';
    INTAKE.chapters.forEach(function (ch) {
      html += '<div class="schap"><h3>' + esc(ch.title) + '</h3><ol class="slist">';
      SECTIONS.filter(function (x) { return x.chapter === ch.n; }).forEach(function (x) {
        var a = secCount(x), here = typeof cur === 'number' && scr(cur).s.n === x.n, st;
        if (here) st = esc(STR.here);
        else if (a) st = (secComplete(x) ? svg('check') : '') + esc(fmt(STR.aOfT, { a: a, t: x.q.length }));
        else if (data.visited.indexOf(x.n) >= 0) st = esc(STR.skipped);
        else st = esc(STR.notStarted);
        html += '<li><button type="button" class="srow" data-goto="' + x.n + '"' + (here ? ' aria-current="step"' : '') + '><span class="num">' + x.n + '</span><span class="nm">' + esc(x.t) + '</span><span class="sst">' + st + '</span></button></li>';
      });
      html += '</ol></div>';
    });
    return html;
  }
  var behind = function () { return [els.top, els.banners, els.main, els.bar, els.toastWrap]; };
  function openSheet(opener) {
    flushSave();
    sheetOpener = opener; sheetOpen = true;
    els.sheet.innerHTML = sheetHTML();
    els.sheetWrap.classList.remove('closing');
    els.sheetWrap.hidden = false;
    behind().forEach(function (e) { e.inert = true; });
    var curRow = els.sheet.querySelector('[aria-current]');
    // Scroll the sheet itself (not the page behind it) so the current row is in view.
    if (curRow) els.sheet.scrollTop = Math.max(0, curRow.offsetTop - els.sheet.clientHeight / 2);
    (curRow || $('sheetDone')).focus({ preventScroll: true });
    $('sheetDone').addEventListener('click', function () { closeSheet(); });
    els.sheet.querySelectorAll('[data-goto]').forEach(function (b) {
      b.addEventListener('click', function () { var n = +b.getAttribute('data-goto'); closeSheet(n); });
    });
  }
  function closeSheet(gotoN, instant) {
    if (!sheetOpen) return;
    sheetOpen = false;
    behind().forEach(function (e) { e.inert = false; });
    var finish = function () { els.sheetWrap.hidden = true; els.sheetWrap.classList.remove('closing'); };
    if (instant || reduced()) finish(); else { els.sheetWrap.classList.add('closing'); setTimeout(finish, 200); }
    if (typeof gotoN === 'number') {
      if (typeof cur === 'number' && scr(cur).s.n === gotoN) { var h = $('h-sec'); window.scrollTo(0, 0); if (h) h.focus({ preventScroll: true }); }
      else { if (cur === 'review') editFrom = gotoN; go(SECTIONS[gotoN - 1].first); }
    } else if (sheetOpener && document.contains(sheetOpener)) sheetOpener.focus();
  }

  /* ---------------------------------------------------------------- input handling (delegated) */
  function grow(ta) { /* long-answer boxes fill the screen (CSS) and scroll inside; they no longer grow the page */ }
  function afterAnswerChange(qid) {
    saveSoon(true);
    updateBarUnder();
    var q = QMAP[qid] && QMAP[qid].q;
    if (q && q.upload && q.upload.showWhen) { var box = document.getElementById('ua-' + idOf(q.id)); if (box) box.hidden = !showUpload(q); }
  }
  function baseQid(key) { if (QMAP[key]) return key; var k = key.slice(0, -1); return QMAP[k] ? k : key; }
  function numOk(v) { var s = String(v).replace(/[,\s]/g, '').replace(/^\$/, ''); return s === '' || /^(\d+\.?\d*|\.\d+)$/.test(s); }
  function showFieldErr(input, key, msg) {
    var e = $('e-' + key);
    var box = input.closest('.nf');
    if (msg) {
      if (e) { e.innerHTML = svg('alert') + '<span>' + esc(msg) + '</span>'; e.hidden = false; }
      input.setAttribute('aria-invalid', 'true');
      var d = (input.getAttribute('aria-describedby') || '').split(' ').filter(Boolean);
      if (d.indexOf('e-' + key) < 0) d.push('e-' + key);
      input.setAttribute('aria-describedby', d.join(' '));
      if (box) box.classList.add('invalid');
    } else {
      if (e) { e.textContent = ''; e.hidden = true; }
      input.removeAttribute('aria-invalid');
      var d2 = (input.getAttribute('aria-describedby') || '').split(' ').filter(function (x) { return x && x !== 'e-' + key; });
      if (d2.length) input.setAttribute('aria-describedby', d2.join(' ')); else input.removeAttribute('aria-describedby');
      if (box) box.classList.remove('invalid');
    }
  }
  function validate(input) {
    var key = input.id.replace(/^f-/, '');
    if (input.hasAttribute('data-num')) showFieldErr(input, key, numOk(input.value) ? '' : STR.numErr);
    if (input.hasAttribute('data-date')) showFieldErr(input, key, input.value && input.value > todayISO() ? STR.dateErr : '');
  }

  function onInput(e) {
    var t = e.target, key = t.getAttribute && t.getAttribute('data-a');
    if (!key || cur == null || typeof cur !== 'number') return;
    if (t.type === 'radio' || t.type === 'checkbox') return;
    data.A[key] = t.value;
    if (t.tagName === 'TEXTAREA') grow(t);
    if (t.getAttribute('aria-invalid') === 'true') {
      var k = t.id.replace(/^f-/, '');
      if (t.hasAttribute('data-num') && numOk(t.value)) showFieldErr(t, k, '');
      if (t.hasAttribute('data-date') && !(t.value > todayISO())) showFieldErr(t, k, '');
    }
    afterAnswerChange(baseQid(key));
  }
  function onChange(e) {
    var t = e.target, key = t.getAttribute && t.getAttribute('data-a');
    if (!key) return;
    if (t.type === 'radio') {
      data.A[key] = t.hasAttribute('data-scale') ? Number(t.value) : t.value;
      afterAnswerChange(key);
    } else if (t.type === 'checkbox') {
      var list = Array.isArray(data.A[key]) ? data.A[key].slice() : [];
      var i = list.indexOf(t.value);
      if (t.checked && i < 0) list.push(t.value);
      if (!t.checked && i >= 0) list.splice(i, 1);
      data.A[key] = list;
      afterAnswerChange(key);
    } else if (t.type === 'date' || t.type === 'time') {
      data.A[key] = t.value; validate(t); afterAnswerChange(baseQid(key));
    }
  }
  // A second tap on the chosen chip (or scale point) clears it, so an answer can always be taken back.
  function markWas(input) { if (input && input.type === 'radio') input.setAttribute('data-was', input.checked ? '1' : ''); }
  function onPointerDown(e) {
    var lab = e.target.closest && e.target.closest('label[for]');
    if (lab) markWas(document.getElementById(lab.htmlFor));
    else if (e.target.type === 'radio') markWas(e.target);
  }
  function onClick(e) {
    var t = e.target;
    if (t.type === 'radio' && t.hasAttribute('data-a')) {
      if (t.getAttribute('data-was') === '1') {
        t.checked = false;
        data.A[t.getAttribute('data-a')] = '';
        afterAnswerChange(t.getAttribute('data-a'));
      }
      t.removeAttribute('data-was');
      return;
    }
    var rb = t.closest && t.closest('[data-rank]');
    if (rb) { rankTap(rb); return; }
    var act = t.closest && t.closest('[data-act]');
    if (!act) return;
    var a = act.getAttribute('data-act'), fid = act.getAttribute('data-fid'), slot = act.getAttribute('data-slot');
    if (a === 'sheet') { openSheet(act); return; }
    if (a === 'note') { var nw = act.nextElementSibling; nw.hidden = false; act.hidden = true; var nf = $(act.getAttribute('data-for')); if (nf) nf.focus(); return; }
    if (a === 'edit') { editFrom = +act.getAttribute('data-n'); go(SECTIONS[editFrom - 1].first); return; }
    if (a === 'add') { pickFiles(slot); return; }
    if (a === 'replace') { pickFiles(slot, fid); return; }
    var rec = fid && findRec(fid);
    if (!rec) return;
    if (a === 'remove') removeRec(rec);
    else if (a === 'cancel') cancelRec(rec);
    else if (a === 'retry') retryRec(rec);
  }
  function rankTap(btn) {
    var qid = btn.getAttribute('data-rank'), q = QMAP[qid].q, v = btn.getAttribute('data-v');
    var list = Array.isArray(data.A[qid]) ? data.A[qid].slice() : [];
    var msg = $('rm-' + idOf(qid)), i = list.indexOf(v);
    if (i >= 0) list.splice(i, 1);
    else if (list.length >= q.rank) { msg.textContent = STR.rankFull; return; }
    else list.push(v);
    msg.textContent = '';
    data.A[qid] = list;
    syncRanked(q);
    afterAnswerChange(qid);
  }
  function stops() {
    var v = els.main.querySelector('.view:not(.leaving)');
    if (!v) return [];
    return Array.prototype.filter.call(v.querySelectorAll('[data-stop]'), function (s) { return s.offsetParent !== null; });
  }
  function focusStop(s) {
    if (s.tagName === 'FIELDSET') {
      var c = s.querySelector('input:checked') || s.querySelector('input, button[data-rank]');
      if (c) c.focus(); return;
    }
    s.focus();
  }
  function onKeyDown(e) {
    if (e.key === 'Escape' && sheetOpen) { e.preventDefault(); closeSheet(); return; }
    if (e.key === ' ' && e.target.type === 'radio' && e.target.hasAttribute('data-a') && e.target.checked) {
      // gate 2 minor 1: Space on the chosen option takes the answer back (spec 4.10)
      e.preventDefault(); e.target.checked = false; data.A[e.target.getAttribute('data-a')] = ''; afterAnswerChange(e.target.getAttribute('data-a')); return;
    }
    if (/^Arrow/.test(e.key) && e.target.type === 'radio') els.main.querySelectorAll('[data-was]').forEach(function (x) { x.removeAttribute('data-was'); });
    if (e.key !== 'Enter' || e.isComposing || sheetOpen) return;
    if (typeof cur !== 'number') return;
    var t = e.target;
    if (e.metaKey || e.ctrlKey) { e.preventDefault(); sectionNext(); return; }
    if (!els.main.contains(t)) return;
    if (t.tagName === 'TEXTAREA' || t.tagName === 'BUTTON' || t.tagName === 'A') return;
    if (t.tagName === 'INPUT') {
      e.preventDefault();
      if (t.type !== 'radio' && t.type !== 'checkbox') validate(t);
      var list = stops(), idx = -1;
      list.forEach(function (s, i) { if (s === t || s.contains(t)) idx = i; });
      var nx = list[idx + 1];
      if (nx) focusStop(nx); else sectionNext();
    }
  }
  function onFocusIn(e) {
    var t = e.target;
    var kh = $('kh');
    if (kh && els.main.contains(t)) kh.textContent = t.tagName === 'TEXTAREA' ? (isWin() ? STR.hintAreaWin : STR.hintArea) : STR.hintLine;
    if (mq('(hover: none) and (pointer: coarse)') && isTextLike(t)) document.documentElement.classList.add('kb');
  }
  function onFocusOut(e) {
    var t = e.target;
    if (t.tagName === 'INPUT' && t.type !== 'radio' && t.type !== 'checkbox') validate(t);
    setTimeout(function () { if (!isTextLike(document.activeElement)) { document.documentElement.classList.remove('kb'); measure(); } }, 50);
  }
  function isTextLike(t) {
    if (!t) return false;
    if (t.tagName === 'TEXTAREA') return !t.readOnly;
    return t.tagName === 'INPUT' && /^(text|tel|email|search|number)$/.test(t.type);
  }
  /* drag and drop onto a slot (desktop) */
  function slotFromEvent(e) { var s = e.target.closest && e.target.closest('[data-slot]'); return s; }
  function onDragOver(e) {
    var s = slotFromEvent(e); if (!s || !e.dataTransfer || Array.prototype.indexOf.call(e.dataTransfer.types || [], 'Files') < 0) return;
    e.preventDefault(); var t = s.querySelector('.add, .addrow'); if (t) t.classList.add('drag');
  }
  function onDragLeave(e) { var s = slotFromEvent(e); if (s) s.querySelectorAll('.drag').forEach(function (x) { x.classList.remove('drag'); }); }
  function onDrop(e) {
    var s = slotFromEvent(e); if (!s || !e.dataTransfer || !e.dataTransfer.files.length) return;
    e.preventDefault(); onDragLeave(e);
    var slotId = s.getAttribute('data-slot');
    var info = slotInfo(slotId), existing = liveFiles(slotId);
    addFiles(slotId, e.dataTransfer.files, isTileUpload(info.q) && existing.length ? existing[existing.length - 1].id : null);
  }

  /* ---------------------------------------------------------------- online, offline, lifecycle */
  function onOnline() {
    updateBanners();
    if (typeof cur === 'number') toast(STR.backOnline, { ms: 2000 });
    if (typeof cur === 'number') scr(cur).q.forEach(function (q) { if (q.upload) refreshUpload(q.id); });
    pump(); flushRemovals();
  }
  function onOffline() {
    updateBanners();
    if (typeof cur === 'number') scr(cur).q.forEach(function (q) { if (q.upload) refreshUpload(q.id); });
  }

  /* ---------------------------------------------------------------- start */
  function init() {
    document.addEventListener('keydown', onKeyDown);
    els.main.addEventListener('input', onInput);
    els.main.addEventListener('change', onChange);
    els.main.addEventListener('click', onClick);
    els.main.addEventListener('pointerdown', onPointerDown);
    els.main.addEventListener('dragover', onDragOver);
    els.main.addEventListener('dragleave', onDragLeave);
    els.main.addEventListener('drop', onDrop);
    els.top.addEventListener('click', function (e) { var a = e.target.closest('[data-act="sheet"]'); if (a) openSheet(a); });
    els.scrim.addEventListener('click', function () { closeSheet(); });
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('pagehide', flushSave);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flushSave(); });
    window.addEventListener('resize', measure);
    var rpT = null, lastW = window.innerWidth, lastH = window.innerHeight;
    window.addEventListener('resize', function () {
      clearTimeout(rpT);
      rpT = setTimeout(function () {
        if (window.innerWidth === lastW && Math.abs(window.innerHeight - lastH) < 40) return;
        if (isTextLike(document.activeElement)) return;   // the phone keyboard is up
        lastW = window.innerWidth; lastH = window.innerHeight; repack();
      }, 180);
    });
    els.side.addEventListener('click', function (e) {
      var b = e.target.closest('[data-ch]'); if (!b) return;
      var sec = SECTIONS.filter(function (x) { return x.chapter === +b.getAttribute('data-ch'); })[0];
      if (sec) go(sec.first);
    });
    if (window.ResizeObserver) { var ro = new ResizeObserver(measure); ro.observe(els.bar); ro.observe(els.top); }

    if (!TOKEN_OK) { data = blankData(); go('bad'); return; }

    data = Object.assign(blankData(), loadLocal() || {});
    pack();
    if (typeof data.cur === 'number') {
      if (!data.curQ) { var inc = SECTIONS.filter(function (x) { return !secComplete(x); })[0]; data.curQ = (inc || SECTIONS[0]).q[0].id; }
      data.cur = findScreen(data.curQ);
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { repack(true); });
    if (!/^[A-Za-z0-9_-]{8,64}$/.test(data.submissionKey || '')) data.submissionKey = makeKey();
    if (!Array.isArray(data.R)) data.R = [];
    // Tidy the file queue after a reload: anything mid-upload goes back in the queue; a remove inside its Undo window commits.
    data.F.forEach(function (f) { if (f.status === 'uploading') f.status = 'queued'; });
    data.F.filter(function (f) { return f.status === 'removing'; }).forEach(commitRemove);
    setTitle();

    var hadLocal = !!loadLocal();
    if (data.sentAt) go('thanks');
    else if (data.sending) { go('sending'); }
    else if (hadLocal && hasProgress()) go('resume');
    else go('loading');

    getLink().then(function (r) {
      if (r.ok) {
        if (r.firstName && r.firstName !== data.firstName) {
          data.firstName = r.firstName; setTitle();
          if (cur === 'welcome' || cur === 'resume' || cur === 'thanks') {
            var h = els.main.querySelector('.view:not(.leaving) h1');
            if (h) h.textContent = cur === 'thanks' ? fmt(STR.thanksH, { first: data.firstName })
              : cur === 'resume' ? fmt(STR.resumeH, { first: data.firstName }) : fmt(STR.welcomeH, { first: data.firstName });
          }
        }
        if (hadLocal || hasProgress()) saveNow();
        if (r.status === 'submitted') { markSent(); if (cur !== 'thanks') go('thanks', { animate: false }); return; }
        if (data.sentAt) return;
        if (data.sending) { doSend(); return; }   // the tab was closed mid-send: carry on with the same key
        if (cur === 'loading') go(hasProgress() ? 'resume' : 'welcome', { animate: false });
        pump(); flushRemovals();
        return;
      }
      if (r.error === 'unknown_link') {
        if (data.sentAt) return;
        linkDead = true;
        data.sending = false;
        go(hasProgress() ? 'changed' : 'bad', { animate: false });
        return;
      }
      // Couldn't reach the server: carry on with what's on the device; uploads wait, Send checks again.
      if (data.sending) { data.sending = false; saveNow(); failCount++; go(navigator.onLine ? 'failed' : 'offline', { animate: false }); return; }
      if (cur === 'loading') go(hasProgress() ? 'resume' : 'welcome', { animate: false });
    });
  }
  init();
})();
