import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const dataFile = path.join(dir, "data.json");
const seed = {
  items: [
    { id: "seed-1", title: "Sprinkler misses the far lawn", notes: "The far-left corner stays dry after a 20 minute cycle.", broken: true, importance: 8, donate: true, pledgeAmount: 25, page: "/home", device: "seed", browser: "seed", createdAt: "2026-08-27T10:00:00.000Z", person: "Maya Chen", upvotes: 5, comments: [{ person: "Luis Ortega", text: "Same on my side yard.", createdAt: "2026-08-27T11:00:00.000Z" }], hasAudio: false, hasScreenshot: false, hasVideo: false },
    { id: "seed-2", title: "Quote PDF is hard to read on a phone", notes: "Tiny type and the total is below the fold.", broken: false, importance: 6, donate: false, pledgeAmount: 0, page: "/home", device: "seed", browser: "seed", createdAt: "2026-08-26T15:00:00.000Z", person: "Priya Shah", upvotes: 3, comments: [], hasAudio: false, hasScreenshot: false, hasVideo: false },
    { id: "seed-3", title: "Need a photo of the drainage grate", notes: "Crew asked which grate was clogged.", broken: false, importance: 4, donate: true, pledgeAmount: 10, page: "/home", device: "seed", browser: "seed", createdAt: "2026-08-25T09:30:00.000Z", person: "Owen Blake", upvotes: 2, comments: [], hasAudio: false, hasScreenshot: false, hasVideo: false }
  ]
};

function readData() {
  try {
    return JSON.parse(fs.readFileSync(dataFile, "utf8"));
  } catch {
    fs.writeFileSync(dataFile, JSON.stringify(seed, null, 2));
    return JSON.parse(JSON.stringify(seed));
  }
}

function mergeById(a, b) {
  const map = new Map();
  for (const it of a) map.set(it.id, it);
  for (const it of b) {
    const prev = map.get(it.id);
    if (!prev) { map.set(it.id, it); continue; }
    const newer = (it.createdAt || "") >= (prev.createdAt || "") ? it : prev;
    newer.upvotes = Math.max(it.upvotes || 0, prev.upvotes || 0);
    const comments = [...(prev.comments || []), ...(it.comments || [])];
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

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".json": "application/json; charset=utf-8",
  ".md": "text/plain; charset=utf-8"
};

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,PUT,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.statusCode = 204; res.end(); return; }

  if (req.url === "/api/feedback" && req.method === "GET") {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(readData()));
    return;
  }
  if (req.url === "/api/feedback" && req.method === "PUT") {
    let buf = "";
    req.on("data", (c) => { buf += c; if (buf.length > 8_000_000) req.destroy(); });
    req.on("end", () => {
      try {
        const incoming = JSON.parse(buf || "{}");
        const cur = readData();
        const next = { items: mergeById(cur.items || [], incoming.items || []) };
        fs.writeFileSync(dataFile, JSON.stringify(next, null, 2));
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify(next));
      } catch (e) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "bad json" }));
      }
    });
    return;
  }

  let file = req.url === "/" ? "/index.html" : req.url.split("?")[0];
  const abs = path.normalize(path.join(dir, file));
  if (!abs.startsWith(dir)) { res.statusCode = 403; res.end(); return; }
  fs.readFile(abs, (err, data) => {
    if (err) { res.statusCode = 404; res.end("not found"); return; }
    res.setHeader("Content-Type", types[path.extname(abs)] || "application/octet-stream");
    res.end(data);
  });
});

const port = Number(process.env.PORT || 8765);
server.listen(port, "0.0.0.0", () => {
  console.log("10X Landscape http://127.0.0.1:" + port);
});
