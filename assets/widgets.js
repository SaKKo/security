// ---------- rails track widgets ----------
const RT = TH
  ? { play: "▶ เล่น", stop: "❚❚ หยุดชั่วคราว", restart: "↺ เริ่มใหม่", step: "ทีละคำสั่ง ⏭", hint: "เล่นอัตโนมัติเมื่อเลื่อนมาถึง กดหยุดชั่วคราวได้ทุกเมื่อ หรือกดทีละคำสั่ง", right: "ถูก", wrong: "ยังไม่ใช่", score: "คะแนน", notrun: "ไม่ได้รัน", skipped: "ข้าม", response: "response" }
  : { play: "▶ play", stop: "❚❚ pause", restart: "↺ restart", step: "step ⏭", hint: "Plays automatically when you scroll here. Pause any time, or step through it.", right: "right", wrong: "not quite", score: "score", notrun: "not run", skipped: "skipped", response: "response" };
const wait = ms => new Promise(r => setTimeout(r, reduceMotion ? 0 : ms));
const jsonOf = el => JSON.parse($(":scope > script[type='application/json']", el).textContent);

// terminal player
function colorize(t) {
  const e = esc(t);
  let m;
  if ((m = /^(\s*)(create|identical|insert|route|append|prepend)(\s.*)?$/.exec(t))) return `${m[1]}<span class="g">${m[2]}</span>${esc(m[3] || "")}`;
  if ((m = /^(\s*)(remove|delete|conflict|force)(\s.*)?$/.exec(t))) return `${m[1]}<span class="r">${m[2]}</span>${esc(m[3] || "")}`;
  if (/^\s*(invoke|exist|skip)\b/.test(t)) return `<span class="d">${e}</span>`;
  if (/^\s*#/.test(t)) return `<span class="d">${e}</span>`;
  if (/^==/.test(t)) return `<span class="k">${e}</span>`;
  if (/^\s*(=>|->)/.test(t)) return `<span class="w">${e}</span>`;
  if (/\b0 failures, 0 errors\b/.test(t)) return `<span class="g">${e}</span>`;
  if (/(Error|FAIL|Failure:|failures?, [1-9]|ROLLBACK)/.test(t)) return `<span class="r">${e}</span>`;
  if (/^\s*(TRANSACTION|BEGIN|COMMIT|\w+ (Load|Create|Update|Exists|Count|Pluck)\b)/.test(t)) return `<span class="k">${e}</span>`;
  if (/^\s*up\s/.test(t)) return t.replace(/up/, '<span class="g">up</span>');
  if (/^\s*down\s/.test(t)) return t.replace(/down/, '<span class="r">down</span>');
  return e;
}
$$(".term").forEach(box => {
  const steps = jsonOf(box);
  box.insertAdjacentHTML("beforeend", `<header><span class="dots"><i></i><i></i><i></i></span><b>${esc(box.dataset.title || "zsh")}</b><span class="ctl"><button class="btn play" type="button" data-a="play">${RT.play}</button><button class="btn stop" type="button" data-a="stop">${RT.stop}</button><button class="btn" type="button" data-a="restart">${RT.restart}</button><button class="btn" type="button" data-a="step">${RT.step}</button></span></header><pre class="screen"></pre><div class="tcap">${RT.hint}</div>`);
  const scr = $(".screen", box), cap = $(".tcap", box);
  let i = 0, gen = 0, busy = false, looping = false, visible = false, auto = !reduceMotion;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  async function playStep(s, g) {
    const added = [], add = el => { scr.appendChild(el); added.push(el); }, cancel = () => { added.forEach(el => el.remove()); return false; };
    const ln = document.createElement("div"); ln.className = "tl-cmd";
    ln.innerHTML = `<span class="pr">${esc(s.p || box.dataset.prompt || "~/myapp %")}</span> <span class="cm"></span><span class="cursor"></span>`;
    add(ln);
    const cm = $(".cm", ln);
    if (reduceMotion) cm.textContent = s.c;
    else for (const ch of s.c) { if (g !== gen) return cancel(); cm.textContent += ch; await wait(16); }
    $(".cursor", ln).remove();
    // console prompts ("myapp(dev)>") take Ruby, shell prompts ("~/myapp %") take bash
    if (s.c) cm.innerHTML = HL.tok(s.c, /[>]\s*$/.test(s.p || "") ? "ruby" : "bash");
    await wait(220);
    if (s.o !== undefined) for (const line of s.o.split("\n")) {
      if (g !== gen) return cancel();
      const d = document.createElement("div"); d.innerHTML = colorize(line) || " "; add(d);
      scr.scrollTop = scr.scrollHeight; await wait(26);
    }
    if (g !== gen) return cancel();
    cap.innerHTML = s.n || ""; scr.scrollTop = scr.scrollHeight;
    return true;
  }
  async function next() {
    if (busy || i >= steps.length) return false;
    busy = true; const g = gen;
    const ok = await playStep(steps[i], g);
    if (g !== gen) return false;
    busy = false; if (ok) i++;
    return ok;
  }
  function clear() { i = 0; scr.textContent = ""; cap.textContent = RT.hint; }
  function pause() { gen++; busy = false; looping = false; box.classList.remove("is-playing"); }
  // autoplay while visible; after the last command hold 2 s, then start over
  async function loop() {
    if (looping) return;
    looping = true; box.classList.add("is-playing");
    const g = gen;
    while (g === gen) {
      if (i >= steps.length) { await sleep(2000); if (g !== gen) break; clear(); }
      if (!(await next())) break;
      await wait(650);
    }
    if (g === gen) pause();
  }
  $("[data-a=play]", box).onclick = () => { auto = true; if (i >= steps.length && !looping) clear(); loop(); };
  $("[data-a=stop]", box).onclick = () => { auto = false; pause(); };
  $("[data-a=restart]", box).onclick = () => { auto = true; pause(); clear(); loop(); };
  $("[data-a=step]", box).onclick = () => { auto = false; pause(); if (i >= steps.length) clear(); next(); };
  if ("IntersectionObserver" in window) new IntersectionObserver(es => es.forEach(e => {
    visible = e.isIntersecting;
    if (visible && auto && !looping) loop();
    if (!visible && looping) pause();
  }), { threshold: 0.35 }).observe(box);
});

// quizzes
$$(".quiz").forEach(q => {
  const bs = $$(".opts button", q), a = +q.dataset.a;
  bs.forEach((b, j) => b.addEventListener("click", () => {
    if (q.classList.contains("done")) return;
    q.classList.add("done"); b.classList.add(j === a ? "right" : "wrong"); bs[a].classList.add("right");
  }));
});

// list -> explanation picker (folder tour etc.)
$$(".pick").forEach(p => {
  const items = jsonOf(p);
  p.insertAdjacentHTML("afterbegin", `<div class="lst">${items.map((it, j) => `<button type="button" class="${it.dir ? "dir" : ""}" data-j="${j}">${esc(it.k)}</button>`).join("")}</div><div class="out"></div>`);
  const out = $(".out", p), bs = $$(".lst button", p);
  const show = j => { bs.forEach((b, x) => b.setAttribute("aria-pressed", x === j)); out.innerHTML = items[j].d; };
  bs.forEach((b, j) => b.addEventListener("click", () => show(j)));
  show(0);
});

// sorter (where does this code go?)
$$(".sorter").forEach(s => {
  const d = jsonOf(s); let got = 0, done = 0;
  s.insertAdjacentHTML("afterbegin", d.items.map((it, j) => `<div class="item" data-j="${j}"><p>${it.t}</p><div class="row">${d.buckets.map(b => `<button class="btn" type="button" data-b="${b.id}">${esc(b.label)}</button>`).join("")}</div><p class="why"></p></div>`).join("") + `<div class="score"></div>`);
  const score = $(".score", s);
  $$(".item", s).forEach(el => {
    const it = d.items[+el.dataset.j];
    $$("button", el).forEach(b => b.addEventListener("click", () => {
      if (el.classList.contains("done")) return;
      el.classList.add("done"); done++;
      const ok = b.dataset.b === it.a; if (ok) got++;
      b.classList.add(ok ? "right" : "wrong");
      $(`button[data-b="${it.a}"]`, el).classList.add("right");
      $(".why", el).innerHTML = `<b>${ok ? RT.right : RT.wrong}.</b> ${it.why}`;
      score.textContent = `${RT.score}: ${got}/${done} (${d.items.length})`;
    }));
  });
});

// model callback explorer
$$(".cbx").forEach(w => {
  const d = jsonOf(w); let op = d.ops[0].id, sc = "ok", run = 0;
  w.insertAdjacentHTML("afterbegin", `<div class="sel-row"><span class="lab">${esc(d.l_op)}</span>${d.ops.map(o => `<button class="btn" type="button" data-op="${o.id}">${esc(o.label)}</button>`).join("")}</div><div class="sel-row"><span class="lab">${esc(d.l_sc)}</span>${d.scen.map(o => `<button class="btn" type="button" data-sc="${o.id}">${esc(o.label)}</button>`).join("")}</div><div class="hint">${d.ops[0].hint || ""}</div><ol class="cbl"></ol><div class="res"></div>`);
  const ol = $(".cbl", w), res = $(".res", w), hint = $(".hint", w);
  async function render() {
    const r = ++run, key = op + "|" + sc, seq = d.seq[key] || d.seq[op + "|ok"];
    $$("[data-op]", w).forEach(b => b.classList.toggle("on", b.dataset.op === op));
    $$("[data-sc]", w).forEach(b => { b.classList.toggle("on", b.dataset.sc === sc); b.disabled = !d.seq[op + "|" + b.dataset.sc]; });
    hint.innerHTML = d.ops.find(o => o.id === op).hint || "";
    ol.innerHTML = seq.steps.map((s, j) => `<li class="${s.k || "cb"}"><span class="no">${j + 1}</span><code>${esc(s.h)}</code><span class="ex">${s.x || d.ex[s.h] || ""}</span></li>`).join("");
    res.innerHTML = "";
    for (const li of $$("li", ol)) { if (r !== run) return; li.classList.add("in"); await wait(110); }
    if (r === run) res.innerHTML = `<span class="st${seq.bad ? " bad" : ""}">${esc(seq.ret)}</span>`;
  }
  w.addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b || b.disabled) return;
    if (b.dataset.op) { op = b.dataset.op; if (!d.seq[op + "|" + sc]) sc = "ok"; render(); }
    if (b.dataset.sc) { sc = b.dataset.sc; render(); }
  });
  render();
});

