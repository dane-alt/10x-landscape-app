const LOCAL_API = "/api/feedback";
const SEED = {
  items: [
    {
      id: "seed-1",
      title: "Sprinkler misses the far lawn",
      notes: "The far-left corner stays dry after a 20 minute cycle.",
      broken: true,
      importance: 8,
      donate: true,
      pledgeAmount: 25,
      page: "/home",
      device: "seed",
      browser: "seed",
      createdAt: "2026-08-27T10:00:00.000Z",
      person: "Maya Chen",
      upvotes: 5,
      comments: [{ person: "Luis Ortega", text: "Same on my side yard.", createdAt: "2026-08-27T11:00:00.000Z" }],
      hasAudio: false, hasScreenshot: false, hasVideo: false
    },
    {
      id: "seed-2",
      title: "Quote PDF is hard to read on a phone",
      notes: "Tiny type and the total is below the fold.",
      broken: false,
      importance: 6,
      donate: false,
      pledgeAmount: 0,
      page: "/home",
      device: "seed",
      browser: "seed",
      createdAt: "2026-08-26T15:00:00.000Z",
      person: "Priya Shah",
      upvotes: 3,
      comments: [],
      hasAudio: false, hasScreenshot: false, hasVideo: false
    },
    {
      id: "seed-3",
      title: "Need a photo of the drainage grate",
      notes: "Crew asked which grate was clogged.",
      broken: false,
      importance: 4,
      donate: true,
      pledgeAmount: 10,
      page: "/home",
      device: "seed",
      browser: "seed",
      createdAt: "2026-08-25T09:30:00.000Z",
      person: "Owen Blake",
      upvotes: 2,
      comments: [],
      hasAudio: false, hasScreenshot: false, hasVideo: false
    }
  ]
};

function unwrap(doc) {
  if (!doc) return { items: [] };
  if (Array.isArray(doc.items)) return { items: doc.items };
  if (doc.data && Array.isArray(doc.data.items)) return { items: doc.data.items };
  return { items: [] };
}

function mergeById(a, b) {
  const map = new Map();
  for (const it of a) map.set(it.id, it);
  for (const it of b) {
    const prev = map.get(it.id);
    if (!prev) { map.set(it.id, it); continue; }
    const newer = (it.createdAt || "") >= (prev.createdAt || "") ? it : prev;
    const older = newer === it ? prev : it;
    newer.upvotes = Math.max(it.upvotes || 0, prev.upvotes || 0);
    const comments = [...(older.comments || []), ...(newer.comments || [])];
    const seen = new Set();
    newer.comments = comments.filter((c) => {
      const k = (c.person || "") + "|" + (c.text || "") + "|" + (c.createdAt || "");
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    map.set(it.id, newer);
  }
  return [...map.values()];
}

async function tryFetch(url, opts) {
  const r = await fetch(url, opts);
  if (!r.ok) throw new Error(String(r.status));
  if (r.status === 204) return null;
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}

const Store = {
  async load() {
    try {
      const doc = unwrap(await tryFetch(LOCAL_API));
      if (doc.items && doc.items.length) return doc;
      return { items: SEED.items.slice() };
    } catch (e) {
      return { items: SEED.items.slice() };
    }
  },
  async save(doc) {
    const current = unwrap(await this.load());
    const merged = { items: mergeById(current.items, doc.items) };
    try {
      await tryFetch(LOCAL_API, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(merged)
      });
    } catch (e) {
      /* static host has no API */
    }
    return merged;
  }
};
