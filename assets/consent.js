// Cookie consent (PDPA / GDPR) + Google Tag Manager, loaded only after opt-in.
(() => {
  const GTM_ID = "GTM-TSJFRCV9", KEY = "websec:consent", VERSION = 1;
  const TH = document.documentElement.lang === "th";
  const ROOT = (document.currentScript && document.currentScript.src || "").replace(/assets\/consent\.js.*$/, "");
  const PRIVACY = ROOT + (TH ? "th/" : "") + "privacy.html";
  const T = TH ? {
    label: "การตั้งค่าคุกกี้",
    text: "เราใช้ที่เก็บข้อมูลในเบราว์เซอร์ที่จำเป็นต่อการทำงานของเว็บ (ภาษา และความคืบหน้าการอ่าน) และขออนุญาตใช้คุกกี้ Google Analytics ผ่าน Google Tag Manager เพื่อดูว่าบทเรียนและเครื่องมือไหนถูกใช้งาน คุณเปลี่ยนใจได้ทุกเมื่อจากลิงก์ \"ตั้งค่าคุกกี้\" ท้ายหน้า",
    privacy: "ประกาศความเป็นส่วนตัว", accept: "ยอมรับทั้งหมด", reject: "ปฏิเสธที่ไม่จำเป็น", custom: "ตั้งค่า", save: "บันทึกตัวเลือก",
    necessary: "<b>จำเป็น</b>: ภาษา, ตัวเลือกภาษาโค้ด, ความคืบหน้าการอ่าน และตัวเลือกคุกกี้นี้ เก็บในเบราว์เซอร์ของคุณเท่านั้น ไม่ถูกส่งมาที่เรา",
    analytics: "<b>วิเคราะห์การใช้งาน</b>: Google Analytics ผ่าน Google Tag Manager หน้าที่เปิด และเครื่องมือที่ใช้ (เช่น ตอบแบบทดสอบถูกหรือผิด) ไม่ระบุตัวตน",
    marketing: "<b>การตลาด</b>: ยังไม่ได้ใช้ในตอนนี้ จะใช้เฉพาะเมื่อคุณอนุญาต",
    settings: "ตั้งค่าคุกกี้", privacyLink: "ความเป็นส่วนตัว",
  } : {
    label: "Cookie settings",
    text: "We use browser storage that the site needs to work (language, reading progress) and, with your permission, Google Analytics cookies through Google Tag Manager to see which lessons and tools get used. You can change your mind any time from \"Cookie settings\" at the bottom of every page.",
    privacy: "Privacy notice", accept: "Accept all", reject: "Reject non-essential", custom: "Settings", save: "Save choices",
    necessary: "<b>Necessary</b>: language, code-language choice, reading progress and this choice. Stored in your browser only, never sent to us.",
    analytics: "<b>Analytics</b>: Google Analytics via Google Tag Manager. Pages viewed and features used (for example, whether a quiz answer was right). Not linked to your identity.",
    marketing: "<b>Marketing</b>: not used today; only ever enabled with your permission.",
    settings: "Cookie settings", privacyLink: "Privacy",
  };

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  gtag("consent", "default", {
    ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied", analytics_storage: "denied",
    functionality_storage: "granted", security_storage: "granted", wait_for_update: 500,
  });

  const read = () => { try { const v = JSON.parse(localStorage.getItem(KEY)); return v && v.v === VERSION ? v : null; } catch (e) { return null; } };
  const write = c => { try { localStorage.setItem(KEY, JSON.stringify({ v: VERSION, analytics: !!c.analytics, marketing: !!c.marketing, at: new Date().toISOString() })); } catch (e) {} };
  let state = read(), loaded = false;

  function clearGoogleCookies() {
    const host = location.hostname.split("."), domains = [""];
    for (let i = 0; i < host.length - 1; i++) domains.push("; domain=." + host.slice(i).join("."));
    document.cookie.split(";").map(c => c.trim().split("=")[0]).filter(n => /^(_ga|_gid|_gat|_gcl|_gac)/.test(n))
      .forEach(n => domains.forEach(d => { document.cookie = `${n}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${d}`; }));
  }

  function apply(c) {
    const g = v => (v ? "granted" : "denied");
    gtag("consent", "update", { analytics_storage: g(c.analytics), ad_storage: g(c.marketing), ad_user_data: g(c.marketing), ad_personalization: g(c.marketing) });
    if (!c.analytics) clearGoogleCookies();
    if ((c.analytics || c.marketing) && !loaded) {
      loaded = true;
      window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
      const s = document.createElement("script");
      s.async = true;
      s.src = "https://www.googletagmanager.com/gtm.js?id=" + GTM_ID;
      document.head.appendChild(s);
    }
  }
  if (state) apply(state);

  // behaviour events, sent only with analytics consent
  function track(event, params) { if (state && state.analytics) window.dataLayer.push(Object.assign({ event, page_slug: document.body.dataset.slug }, params)); }
  const seen = new Set();
  document.addEventListener("click", e => {
    const el = e.target.closest && e.target.closest("button, a"); if (!el || el.closest(".cc")) return;
    const quiz = el.closest(".quiz");
    if (quiz && el.closest(".opts")) {
      if (quiz.dataset.tracked) return;
      quiz.dataset.tracked = "1";
      const quizzes = [...document.querySelectorAll(".quiz")], i = [...quiz.querySelectorAll(".opts button")].indexOf(el);
      return track("quiz_answer", { quiz_index: quizzes.indexOf(quiz) + 1, correct: i === +quiz.dataset.a });
    }
    if (el.dataset.setlang) return track("language_switch", { language: el.dataset.setlang });
    if (el.classList.contains("trk")) return track("track_switch", { track: el.textContent.trim() });
    const term = el.closest(".term");
    if (term && el.dataset.a) return track("terminal_" + el.dataset.a, { terminal_index: [...document.querySelectorAll(".term")].indexOf(term) + 1 });
    const box = el.closest(".demo, .anim");
    if (box) {
      const name = (box.querySelector(":scope > header b") || {}).textContent || box.dataset.title || "widget";
      if (!seen.has(name)) { seen.add(name); track("widget_interaction", { widget: name.replace(/^▶\s*/, "").trim() }); }
    }
  });
  document.addEventListener("change", e => {
    if (e.target.matches && e.target.matches(".readmark input")) track("lesson_mark_read", { read: e.target.checked });
  });

  // banner
  function banner(open) {
    let el = document.querySelector(".cc");
    if (!el) {
      el = document.createElement("div");
      el.className = "cc";
      el.setAttribute("role", "dialog");
      el.setAttribute("aria-label", T.label);
      el.innerHTML = `<p>${T.text} <a href="${PRIVACY}">${T.privacy}</a></p>
        <div class="cc-opts" hidden>
          <label><input type="checkbox" checked disabled> <span>${T.necessary}</span></label>
          <label><input type="checkbox" data-k="analytics"> <span>${T.analytics}</span></label>
          <label><input type="checkbox" data-k="marketing"> <span>${T.marketing}</span></label>
        </div>
        <div class="row"><button class="btn" type="button" data-cc="reject">${T.reject}</button><button class="btn" type="button" data-cc="custom">${T.custom}</button><button class="btn" type="button" data-cc="save" hidden>${T.save}</button><button class="btn on" type="button" data-cc="accept">${T.accept}</button></div>`;
      document.body.appendChild(el);
      el.addEventListener("click", e => {
        const b = e.target.closest("[data-cc]"); if (!b) return;
        const a = b.dataset.cc;
        if (a === "custom") { el.querySelector(".cc-opts").hidden = false; b.hidden = true; el.querySelector("[data-cc=save]").hidden = false; return; }
        const box = k => el.querySelector(`[data-k=${k}]`).checked;
        const c = a === "accept" ? { analytics: true, marketing: true } : a === "reject" ? { analytics: false, marketing: false } : { analytics: box("analytics"), marketing: box("marketing") };
        write(c); state = read() || c; apply(c); el.remove();
      });
    }
    el.querySelector("[data-k=analytics]").checked = !!(state && state.analytics);
    el.querySelector("[data-k=marketing]").checked = !!(state && state.marketing);
    if (open) {
      el.querySelector(".cc-opts").hidden = false; el.querySelector("[data-cc=custom]").hidden = true; el.querySelector("[data-cc=save]").hidden = false;
      el.querySelector("[data-cc=save]").focus({ preventScroll: true });
    }
  }

  function init() {
    const f = document.querySelector("footer.site");
    if (f && !f.querySelector(".cc-link")) {
      f.insertAdjacentHTML("beforeend", ` · <a href="${PRIVACY}">${T.privacyLink}</a> · <a href="#" class="cc-link">${T.settings}</a>`);
      f.querySelector(".cc-link").addEventListener("click", e => { e.preventDefault(); banner(true); });
    }
    if (!state) banner(false);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