// controller filter-chain explorer
$$(".chain").forEach(w => {
  const d = jsonOf(w); let rq = 0, sc = 0, run = 0;
  w.insertAdjacentHTML("afterbegin", `<div class="sel-row"><span class="lab">${esc(d.l_req)}</span>${d.reqs.map((q, j) => `<button class="btn" type="button" data-rq="${j}">${esc(q.label)}</button>`).join("")}</div><div class="sel-row sc"></div><ol class="chl"></ol><div class="res"></div>`);
  const ol = $(".chl", w), res = $(".res", w), scRow = $(".sc", w);
  async function render() {
    const r = ++run, q = d.reqs[rq], s = q.scen[sc];
    $$("[data-rq]", w).forEach(b => b.classList.toggle("on", +b.dataset.rq === rq));
    scRow.innerHTML = `<span class="lab">${esc(d.l_sc)}</span>` + q.scen.map((x, j) => `<button class="btn${j === sc ? " on" : ""}" type="button" data-sc="${j}">${esc(x.label)}</button>`).join("");
    const rows = q.rows.map((row, j) => {
      let k = row.st, ex = row.x || "";
      if (s.fail !== undefined && j === s.fail) { k = "fail"; ex = s.x; }
      else if (s.fail !== undefined && j > s.fail && row.st !== "skip") { k = "skip"; ex = RT.notrun; }
      return `<li class="${k}"><span class="no">${j + 1}</span><span><span class="cls">${esc(row.cls)}</span><code>${esc(row.h)}</code></span><span class="ex">${ex}</span></li>`;
    });
    if (s.rescue) rows.push(`<li class="rescue"><span class="no">↳</span><span><span class="cls">Api::AppController</span><code>${esc(s.rescue)}</code></span><span class="ex">${s.rx || ""}</span></li>`);
    ol.innerHTML = rows.join(""); res.innerHTML = "";
    for (const li of $$("li", ol)) { if (r !== run) return; li.classList.add("in"); await wait(140); }
    if (r === run) res.innerHTML = `<span class="st${s.code >= 400 ? " bad" : ""}">${s.code}</span><div class="out">${esc(s.body)}</div>`;
  }
  w.addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.rq) { rq = +b.dataset.rq; sc = 0; render(); }
    if (b.dataset.sc) { sc = +b.dataset.sc; render(); }
  });
  render();
});

