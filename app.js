(function () {
  const loginScreen = document.getElementById("login-screen");
  const appScreen = document.getElementById("app-screen");
  const listScreen = document.getElementById("list-screen");
  const formScreen = document.getElementById("form-screen");
  const itemScreen = document.getElementById("item-screen");
  const listEl = document.getElementById("list");
  const searchEl = document.getElementById("search");
  const similarEl = document.getElementById("similar");
  const mediaNote = document.getElementById("media-note");
  const nameEl = document.getElementById("f-name");
  const titleEl = document.getElementById("f-title");
  const notesEl = document.getElementById("f-notes");
  const amountEl = document.getElementById("f-amount");
  const impEl = document.getElementById("f-imp");
  const impVal = document.getElementById("imp-val");

  let items = [];
  let person = "";
  let broken = false;
  let donate = false;
  let shared = false;

  function show(el) {
    [loginScreen, appScreen, listScreen, formScreen, itemScreen].forEach((n) => {
      if (n) n.hidden = n !== el;
    });
  }

  function enterApp() {
    const email = document.querySelector(".email input");
    person = (email && email.value.trim()) || person;
    if (person) nameEl.value = person;
    show(appScreen);
  }

  document.querySelector(".login").addEventListener("click", enterApp);
  document.querySelector(".register").addEventListener("click", enterApp);
  document.querySelector(".finger").addEventListener("click", enterApp);

  document.getElementById("fab-f").addEventListener("click", async () => {
    await refresh();
    show(listScreen);
  });
  document.getElementById("list-back").addEventListener("click", () => show(appScreen));
  document.getElementById("form-back").addEventListener("click", () => show(listScreen));
  document.getElementById("item-back").addEventListener("click", () => show(listScreen));
  document.getElementById("give-btn").addEventListener("click", () => {
    if (person) nameEl.value = person;
    show(formScreen);
  });

  searchEl.addEventListener("input", renderList);
  titleEl.addEventListener("input", renderSimilar);
  impEl.addEventListener("input", () => { impVal.textContent = impEl.value; });

  document.querySelectorAll("[data-broken]").forEach((btn) => {
    btn.addEventListener("click", () => {
      broken = btn.getAttribute("data-broken") === "yes";
      document.querySelectorAll("[data-broken]").forEach((b) => b.classList.toggle("on", b === btn));
    });
  });
  document.querySelectorAll("[data-donate]").forEach((btn) => {
    btn.addEventListener("click", () => {
      donate = btn.getAttribute("data-donate") === "yes";
      amountEl.hidden = !donate;
      document.querySelectorAll("[data-donate]").forEach((b) => b.classList.toggle("on", b === btn));
    });
  });

  function deviceInfo() {
    return {
      device: /Mobi|Android/i.test(navigator.userAgent) ? "phone" : "computer",
      browser: navigator.userAgent.slice(0, 80)
    };
  }

  function sortItems(list) {
    return list.slice().sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0) || (b.createdAt || "").localeCompare(a.createdAt || ""));
  }

  function renderList() {
    const q = (searchEl.value || "").trim().toLowerCase();
    const rows = sortItems(items).filter((it) => !q || (it.title || "").toLowerCase().includes(q));
    listEl.innerHTML = rows.map((it) => (
      '<div class="row-item" data-id="' + it.id + '">' +
        '<div class="votes">' + (it.upvotes || 0) + '</div>' +
        '<div class="row-title"></div>' +
      "</div>"
    )).join("");
    listEl.querySelectorAll(".row-item").forEach((row, i) => {
      row.querySelector(".row-title").textContent = rows[i].title;
      row.addEventListener("click", () => openItem(rows[i].id));
    });
  }

  function renderSimilar() {
    const q = (titleEl.value || "").trim().toLowerCase();
    if (!q) { similarEl.textContent = ""; return; }
    const hits = items.filter((it) => (it.title || "").toLowerCase().includes(q)).slice(0, 3);
    similarEl.textContent = hits.length ? "Similar: " + hits.map((h) => h.title).join(" · ") : "";
  }

  async function refresh() {
    const doc = await Store.load();
    items = doc.items || [];
    try {
      const probe = await fetch("/api/feedback", { method: "GET" });
      shared = probe.ok;
    } catch (e) {
      shared = false;
    }
    renderList();
  }

  async function fileToData(input, cap, kind) {
    const f = input.files && input.files[0];
    if (!f) return { has: false, data: "" };
    if (f.size > cap) {
      mediaNote.textContent = (mediaNote.textContent + " " + kind + " was too big, skipped.").trim();
      return { has: false, data: "" };
    }
    const data = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = rej;
      r.readAsDataURL(f);
    });
    return { has: true, data };
  }

  document.getElementById("submit-btn").addEventListener("click", async () => {
    mediaNote.textContent = "";
    const name = nameEl.value.trim();
    const title = titleEl.value.trim();
    if (!name) { mediaNote.textContent = "Name is required."; return; }
    if (!title) { mediaNote.textContent = "Title is required."; return; }
    person = name;
    const info = deviceInfo();
    const shot = await fileToData(document.getElementById("f-shot"), 400000, "Screenshot");
    const audio = await fileToData(document.getElementById("f-audio"), 800000, "Audio");
    const video = await fileToData(document.getElementById("f-video"), 1500000, "Video");
    const item = {
      id: "item-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
      title,
      notes: notesEl.value.trim(),
      broken,
      importance: Number(impEl.value),
      donate,
      pledgeAmount: donate ? Number(amountEl.value || 0) : 0,
      page: "/home",
      device: info.device,
      browser: info.browser,
      createdAt: new Date().toISOString(),
      person: name,
      upvotes: 0,
      comments: [],
      hasAudio: audio.has,
      hasScreenshot: shot.has,
      hasVideo: video.has,
      audioData: audio.data,
      screenshotData: shot.data,
      videoData: video.data
    };
    const saved = await Store.save({ items: items.concat([item]) });
    items = saved.items;
    titleEl.value = "";
    notesEl.value = "";
    amountEl.value = "";
    renderList();
    show(listScreen);
  });

  function openItem(id) {
    const it = items.find((x) => x.id === id);
    if (!it) return;
    const body = document.getElementById("item-body");
    body.innerHTML = "";
    const h = document.createElement("div");
    h.className = "row-title";
    h.textContent = (it.upvotes || 0) + " · " + it.title;
    body.appendChild(h);
    const notes = document.createElement("p");
    notes.className = "home-line";
    notes.textContent = it.notes || "";
    body.appendChild(notes);
    const meta = document.createElement("p");
    meta.className = "meta";
    meta.textContent = [
      it.person,
      it.broken ? "broken" : "not broken",
      "importance " + it.importance,
      it.donate ? "pledge " + it.pledgeAmount + " (not charged)" : "no pledge",
      it.page,
      it.device,
      it.createdAt
    ].join(" · ");
    body.appendChild(meta);
    if (it.screenshotData) {
      const img = document.createElement("img");
      img.src = it.screenshotData;
      img.style.maxWidth = "100%";
      body.appendChild(img);
    }
    if (it.audioData) {
      const a = document.createElement("audio");
      a.controls = true;
      a.src = it.audioData;
      body.appendChild(a);
    }
    if (it.videoData) {
      const v = document.createElement("video");
      v.controls = true;
      v.src = it.videoData;
      v.style.maxWidth = "100%";
      body.appendChild(v);
    }
    (it.comments || []).forEach((c) => {
      const p = document.createElement("p");
      p.className = "comment";
      p.textContent = c.person + ": " + c.text;
      body.appendChild(p);
    });
    const up = document.createElement("button");
    up.className = "btn sheet-btn";
    up.textContent = "UPVOTE";
    up.addEventListener("click", async () => {
      it.upvotes = (it.upvotes || 0) + 1;
      items = (await Store.save({ items })).items;
      openItem(id);
    });
    body.appendChild(up);
    const cname = document.createElement("input");
    cname.className = "inset-field";
    cname.placeholder = "Your name";
    cname.value = person;
    const ctext = document.createElement("input");
    ctext.className = "inset-field";
    ctext.placeholder = "Comment";
    const cbtn = document.createElement("button");
    cbtn.className = "btn sheet-btn";
    cbtn.textContent = "UPVOTE WITH COMMENT";
    cbtn.addEventListener("click", async () => {
      const n = cname.value.trim();
      const t = ctext.value.trim();
      if (!n || !t) return;
      person = n;
      it.upvotes = (it.upvotes || 0) + 1;
      it.comments = (it.comments || []).concat([{ person: n, text: t, createdAt: new Date().toISOString() }]);
      items = (await Store.save({ items })).items;
      openItem(id);
    });
    body.appendChild(cname);
    body.appendChild(ctext);
    body.appendChild(cbtn);
    show(itemScreen);
  }

  refresh();
})();
