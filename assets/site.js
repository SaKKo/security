// Shared helpers for every page
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const store = {
  get(k, d) { try { const v = localStorage.getItem("websec:" + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem("websec:" + k, JSON.stringify(v)); } catch (e) {} }
};
const reduceMotion = (() => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } })();
const TH = document.documentElement.lang === "th";
const L = TH ? { play: "▶ เล่น", stop: "❚❚ หยุดชั่วคราว", restart: "↺ เริ่มใหม่", pause: "❚❚ หยุด", step: "ทีละขั้น ⏭", all: "แสดงทั้งหมด", hint: "กดเล่นเพื่อดูแอนิเมชันทีละข้อความ หรือกดทีละขั้น", steps: "ขั้น", flow: "ลำดับเหตุการณ์", copy: "คัดลอก", copied: "คัดลอกแล้ว", sel: "เลือก + ⌘C", prev: "◀ ก่อนหน้า", next: "ถัดไป ▶", stepn: "ขั้นที่", only: " (มีภาษาเดียว)", read: "[x] อ่านแล้ว" }
  : { play: "▶ play", stop: "❚❚ pause", restart: "↺ restart", pause: "❚❚ pause", step: "step ⏭", all: "show all", hint: "Press play to animate this flow one message at a time, or step through it.", steps: "steps", flow: "animated flow", copy: "copy", copied: "copied", sel: "select + ⌘C", prev: "◀ prev", next: "next ▶", stepn: "step", only: " (only)", read: "[x] read" };
// remember language choice; root EN index redirects to Thai if chosen before
document.addEventListener("click", e => { const a = e.target.closest && e.target.closest("[data-setlang]"); if (a) store.set("uilang", a.dataset.setlang); });
if (!TH && document.body.dataset.slug === "index" && store.get("uilang", "en") === "th" && !location.hash) location.replace("th/index.html");
const LANG_LABEL = { rails: "ruby · rails", node: "javascript · node" };

// code language switcher: rails (default) / node, falls back per block
function setLang(l) {
  document.documentElement.dataset.lang = l;
  $$(".langsw button").forEach(b => b.setAttribute("aria-pressed", b.dataset.l === l));
  $$(".code").forEach(c => {
    const pres = $$("pre[data-lang]", c); if (!pres.length) return;
    const pick = pres.find(p => p.dataset.lang === l) || pres[0];
    pres.forEach(p => p.classList.toggle("show", p === pick));
    const lbl = $(".lbl", c); if (lbl) lbl.textContent = LANG_LABEL[pick.dataset.lang] + (pick.dataset.lang !== l ? L.only : "");
  });
  store.set("lang2", l);
}

/* ---------- syntax highlighting: ruby, javascript, bash ----------
   Only bare text inside <pre> is tokenized. Hand-written spans (.c comment, .bad, .ok)
   keep their colour, so the red "vulnerable" lines stay red. */