// migration simulator: versions, steps, dependencies
$$(".migr").forEach(w => {
  const d = jsonOf(w), F = d.files, up = F.map(() => false);
  const opts = F.map((f, j) => `<option value="${j}">${f.v} ${esc(f.label)}</option>`).join("");
  w.insertAdjacentHTML("afterbegin", `<div class="row"><button class="btn" type="button" data-c="migrate">db:migrate</button><button class="btn" type="button" data-c="rollback">db:rollback</button><button class="btn" type="button" data-c="status">db:migrate:status</button></div>
    <div class="row" style="margin-top:6px"><label>STEP= <select data-k="step" style="width:auto"><option>1</option><option selected>2</option><option>3</option><option>4</option></select></label><button class="btn" type="button" data-c="rollstep">db:rollback STEP=n</button><button class="btn" type="button" data-c="redo">db:migrate:redo STEP=n</button></div>
    <div class="row" style="margin-top:6px"><label>VERSION= <select data-k="ver" style="width:auto">${opts}</select></label><button class="btn" type="button" data-c="to">db:migrate VERSION=</button><button class="btn" type="button" data-c="up">db:migrate:up VERSION=</button><button class="btn" type="button" data-c="down">db:migrate:down VERSION=</button></div>
    <div class="files"></div><div class="grid2"><div class="box"><p class="cap">terminal</p><div class="log" aria-live="polite"></div></div><div class="box"><p class="cap">db/schema.rb</p><pre class="out schema" style="margin:0;font-size:12.5px"></pre></div></div>`);
  const files = $(".files", w), log = $(".log", w), schema = $(".schema", w);
  let buf = [];
  const out = x => buf.push(x);
  const fail = (f, msg) => { out(`== ${f.v} ${f.cls}: migrating`); out(msg); out("bin/rails aborted!\nStandardError: An error has occurred, this and all later migrations canceled"); return false; };
  function runUp(j) {
    if (up[j]) return true;
    const miss = F[j].dep.find(k => !up[k]);
    if (miss !== undefined) return fail(F[j], F[j].upErr);
    up[j] = true; out(F[j].up); return true;
  }
  function runDown(j) {
    if (!up[j]) return true;
    const blocker = F.findIndex((f, k) => up[k] && (F[j].blockedBy || []).includes(k));
    if (blocker >= 0) { out(`== ${F[j].v} ${F[j].cls}: reverting`); out(F[j].downErr); out("bin/rails aborted!"); return false; }
    if (F[j].dep.some(k => !up[k])) { out(`== ${F[j].v} ${F[j].cls}: reverting`); out(F[j].upErr); out("bin/rails aborted!"); return false; }
    up[j] = false; out(F[j].down); return true;
  }
  const upIdx = () => F.map((_, j) => j).filter(j => up[j]);
  function draw() {
    files.innerHTML = F.map((f, j) => `<div class="${up[j] ? "up" : ""}"><span class="s">${up[j] ? "up" : "down"}</span><span class="v">${f.v}</span><span>db/migrate/${esc(f.name)}</span></div>`).join("");
    const last = upIdx().pop();
    const ver = last === undefined ? "0" : F[last].v.replace(/^(\d{4})(\d\d)(\d\d)(\d{6})$/, "$1_$2_$3_$4");
    let body = "";
    if (up[0]) body += d.parts.ca.replace("{wh}", up[2] ? d.parts.wh : "");
    if (up[1]) body += d.parts.ro.replace("{ix}", up[3] ? d.parts.ix : "");
    schema.textContent = `ActiveRecord::Schema[8.1].define(version: ${ver}) do\n  enable_extension "pgcrypto"\n${body}end`;
  }
  w.addEventListener("click", e => {
    const b = e.target.closest("button[data-c]"); if (!b) return;
    const c = b.dataset.c, n = +$("[data-k=step]", w).value, v = +$("[data-k=ver]", w).value; buf = [];
    let cmd = "bin/rails db:migrate";
    if (c === "migrate") { for (let j = 0; j < F.length; j++) if (!runUp(j)) break; }
    else if (c === "rollback" || c === "rollstep") { cmd = c === "rollback" ? "bin/rails db:rollback" : `bin/rails db:rollback STEP=${n}`; for (const j of upIdx().reverse().slice(0, c === "rollback" ? 1 : n)) if (!runDown(j)) break; }
    else if (c === "redo") { cmd = `bin/rails db:migrate:redo STEP=${n}`; const ids = upIdx().reverse().slice(0, n); let ok = true; for (const j of ids) if (!(ok = runDown(j))) break; if (ok) for (const j of ids.reverse()) if (!runUp(j)) break; }
    else if (c === "to") { cmd = `bin/rails db:migrate VERSION=${F[v].v}`; let ok = true; for (const j of upIdx().reverse()) if (j > v && !(ok = runDown(j))) break; if (ok) for (let j = 0; j <= v; j++) if (!runUp(j)) break; }
    else if (c === "up") { cmd = `bin/rails db:migrate:up VERSION=${F[v].v}`; runUp(v); }
    else if (c === "down") { cmd = `bin/rails db:migrate:down VERSION=${F[v].v}`; runDown(v); }
    else if (c === "status") { cmd = "bin/rails db:migrate:status"; out(`database: myapp_development\n\n Status   Migration ID    Migration Name\n--------------------------------------------------\n` + F.map((f, j) => `   ${up[j] ? "up  " : "down"}    ${f.v}  ${f.label}`).join("\n")); }
    if (!buf.length) buf.push(d.l_nothing);
    log.innerHTML += `<span class="k">~/myapp %</span> <span class="g">${esc(cmd)}</span>\n${buf.join("\n").split("\n").map(colorize).join("\n")}\n\n`;
    log.scrollTop = log.scrollHeight;
    draw();
  });
  draw();
});

