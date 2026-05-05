import { spawn } from "node:child_process";
import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { lookupMarket } from "./tools/market-lookup.mjs";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 8765);
let currentPosition = null;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (req.method === "POST" && url.pathname === "/api/gvdb") {
      await handleGvdb(req, res);
      return;
    }
    if (url.pathname === "/api/position") {
      await handlePosition(req, res);
      return;
    }
    if (url.pathname === "/api/market") {
      await handleMarket(req, res, url);
      return;
    }

    if (req.method !== "GET") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }

    await serveStatic(url.pathname, res);
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: error.message || "Server error" });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Quest guide is running: http://127.0.0.1:${port}`);
});

async function handleMarket(req, res, url) {
  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  const query = String(url.searchParams.get("q") || "").trim();
  const mode = url.searchParams.get("mode") === "port" ? "port" : "item";
  const refresh = url.searchParams.get("refresh") === "1";
  if (!query) {
    sendJson(res, 400, { error: "Missing query" });
    return;
  }

  const result = await lookupMarket({ mode, query, refresh });
  sendJson(res, 200, result);
}

async function handleGvdb(req, res) {
  const body = await readBody(req);
  const query = String(body.query || "").trim();
  if (!query) {
    sendJson(res, 400, { error: "Missing query" });
    return;
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "gvdb-import-"));
  const outputPath = path.join(tempDir, "quest.json");

  try {
    const result = await runNodeScript([
      path.join(rootDir, "tools", "import-gvdb.mjs"),
      "--query",
      query,
      "--out",
      outputPath,
      "--limit",
      "5"
    ]);

    const json = JSON.parse(await fs.readFile(outputPath, "utf8"));
    sendJson(res, 200, {
      quests: Array.isArray(json) ? json : [],
      log: result.stdout
    });
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

async function handlePosition(req, res) {
  if (req.method === "GET") {
    sendJson(res, 200, { position: currentPosition });
    return;
  }

  if (req.method === "DELETE") {
    currentPosition = null;
    sendJson(res, 200, { position: null });
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  const body = await readBody(req);
  const normalizedPosition = normalizePositionPayload(body);
  if (!normalizedPosition) {
    sendJson(res, 400, { error: "Invalid position. Use lat/lon or gameX/gameY." });
    return;
  }

  currentPosition = normalizedPosition;
  sendJson(res, 200, { position: currentPosition });
  return;
  const lat = Number(body.lat);
  const lon = Number(body.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    sendJson(res, 400, { error: "Invalid lat/lon" });
    return;
  }

  currentPosition = {
    lat,
    lon,
    label: String(body.label || "当前船位").slice(0, 40),
    source: String(body.source || "manual").slice(0, 40),
    updatedAt: new Date().toISOString()
  };
  sendJson(res, 200, { position: currentPosition });
}

function normalizePositionPayload(body) {
  const lat = Number(body.lat);
  const lon = Number(body.lon);
  const gameX = Number(body.gameX);
  const gameY = Number(body.gameY);
  const hasLatLon = Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
  const hasGameCoord = Number.isFinite(gameX) && Number.isFinite(gameY) && gameX >= 0 && gameX <= 16384 && gameY >= 0 && gameY <= 8192;
  if (!hasLatLon && !hasGameCoord) return null;

  return {
    ...(hasLatLon ? { lat, lon } : {}),
    ...(hasGameCoord ? { gameX: Math.round(gameX), gameY: Math.round(gameY) } : {}),
    label: String(body.label || "当前船位").slice(0, 40),
    source: String(body.source || (hasGameCoord ? "game" : "manual")).slice(0, 40),
    updatedAt: new Date().toISOString()
  };
}

function runNodeScript(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: rootDir,
      windowsHide: true
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(stderr || stdout || `GVDB import failed with code ${code}`));
      }
    });
  });
}

async function serveStatic(pathname, res) {
  const safePath = decodeURIComponent(pathname === "/" ? "/index.html" : pathname);
  const resolved = path.resolve(rootDir, `.${safePath}`);
  if (!resolved.startsWith(rootDir)) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }

  const stat = await fs.stat(resolved).catch(() => null);
  if (!stat || !stat.isFile()) {
    sendJson(res, 404, { error: "Not found" });
    return;
  }

  res.writeHead(200, {
    "content-type": mimeTypes[path.extname(resolved).toLowerCase()] || "application/octet-stream"
  });
  createReadStream(resolved).pipe(res);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1024 * 64) {
        reject(new Error("Request too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}