const HL = (() => {
  const words = s => new Set(s.split(" "));
  const KW = {
    ruby: words("alias and begin break case class def defined? do else elsif end ensure for if in module next not or redo rescue retry return super then undef unless until when while yield require require_relative include extend prepend private protected public attr_accessor attr_reader attr_writer raise loop lambda proc"),
    js: words("as async await break case catch class const continue debugger default delete do else export extends finally for from function if import in instanceof let new of return static super switch throw try typeof var void while with yield require module exports"),
    bash: words("if then else elif fi for while until do done case esac in function select time")
  };
  const LIT = { ruby: words("true false nil self __FILE__"), js: words("true false null undefined NaN Infinity this") };
  const span = (cls, s) => cls ? `<span class="${cls}">${esc(s)}</span>` : esc(s);
  // index just past the bracket that closes the one at src[i]
  function closeOf(src, i, open, close) {
    for (let d = 0; i < src.length; i++) { if (src[i] === "\\") { i++; continue; } if (src[i] === open) d++; else if (src[i] === close && --d === 0) return i + 1; }
    return src.length;
  }
  // quoted string from src[i]; interpolation (#{…} or ${…}) is highlighted as code inside it
  function str(src, i, q, interp, lang) {
    let out = "", buf = q, j = i + 1;
    for (; j < src.length; j++) {
      const c = src[j];
      if (c === "\\") { buf += src.slice(j, j + 2); j++; continue; }
      if (c === "\n" && q !== "`") break;
      if (interp && c === interp && src[j + 1] === "{") {
        const end = closeOf(src, j + 1, "{", "}");
        out += span("hs", buf) + span("hk", interp + "{") + tok(src.slice(j + 2, end - 1), lang) + span("hk", "}");
        buf = ""; j = end - 1; continue;
      }
      buf += c;
      if (c === q) { j++; break; }
    }
    return [out + span("hs", buf), j];
  }
  const PAIR = { "(": ")", "[": "]", "{": "}", "<": ">" };
  function tok(src, lang, st = { cmd: true }) {
    let out = "", i = 0, plain = "";
    const flush = () => { out += esc(plain); plain = ""; };
    const emit = (cls, s) => { flush(); out += span(cls, s); i += s.length; };
    const at = re => { re.lastIndex = i; const m = re.exec(src); return m && m[0]; };
    const before = () => src.slice(Math.max(0, i - 24), i);
    // "/" starts a regex literal unless it follows a value (then it is division)
    const regexOK = () => { const b = before().trimEnd(); return !/[\w)\]}"'`<]$/.test(b) || /\b(return|typeof|when|if|unless|and|or|not)$/.test(b); };
    while (i < src.length) {
      const c = src[i]; let m;
      if (lang === "bash") {
        if (c === "\n") { plain += c; i++; st.cmd = true; continue; }
        if (c === " " || c === "\t") { plain += c; i++; continue; }
        if (c === "#" && (i === 0 || /\s/.test(src[i - 1]))) { emit("c", at(/#.*/y)); continue; }
        if (st.cmd && (m = at(/\$ (?=\S)/y)) && (i === 0 || src[i - 1] === "\n")) { emit("c", m); continue; }
        if (c === "'") { emit("hs", at(/'[^']*'?/y)); st.cmd = false; continue; }
        if (c === '"') { emit("hs", at(/"(?:\\.|[^"\\])*"?/y)); st.cmd = false; continue; }
        if ((m = at(/\$\(/y))) { emit("hk", m); (st.sub = st.sub || []).push(st.cmd); st.cmd = true; continue; }
        if (c === ")" && st.sub && st.sub.length) { emit("hk", c); st.cmd = st.sub.pop(); continue; }
        if ((m = at(/\$(?:\{[^}]*\}|\w+|[?#@*!$])/y))) { emit("hv", m); st.cmd = false; continue; }
        if ((m = at(/&&|\|\||[|;&]/y))) { emit("hk", m); st.cmd = true; continue; }
        if ((m = at(/\d*>>?(?:&\d)?|</y))) { emit("hk", m); continue; }
        if ((m = at(/\\(?=\n)/y))) { emit("hk", m); continue; }
        if ((m = at(/[^\s|;&<>"'$()]+/y))) {
          // FOO=bar before a command is an env assignment; the command comes after it
          const env = st.cmd && at(/[A-Za-z_]\w*=(?:"[^"]*"|'[^']*'|[^\s|;&$()"']*)/y);
          if (env) { emit("hv", env); continue; }
          if (st.cmd) { emit(KW.bash.has(m) ? "hk" : "hf", m); st.cmd = KW.bash.has(m) || m === "sudo" || m === "env" || m === "time"; }
          else if (m[0] === "-") emit("ho", m);
          else { plain += m; i += m.length; }
          continue;
        }
        plain += c; i++; continue;
      }
      // ruby / js
      if (lang === "ruby") {
        if ((m = at(/<%#[\s\S]*?%>/y))) { emit("c", m); continue; }
        if ((m = at(/<%[=-]?|-?%>/y))) { emit("hk", m); continue; }
        if (c === "#") { emit("c", at(/#.*/y)); continue; }
        if (c === '"' || c === "`" || c === "'") { flush(); const [h, j] = str(src, i, c, c === "'" ? null : "#", lang); out += h; i = j; continue; }
        if ((m = at(/%[wWiIqQr]?[[({<]/y))) { const o = m[m.length - 1], end = closeOf(src, i + m.length - 1, o, PAIR[o]); emit("hs", src.slice(i, end) + (at(/[imx]*/y) || "")); continue; }
        if (c === ":" && src[i + 1] !== ":" && !/[\w:]/.test(src[i - 1] || "") && (m = at(/:(?:[A-Za-z_]\w*[?!=]?|"[^"]*")/y))) { emit("hn", m); continue; }
        if ((m = at(/[A-Za-z_]\w*[?!]?:(?![:\w])/y)) && !/[\w@$]/.test(src[i - 1] || "")) { emit("hn", m); continue; }
        if ((m = at(/@@?\w+|\$\w+/y))) { emit("hv", m); continue; }
      } else {
        if ((m = at(/\/\/.*|\/\*[\s\S]*?(?:\*\/|$)/y))) { emit("c", m); continue; }
        if (c === "`" || c === '"' || c === "'") { flush(); const [h, j] = str(src, i, c, c === "`" ? "$" : null, lang); out += h; i = j; continue; }
      }
      if (c === "/" && regexOK() && (m = at(/\/(?![*\/\s])(?:\\.|\[(?:\\.|[^\]\\\n])*\]|[^\/\\\n])+\/[a-z]*/y))) { emit("hs", m); continue; }
      if ((m = at(/\d[\d_]*(?:\.\d+)?(?:e[+-]?\d+)?/iy)) && !/\w/.test(src[i - 1] || "")) { emit("hn", m); continue; }
      if ((m = at(/[A-Za-z_$][\w$]*[?!]?/y))) {
        if (lang === "js" && /[?!]$/.test(m)) m = m.slice(0, -1);
        if (!/[\w$]/.test(src[i - 1] || "")) {
          if (src[i - 1] !== "." && KW[lang].has(m)) { emit("hk", m); continue; }
          if (LIT[lang].has(m)) { emit("hn", m); continue; }
          if (/^[A-Z]/.test(m)) { emit("ht", m); continue; }
          if (/\b(def|function)\s+(self\.)?$/.test(before()) || src[i + m.length] === "(") { emit("hf", m); continue; }
        }
        plain += m; i += m.length; continue;
      }
      plain += c; i++;
    }
    flush();
    return out;
  }
  function langOf(pre) {
    const box = pre.closest(".code"); if (!box) return null;
    const l = pre.dataset.lang || (box.dataset.label || "").split(/\s/)[0];
    return { rails: "ruby", ruby: "ruby", node: "js", js: "js", javascript: "js", shell: "bash", bash: "bash", sh: "bash" }[l] || null;
  }
  function pre(el) {
    const lang = langOf(el); if (!lang) return;
    const st = { cmd: true };
    Array.from(el.childNodes).forEach(n => {
      if (n.nodeType !== 3) { st.cmd = /\n$/.test(n.textContent); return; }
      const t = document.createElement("template"); t.innerHTML = tok(n.textContent, lang, st);
      n.replaceWith(t.content);
    });
  }
  return { tok, pre };
})();
$$(".code pre").forEach(HL.pre);

// code labels + copy buttons
$$(".code").forEach(c => {
  const lbl = document.createElement("span"); lbl.className = "lbl";
  if (!c.querySelector("pre[data-lang]")) lbl.textContent = c.dataset.label || "text";
  c.appendChild(lbl);
  const btn = document.createElement("button"); btn.className = "btn copy"; btn.type = "button"; btn.textContent = L.copy;
  btn.addEventListener("click", async () => {
    const pres = $$("pre", c).filter(p => getComputedStyle(p).display !== "none");
    try { await navigator.clipboard.writeText(pres.map(p => p.innerText).join("\n")); btn.textContent = L.copied; }
    catch (e) { btn.textContent = L.sel; }
    setTimeout(() => btn.textContent = L.copy, 1500);
  });
  c.appendChild(btn);
});
$$(".langsw button").forEach(b => b.addEventListener("click", () => setLang(b.dataset.l)));
setLang(LANG_LABEL[store.get("lang2", "rails")] ? store.get("lang2", "rails") : "rails");

// tabs
$$(".tabs").forEach((t, ti) => {
  const tabs = $$(":scope > [role=tablist] > [role=tab]", t), panels = $$(":scope > [role=tabpanel]", t);
  tabs.forEach((b, i) => {
    b.id = b.id || `tab-${ti}-${i}`; b.type = "button";
    panels[i].setAttribute("aria-labelledby", b.id);
    b.addEventListener("click", () => tabs.forEach((x, j) => { x.setAttribute("aria-selected", i === j); panels[j].hidden = i !== j; }));
  });
  tabs.forEach((x, j) => { x.setAttribute("aria-selected", j === 0); panels[j].hidden = j !== 0; });
});

// step-through walkthroughs
$$(".steps").forEach(s => {
  const steps = $$(".step", s); let i = 0;
  const nav = document.createElement("div"); nav.className = "nav";
  nav.innerHTML = `<button class="btn" type="button">${L.prev}</button><button class="btn" type="button">${L.next}</button><span></span>`;
  s.appendChild(nav);
  const [p, n, lab] = nav.children;
  const show = () => { steps.forEach((x, j) => x.classList.toggle("cur", j === i)); lab.textContent = `${L.stepn} ${i + 1}/${steps.length}`; p.disabled = i === 0; n.disabled = i === steps.length - 1; };
  p.onclick = () => { if (i > 0) { i--; show(); } };
  n.onclick = () => { if (i < steps.length - 1) { i++; show(); } };
  show();
});

/* ---------- animated sequence diagrams ----------
   <div class="anim" data-title="…" data-actors="Browser|Attacker|Server">
     (JSON script child) [{"f":0,"t":2,"l":"label","k":"n|a|b|k","c":"caption"}, {"n":1,"l":"note on actor 1","k":"a","c":"…"}]
   </div>
   k: n normal, a attack, b blocked (ends in ✗), k key/secret. "n" = note box on that actor. */
const SVGNS = "http://www.w3.org/2000/svg";
function svgEl(tag, attrs, parent) { const e = document.createElementNS(SVGNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
$$(".anim").forEach(box => {
  const actors = box.dataset.actors.split("|"), steps = JSON.parse(box.querySelector("script").textContent);
  const W = 720, top = 44, rowH = 38, H = top + 18 + steps.length * rowH + 10;
  const xs = actors.map((_, i) => 60 + i * ((W - 120) / Math.max(actors.length - 1, 1)));
  box.insertAdjacentHTML("afterbegin", `<header><b>${esc(box.dataset.title || L.flow)} <span class="n">· ${steps.length} ${L.steps}</span></b><span class="ctl"><button class="btn play" type="button" data-a="play">${L.play}</button><button class="btn stop" type="button" data-a="stop">${L.stop}</button><button class="btn" type="button" data-a="restart">${L.restart}</button><button class="btn" type="button" data-a="step">${L.step}</button></span></header><div class="stage"></div><div class="ctrl"><div class="cap">${L.hint}</div></div>`);
  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": box.dataset.title || "sequence diagram" }, $(".stage", box));
  actors.forEach((a, i) => {
    svgEl("line", { class: "life", x1: xs[i], y1: top, x2: xs[i], y2: H - 6 }, svg);
    const w = Math.max(90, a.length * 8 + 16);
    svgEl("rect", { class: "actor-box", x: xs[i] - w / 2, y: 6, width: w, height: 28 }, svg);
    svgEl("text", { class: "actor-txt", x: xs[i], y: 25 }, svg).textContent = a;
  });
  const groups = steps.map((s, i) => {
    const y = top + 26 + i * rowH, g = svgEl("g", { class: "step-g" }, svg);
    svgEl("text", { class: "num", x: 18, y: y + 4 }, g).textContent = i + 1;
    if (s.n !== undefined) {
      const x = xs[s.n], w = Math.min(Math.max(120, s.l.length * 7.2 + 16), 300);
      const cx = Math.min(Math.max(x, w / 2 + 24), W - w / 2 - 4);
      const ng = svgEl("g", { class: "note " + (s.k || "") }, g);
      svgEl("rect", { x: cx - w / 2, y: y - 13, width: w, height: 24, rx: 2 }, ng);
      svgEl("text", { x: cx, y: y + 4 }, ng).textContent = s.l;
      s._from = s._to = cx; s._y = y;
    } else {
      const x1 = xs[s.f], x2 = xs[s.t], dir = x2 > x1 ? 1 : -1, k = s.k || "n";
      const mg = svgEl("g", { class: "msg " + k }, g);
      const end = k === "b" ? x1 + (x2 - x1) * 0.62 : x2 - dir * 6;
      svgEl("line", { x1, y1: y, x2: end, y2: y }, mg);
      if (k === "b") { svgEl("text", { class: "x", x: end + dir * 8, y: y + 6 }, mg).textContent = "✗"; }
      else svgEl("path", { class: "hd", d: `M${x2 - dir * 2},${y} l${-dir * 9},-5 l0,10 z` }, mg);
      svgEl("text", { x: (x1 + x2) / 2, y: y - 7 }, mg).textContent = s.l;
      s._from = x1; s._to = end; s._y = y;
    }
    return g;
  });
  const cap = $(".cap", box); let i = -1, timer = null;
  const caption = n => { const s = steps[n]; cap.innerHTML = `<b>${n + 1}/${steps.length}</b> ${s.c || esc(s.l)}`; };
  function show(n) {
    box.classList.add("playing");
    groups.forEach((g, j) => { g.classList.toggle("on", j <= n); g.classList.toggle("cur", j === n); });
    caption(n);
    const s = steps[n];
    if (!reduceMotion && s._from !== s._to && svg.animate) {
      const p = svgEl("circle", { class: "pkt" + (s.k === "a" || s.k === "b" ? " a" : ""), r: 5, cx: s._from, cy: s._y }, svg);
      const an = p.animate([{ transform: "translateX(0)" }, { transform: `translateX(${s._to - s._from}px)` }], { duration: 650, easing: "ease-in-out", fill: "forwards" });
      an.onfinish = () => setTimeout(() => p.remove(), 150);
    }
  }
  // autoplay while visible; after the last step hold 2 s, then start over
  let auto = !reduceMotion, visible = false, hold = null;
  const playing = on => box.classList.toggle("is-playing", on);
  function halt() { clearInterval(timer); timer = null; clearTimeout(hold); hold = null; playing(false); }
  function rewind() { i = -1; box.classList.remove("playing"); groups.forEach(g => g.classList.remove("on", "cur")); cap.textContent = L.hint; }
  function play() {
    halt(); if (i >= steps.length - 1) rewind();
    playing(true);
    const tick = () => {
      i++; show(i);
      if (i >= steps.length - 1) {
        clearInterval(timer); timer = null;
        hold = setTimeout(() => { hold = null; rewind(); if (auto && visible) play(); else playing(false); }, 2000);
      }
    };
    tick(); timer = setInterval(tick, reduceMotion ? 1600 : 1900);
  }
  $("[data-a=play]", box).onclick = () => { auto = true; play(); };
  $("[data-a=stop]", box).onclick = () => { auto = false; halt(); };
  $("[data-a=restart]", box).onclick = () => { auto = true; halt(); rewind(); play(); };
  $("[data-a=step]", box).onclick = () => { auto = false; halt(); i = i >= steps.length - 1 ? 0 : i + 1; show(i); };
  if ("IntersectionObserver" in window) new IntersectionObserver(es => es.forEach(e => {
    visible = e.isIntersecting;
    if (visible && auto && !timer && !hold) play();
    if (!visible && (timer || hold)) halt();
  }), { threshold: 0.35 }).observe(box);
});

// "mark as read" progress
(() => {
  const m = $(".readmark input"); if (!m) return;
  const key = "read:" + document.body.dataset.slug;
  m.checked = store.get(key, false);
  m.addEventListener("change", () => store.set(key, m.checked));
})();
$$(".card[data-slug]").forEach(c => {
  if (store.get("read:" + c.dataset.slug, false)) { c.classList.add("read"); const st = $(".st", c); if (st) st.textContent = L.read; }
});

// sticky header: expose its height for anchor offsets; on the one-row mobile nav, bring the current page into view
(() => {
  const hdr = $(".hdr"); if (!hdr) return;
  const setH = () => document.documentElement.style.setProperty("--hdr-h", hdr.offsetHeight + "px");
  setH();
  if ("ResizeObserver" in window) new ResizeObserver(setH).observe(hdr); else addEventListener("resize", setH);
  const nav = $("nav.top", hdr), cur = nav && $("[aria-current=page]", nav);
  if (cur && nav.scrollWidth > nav.clientWidth) nav.scrollLeft = cur.offsetLeft - nav.offsetLeft - (nav.clientWidth - cur.offsetWidth) / 2;
})();