// unique index playground
$$(".uidx").forEach(w => {
  const d = jsonOf(w); let mode = "none", rows = [], seq = 0;
  w.insertAdjacentHTML("afterbegin", `<div class="sel-row"><span class="lab">${esc(d.l_index)}</span>${d.modes.map(m => `<button class="btn" type="button" data-m="${m.id}">${esc(m.label)}</button>`).join("")}</div>
    <div class="row"><select data-k="u" style="width:auto">${d.users.map(u => `<option>${u}</option>`).join("")}</select><select data-k="r" style="width:auto">${d.roles.map(r => `<option>${r}</option>`).join("")}</select><button class="btn on" type="button" data-a="ins">INSERT</button></div>
    <div class="pair"><div class="box"><p class="cap">user_roles</p><div class="tbl tablewrap"></div></div><div class="box"><p class="cap">psql</p><div class="log" aria-live="polite"></div></div></div>`);
  const log = $(".log", w), tbl = $(".tbl", w);
  const say = (sql, res, bad) => { log.innerHTML += `<span class="k">=#</span> ${esc(sql)}\n<span class="${bad ? "r" : "g"}">${esc(res)}</span>\n`; log.scrollTop = log.scrollHeight; };
  const m = () => d.modes.find(x => x.id === mode);
  const clash = (row, mo, skip) => mo === "none" ? null : rows.find(o => o !== skip && o !== row && o.u === row.u && o.r === row.r && (mo === "uniq" || (!o.del && !row.del)));
  const dupErr = (name, row) => `ERROR:  duplicate key value violates unique constraint "${name}"\nDETAIL:  Key (user_id, role_id)=(${row.u}, ${row.r}) already exists.\n${d.l_rails}`;
  function draw() {
    $$("[data-m]", w).forEach(b => b.classList.toggle("on", b.dataset.m === mode));
    tbl.innerHTML = rows.length ? `<table><thead><tr><th>id</th><th>user_id</th><th>role_id</th><th>deleted_at</th><th></th></tr></thead><tbody>${rows.map(r => `<tr${r.del ? ' class="d"' : ""}><td>${r.id}</td><td>${r.u}</td><td>${r.r}</td><td>${r.del ? "10:0" + r.id : "NULL"}</td><td><button class="btn" type="button" data-t="${r.id}" style="font-size:11px;padding:0 6px">${r.del ? d.l_restore : d.l_soft}</button></td></tr>`).join("")}</tbody></table>` : `<p class="d" style="margin:0">${esc(d.l_empty)}</p>`;
  }
  w.addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.m && b.dataset.m !== mode) {
      const nm = d.modes.find(x => x.id === b.dataset.m);
      if (nm.id === "none") { say(`DROP INDEX ${m().name};`, "DROP INDEX"); mode = "none"; }
      else {
        const bad = rows.find(r => clash(r, nm.id));
        if (mode !== "none") say(`DROP INDEX ${m().name};`, "DROP INDEX");
        if (bad) { say(nm.sql, `ERROR:  could not create unique index "${nm.name}"\nDETAIL:  Key (user_id, role_id)=(${bad.u}, ${bad.r}) is duplicated.`, true); mode = "none"; }
        else { say(nm.sql, "CREATE INDEX"); mode = nm.id; }
      }
    } else if (b.dataset.a === "ins") {
      const row = { id: ++seq, u: $("[data-k=u]", w).value, r: $("[data-k=r]", w).value, del: false };
      const sql = `INSERT INTO user_roles (user_id, role_id) VALUES ('${row.u}', '${row.r}');`;
      if (clash(row, mode)) { seq--; say(sql, dupErr(m().name, row), true); }
      else { rows.push(row); say(sql, "INSERT 0 1"); }
    } else if (b.dataset.t) {
      const row = rows.find(r => r.id === +b.dataset.t);
      if (!row.del) { row.del = true; say(`UPDATE user_roles SET deleted_at = now() WHERE id = ${row.id};`, "UPDATE 1"); }
      else {
        row.del = false; const sql = `UPDATE user_roles SET deleted_at = NULL WHERE id = ${row.id};`;
        if (clash(row, mode)) { row.del = true; say(sql, dupErr(m().name, row), true); } else say(sql, "UPDATE 1");
      }
    }
    draw();
  });
  draw();
});

// route builder + named helper explainer
function routeArgs(path) {
  const ps = [...path.matchAll(/:(\w+)/g)].map(m => m[1]).filter(p => p !== "format");
  const segs = path.split("/").filter(Boolean);
  return ps.map(p => {
    if (p !== "id") return `${p}: @${p.replace(/_id$/, "")}.id`;
    const i = segs.indexOf(":id"); const res = segs[i - 1] || "record";
    return `id: @${res.replace(/ies$/, "y").replace(/s$/, "")}.id`;
  });
}
function helperUsage(r, L2) {
  const args = routeArgs(r.path), call = a => `${r.name}_${a}(${args.join(", ")})`;
  const verb = r.verb.toLowerCase(), body = r.params ? `,\n${" ".repeat(verb.length + 1)}params: ${r.params}` : "";
  const bare = r.path.replace("(.:format)", "");
  return `<p class="cap">${L2.helper}</p><pre class="out" style="margin:0 0 8px">${esc(call("path"))}\n<span class="d"># => ${esc(bare)}</span>\n${esc(call("url"))}\n<span class="d"># => http://www.example.com${esc(bare)}</span></pre><p class="cap">${L2.test}</p><pre class="out" style="margin:0">${esc(`${verb} ${call("url")}${body}`)}\nassert_response :${r.expect || "ok"}</pre>`;
}
function routeTable(rows) {
  let last = null;
  return `<div class="tablewrap"><table class="rtable"><thead><tr><th>Prefix</th><th>Verb</th><th>URI Pattern</th><th>Controller#Action</th></tr></thead><tbody>${rows.map((r, j) => { const show = r.name !== last && !r.hide; last = r.name; return `<tr data-j="${j}"><td>${show ? esc(r.name) : ""}</td><td class="vb">${r.verb}</td><td>${esc(r.path)}</td><td class="ca">${esc(r.ca)}</td></tr>`; }).join("")}</tbody></table></div>`;
}
function bindRouteRows(host, rows, out, L2) {
  $$("tbody tr", host).forEach(tr => tr.addEventListener("click", () => {
    $$("tbody tr", host).forEach(x => x.classList.toggle("sel", x === tr));
    out.innerHTML = helperUsage(rows[+tr.dataset.j], L2);
  }));
}
$$(".rbuild").forEach(w => {
  const d = jsonOf(w);
  const A = ["index", "show", "create", "update", "destroy"];
  const cb = (id, label, on) => `<label><input type="checkbox" data-k="${id}"${on ? " checked" : ""}> ${label}</label>`;
  w.insertAdjacentHTML("afterbegin", `<div class="ctrls">
    <fieldset><legend>${esc(d.l_scope)}</legend>${cb("ns", "namespace :api › :v1 › :admin", true)}</fieldset>
    <fieldset><legend>resources :users</legend>${A.map(a => cb("u_" + a, a, ["index", "show"].includes(a))).join("")}<br>${cb("u_member", "member { post :toggle_admin }", true)}</fieldset>
    <fieldset><legend>${esc(d.l_nested)}</legend>${cb("ur", "resources :user_roles", true)}<br>${A.map(a => cb("ur_" + a, a, ["index", "create"].includes(a))).join("")}<br>${cb("ur_member", "member { post :activate; post :inactivate }", true)}</fieldset>
    <fieldset><legend>${esc(d.l_shape)}</legend>${cb("only", d.l_only, true)}</fieldset>
  </div><div class="grid2" style="margin-top:12px"><div class="box"><p class="cap">config/routes.rb</p><pre class="out code-out" style="margin:0;font-size:12.5px"></pre></div><div class="box detail"><p class="cap">${esc(d.l_click)}</p></div></div><p class="cap" style="margin:12px 0 4px;color:var(--dim)">$ bin/rails routes -g users</p><div class="tbl"></div>`);
  const on = k => $(`input[data-k="${k}"]`, w).checked;
  function build() {
    const ns = on("ns") ? ["api", "v1", "admin"] : [], np = ns.map(x => x + "_").join(""), pp = ns.length ? "/" + ns.join("/") : "", cp = ns.length ? ns.join("/") + "/" : "";
    const only = on("only"), rows = [];
    const res = (sing, plural, base, nameBase, acts, ctrl, member, params) => {
      const r = [];
      member.forEach(m => r.push({ name: `${m}_${nameBase}${sing}`, verb: "POST", path: `${base}/${plural}/:id/${m}(.:format)`, ca: `${cp}${ctrl}#${m}` }));
      const pick = only ? acts : A;
      if (pick.includes("index")) r.push({ name: `${nameBase}${plural}`, verb: "GET", path: `${base}/${plural}(.:format)`, ca: `${cp}${ctrl}#index` });
      if (pick.includes("create")) r.push({ name: `${nameBase}${plural}`, verb: "POST", path: `${base}/${plural}(.:format)`, ca: `${cp}${ctrl}#create`, params, expect: "created" });
      if (pick.includes("show")) r.push({ name: `${nameBase}${sing}`, verb: "GET", path: `${base}/${plural}/:id(.:format)`, ca: `${cp}${ctrl}#show` });
      if (pick.includes("update")) { r.push({ name: `${nameBase}${sing}`, verb: "PATCH", path: `${base}/${plural}/:id(.:format)`, ca: `${cp}${ctrl}#update`, params }); r.push({ name: `${nameBase}${sing}`, verb: "PUT", path: `${base}/${plural}/:id(.:format)`, ca: `${cp}${ctrl}#update`, params }); }
      if (pick.includes("destroy")) r.push({ name: `${nameBase}${sing}`, verb: "DELETE", path: `${base}/${plural}/:id(.:format)`, ca: `${cp}${ctrl}#destroy` });
      return r;
    };
    const uActs = A.filter(a => on("u_" + a)), urActs = A.filter(a => on("ur_" + a));
    const inner = [];
    if (on("u_member")) inner.push(...res("user", "users", pp, np, [], "users", ["toggle_admin"]).filter(r => /toggle_admin/.test(r.name)));
    if (on("ur")) inner.push(...res("user_role", "user_roles", `${pp}/users/:user_id`, `${np}user_`, urActs, "user_roles", on("ur_member") ? ["activate", "inactivate"] : [], "{ user_role: { role_id: @role.id } }"));
    rows.push(...inner, ...res("user", "users", pp, np, uActs, "users", []));
    // routes.rb text
    const ind = n => "  ".repeat(n), lv = ns.length;
    const onlyStr = acts => only ? `, only: %i[ ${acts.join(" ")} ]` : "";
    let t = "Rails.application.routes.draw do\n";
    ns.forEach((n, j) => t += `${ind(j + 1)}namespace :${n} do\n`);
    const hasBlock = on("u_member") || on("ur");
    t += `${ind(lv + 1)}resources :users${onlyStr(uActs)}${hasBlock ? " do" : ""}\n`;
    if (on("u_member")) t += `${ind(lv + 2)}member do\n${ind(lv + 3)}post :toggle_admin\n${ind(lv + 2)}end\n`;
    if (on("ur")) {
      t += `${ind(lv + 2)}resources :user_roles${onlyStr(urActs)}${on("ur_member") ? " do" : ""}\n`;
      if (on("ur_member")) t += `${ind(lv + 3)}member do\n${ind(lv + 4)}post :activate\n${ind(lv + 4)}post :inactivate\n${ind(lv + 3)}end\n${ind(lv + 2)}end\n`;
    }
    if (hasBlock) t += `${ind(lv + 1)}end\n`;
    for (let j = lv; j > 0; j--) t += `${ind(j)}end\n`;
    t += "end";
    $(".code-out", w).innerHTML = hl(t);
    $(".tbl", w).innerHTML = routeTable(rows);
    const det = $(".detail", w); det.innerHTML = `<p class="cap">${esc(d.l_click)}</p>`;
    bindRouteRows(w, rows, det, d);
  }
  const hl = t => esc(t).replace(/(:\w+)/g, '<span class="k">$1</span>').replace(/\b(do|end|namespace|resources|member|post)\b/g, '<span class="g">$1</span>');
  w.addEventListener("change", build);
  build();
});
$$(".rfind").forEach(w => {
  const d = jsonOf(w);
  w.insertAdjacentHTML("afterbegin", `<div class="tbl"></div><div class="box detail" style="margin-top:10px"><p class="cap">${esc(d.l_click)}</p></div>`);
  $(".tbl", w).innerHTML = routeTable(d.rows);
  bindRouteRows(w, d.rows, $(".detail", w), d);
});
