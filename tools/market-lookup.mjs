#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const BASE_URL = "https://gvdb.mydns.jp";
const CACHE_VERSION = 3;
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 14;
const moduleDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(moduleDir, "..");
const cachePath = resolve(rootDir, "data", "market-cache.json");

const ITEM_ALIASES = new Map(
  Object.entries({
    猪肉: "豚肉",
    豬肉: "豚肉",
    豚肉: "豚肉",
    葡萄酒: "ワイン",
    红酒: "ワイン",
    紅酒: "ワイン",
    酒: "ワイン",
    芥末: "マスタード",
    芥子酱: "マスタード",
    芥子醬: "マスタード",
    奶酪: "チーズ",
    起司: "チーズ",
    香肠: "ソーセージ",
    香腸: "ソーセージ",
    猪油: "ラード",
    豬油: "ラード",
    鸡肉: "鶏肉",
    雞肉: "鶏肉",
    鸭肉: "アヒル肉",
    鴨肉: "アヒル肉",
    小麦: "小麦",
    小麥: "小麦",
    大麦: "大麦",
    大麥: "大麦",
    羊毛: "羊毛",
    木材: "木材",
    铁材: "鉄材",
    鐵材: "鉄材",
    钢: "鋼",
    鋼: "鋼",
    煤炭: "石炭",
    石油: "石油",
    砂糖: "砂糖",
    盐: "塩",
    鹽: "塩",
    橄榄油: "オリーブ油",
    橄欖油: "オリーブ油",
    蜂蜜: "蜂蜜",
    水稻: "水稲",
    水稻米: "水稲",
    茶: "茶",
    茶叶: "茶",
    茶葉: "茶"
  })
);

const PORT_ALIASES = new Map(
  Object.entries({
    奥波多: "オポルト",
    波尔图: "オポルト",
    波爾圖: "オポルト",
    里斯本: "リスボン",
    萨格雷斯: "サグレス",
    薩格雷斯: "サグレス",
    塞维利亚: "セビリア",
    塞維利亞: "セビリア",
    马赛: "マルセイユ",
    馬賽: "マルセイユ",
    伦敦: "ロンドン",
    倫敦: "ロンドン",
    普利茅斯: "プリマス",
    朴茨茅斯: "ポーツマス",
    樸茨茅斯: "ポーツマス",
    安特卫普: "アントワープ",
    安特衛普: "アントワープ",
    鹿特丹: "ロッテルダム",
    阿姆斯特丹: "アムステルダム",
    都柏林: "ダブリン",
    加来: "カレー",
    加來: "カレー",
    南特: "ナント",
    波尔多: "ボルドー",
    波爾多: "ボルドー",
    巴塞罗那: "バルセロナ",
    巴塞羅那: "バルセロナ",
    马拉加: "マラガ",
    馬拉加: "マラガ",
    休达: "セウタ",
    休達: "セウタ",
    卡萨布兰卡: "カサブランカ",
    卡薩布蘭卡: "カサブランカ",
    阿尔及尔: "アルジェ",
    阿爾及爾: "アルジェ",
    突尼斯: "チュニス",
    热那亚: "ジェノヴァ",
    熱那亞: "ジェノヴァ",
    比萨: "ピサ",
    比薩: "ピサ",
    那不勒斯: "ナポリ",
    威尼斯: "ヴェネツィア",
    锡拉库萨: "シラクサ",
    錫拉庫薩: "シラクサ",
    雅典: "アテネ",
    伊斯坦堡: "イスタンブール",
    伊斯坦布尔: "イスタンブール",
    亚历山大: "アレクサンドリア",
    亞歷山大: "アレクサンドリア",
    贝鲁特: "ベイルート",
    貝魯特: "ベイルート",
    开罗: "カイロ",
    開羅: "カイロ",
    圣乔治: "サンジョルジュ",
    聖喬治: "サンジョルジュ",
    开普敦: "ケープ",
    開普敦: "ケープ",
    桑给巴尔: "ザンジバル",
    桑給巴爾: "ザンジバル",
    亚丁: "アデン",
    亞丁: "アデン",
    马斯喀特: "マスカット",
    馬斯喀特: "マスカット",
    科钦: "コチン",
    科欽: "コチン",
    第乌: "ディヴ",
    第烏: "ディヴ",
    果阿: "ゴア",
    卡利卡特: "カリカット",
    锡兰: "セイロン",
    錫蘭: "セイロン",
    马六甲: "マラッカ",
    馬六甲: "マラッカ",
    雅加达: "ジャカルタ",
    雅加達: "ジャカルタ",
    巨港: "パレンバン",
    安平: "安平",
    杭州: "杭州",
    泉州: "泉州",
    澳门: "澳門",
    澳門: "澳門",
    江户: "江戸",
    江戶: "江戸",
    长崎: "長崎",
    長崎: "長崎"
  })
);

const JP_TO_ZH = new Map(
  [...ITEM_ALIASES.entries(), ...PORT_ALIASES.entries()]
    .map(([zh, jp]) => [jp, zh])
    .reverse()
);

const EXTRA_PORT_TRANSLATIONS = new Map(
  Object.entries({
    カルヴィ: "卡尔维",
    カンディア: "坎迪亚",
    ファマガスタ: "法马古斯塔",
    シラクサ: "锡拉库萨",
    カリアリ: "卡利亚里",
    トリポリ: "的黎波里",
    ベンガジ: "班加西",
    サロニカ: "萨洛尼卡",
    ラグーザ: "拉古萨",
    ザダール: "扎达尔",
    アンコナ: "安科纳",
    ナポリ: "那不勒斯",
    ピサ: "比萨",
    ジェノヴァ: "热那亚",
    チュニス: "突尼斯",
    ヴェネツィア: "威尼斯",
    アテネ: "雅典",
    イスタンブール: "伊斯坦堡",
    アレクサンドリア: "亚历山大",
    ベイルート: "贝鲁特",
    ヤッファ: "雅法",
    カイロ: "开罗",
    サンジョルジュ: "圣乔治",
    アビジャン: "阿比让",
    サントメ: "圣多美",
    ルアンダ: "罗安达",
    ケープ: "开普敦",
    ソファラ: "索法拉",
    モザンビーク: "莫桑比克",
    ザンジバル: "桑给巴尔",
    モンバサ: "蒙巴萨",
    モガディシオ: "摩加迪沙",
    アデン: "亚丁",
    マスカット: "马斯喀特",
    ホルムズ: "霍尔木兹",
    バスラ: "巴士拉",
    ゴア: "果阿",
    コチン: "科钦",
    ディヴ: "第乌",
    カリカット: "卡利卡特",
    セイロン: "锡兰",
    ポンディシェリ: "本地治里",
    マスリパタム: "马斯利帕塔姆",
    カルカッタ: "加尔各答",
    ペグー: "勃固",
    アチン: "亚齐",
    マラッカ: "马六甲",
    パレンバン: "巨港",
    ジャカルタ: "雅加达",
    ブルネイ: "文莱",
    マニラ: "马尼拉",
    テルナーテ: "特尔纳特",
    アンボイナ: "安汶",
    マカッサル: "望加锡",
    ダバオ: "达沃",
    ポルトベロ: "波多贝罗",
    ハバナ: "哈瓦那",
    サントドミンゴ: "圣多明各",
    サンフアン: "圣胡安",
    ジャマイカ: "牙买加",
    ヴェラクルス: "韦拉克鲁斯",
    メリダ: "梅里达",
    トルヒーヨ: "特鲁希略",
    ペルナンブコ: "伯南布哥",
    バイーア: "巴伊亚",
    リオデジャネイロ: "里约热内卢",
    ブエノスアイレス: "布宜诺斯艾利斯",
    サンアントニオ: "圣安东尼奥",
    リマ: "利马",
    パナマ: "巴拿马",
    グァテマラ: "危地马拉",
    アカプルコ: "阿卡普尔科",
    コピアポ: "科皮亚波",
    バルパライソ: "瓦尔帕莱索",
    サンフランシスコ: "旧金山"
  })
);

for (const [jp, zh] of EXTRA_PORT_TRANSLATIONS.entries()) {
  JP_TO_ZH.set(jp, zh);
  if (!PORT_ALIASES.has(zh)) PORT_ALIASES.set(zh, jp);
}

export async function lookupMarket({ mode, query, refresh = false }) {
  const cleanMode = mode === "port" ? "port" : "item";
  const cleanQuery = String(query || "").trim();
  if (!cleanQuery) throw new Error("Missing query");

  const cacheKey = `v${CACHE_VERSION}:${cleanMode}:${normalizeKey(cleanQuery)}`;
  if (!refresh) {
    const cached = await readCacheEntry(cacheKey);
    if (cached) return { ...cached, cached: true };
  }

  const result =
    cleanMode === "port"
      ? await lookupPort(cleanQuery)
      : await lookupItem(cleanQuery);
  await writeCacheEntry(cacheKey, result);
  return { ...result, cached: false };
}

async function lookupItem(query) {
  const candidates = await findLinks(query, "item");
  if (!candidates.length) {
    return {
      mode: "item",
      query,
      item: { jp: query, zh: translateName(query), url: "" },
      ports: [],
      suggestions: []
    };
  }

  const item = chooseBestLink(candidates, query, ITEM_ALIASES);
  const html = await fetchText(item.url);
  const ports = extractItemSalePorts(html).map((entry) => ({
    ...entry,
    townZh: translateName(entry.townJp),
    regionZh: translateName(entry.regionJp)
  }));

  return {
    mode: "item",
    query,
    item: {
      id: item.id,
      jp: item.label,
      zh: translateName(item.label),
      url: item.url
    },
    ports,
    suggestions: candidates.slice(0, 8).map((candidate) => ({
      jp: candidate.label,
      zh: translateName(candidate.label),
      url: candidate.url
    })),
    source: item.url,
    updatedAt: new Date().toISOString()
  };
}

async function lookupPort(query) {
  const candidates = await findLinks(query, "port");
  if (!candidates.length) {
    return {
      mode: "port",
      query,
      port: { jp: query, zh: translateName(query), url: "" },
      sections: [],
      suggestions: []
    };
  }

  const port = chooseBestLink(candidates, query, PORT_ALIASES);
  const html = await fetchText(port.url);
  const info = extractTownInfo(html);
  const sections = extractTownSaleSections(html).map((section) => ({
    ...section,
    items: section.items.map((entry) => ({
      ...entry,
      itemZh: translateName(entry.itemJp),
      groupZh: translateName(entry.groupJp)
    }))
  }));

  return {
    mode: "port",
    query,
    port: {
      id: port.id,
      jp: info.nameJp || port.label,
      zh: translateName(info.nameJp || port.label),
      regionJp: info.regionJp,
      regionZh: translateName(info.regionJp),
      seaJp: info.seaJp,
      seaZh: translateName(info.seaJp),
      coordinate: info.coordinate,
      url: port.url
    },
    sections,
    suggestions: candidates.slice(0, 8).map((candidate) => ({
      jp: candidate.label,
      zh: translateName(candidate.label),
      url: candidate.url
    })),
    source: port.url,
    updatedAt: new Date().toISOString()
  };
}

async function findLinks(query, kind) {
  const names = expandQueries(query, kind === "port" ? PORT_ALIASES : ITEM_ALIASES);
  const all = [];
  for (const name of names) {
    const searchUrl = `${BASE_URL}/db/module/TradeDB/action/Search?${new URLSearchParams({
      name,
      type: ""
    })}`;
    const html = await fetchText(searchUrl);
    const links = extractSearchLinks(html, kind);
    all.push(...links);
    if (links.some((link) => normalizeKey(link.label) === normalizeKey(name))) break;
  }
  return uniqueBy(all, (link) => link.url);
}

function expandQueries(query, aliasMap) {
  const names = [query];
  const direct = aliasMap.get(query);
  if (direct) names.unshift(direct);
  const normalizedQuery = normalizeKey(query);
  for (const [zh, jp] of aliasMap.entries()) {
    if (normalizeKey(zh) === normalizedQuery || normalizeKey(jp) === normalizedQuery) {
      names.unshift(jp);
      names.push(zh);
    }
  }
  return uniqueStrings(names.filter(Boolean));
}

function extractSearchLinks(html, kind) {
  const action = kind === "port" ? "TownShow" : "ItemShow";
  const regex = new RegExp(
    `<a\\s+[^>]*href=["']([^"']*${action}\\?id=(\\d+)[^"']*)["'][^>]*>([\\s\\S]*?)<\\/a>`,
    "gi"
  );
  const links = [];
  for (const match of html.matchAll(regex)) {
    const label = htmlToText(match[3]);
    if (!label) continue;
    links.push({
      id: match[2],
      label,
      url: absoluteUrl(match[1])
    });
  }
  return links;
}

function chooseBestLink(links, query, aliasMap) {
  const aliases = expandQueries(query, aliasMap).map(normalizeKey);
  return (
    links.find((link) => aliases.includes(normalizeKey(link.label))) ||
    links.find((link) => normalizeKey(link.label).includes(normalizeKey(query))) ||
    links[0]
  );
}

function extractItemSalePorts(html) {
  const table = extractTableById(html, "itemshow_trade_tabpain_t0");
  if (!table) return [];
  return extractRows(table, "TownShow").map((row) => ({
    townId: row.linkId,
    townJp: row.linkText,
    regionJp: row.cells[1] || "",
    price: cleanPrice(row.cells[2]),
    alliedPrice: cleanPrice(row.cells[3]),
    note: row.cells[4] || "",
    url: absoluteUrl(`/db/module/TradeDB/action/TownShow?id=${row.linkId}`)
  }));
}

function extractTownSaleSections(html) {
  const menus = {};
  const menuRegex = /id=["']townshow_item_tabmenu_([^"']+)["'][\s\S]*?>([\s\S]*?)<\/li>/gi;
  for (const match of html.matchAll(menuRegex)) {
    menus[match[1]] = htmlToText(match[2]);
  }

  const sections = [];
  const sectionRegex =
    /<div\s+class=["']tabpain["']\s+id=["']townshow_item_tabpain_([^"']+)["'][\s\S]*?<table\s+class=["']listform["'][\s\S]*?<\/table>/gi;
  for (const match of html.matchAll(sectionRegex)) {
    const id = match[1];
    const tableMatch = match[0].match(/<table\s+class=["']listform["'][\s\S]*?<\/table>/i);
    if (!tableMatch) continue;
    const name = menus[id] || (id === "t0" ? "交易品販売" : "販売品");
    if (/^売却/.test(name)) continue;
    const items = extractRows(tableMatch[0], "ItemShow").map((row) => {
      const isTrade = name === "交易品販売";
      return {
        itemId: row.linkId,
        itemJp: row.linkText,
        groupJp: row.cells[1] || "",
        price: cleanPrice(row.cells[2]),
        alliedPrice: isTrade ? cleanPrice(row.cells[3]) : "",
        npc: isTrade ? "" : row.cells[3] || "",
        note: row.cells[4] || "",
        url: absoluteUrl(`/db/module/TradeDB/action/ItemShow?id=${row.linkId}`)
      };
    });
    if (items.length) sections.push({ name, items });
  }
  return sections;
}

function extractTownInfo(html) {
  const rawName = extractInfoValue(html, "都市・港の名称");
  return {
    nameJp: rawName.replace(/詳細地図を表示[\s\S]*$/, "").trim().split(/\s+/)[0] || rawName,
    regionJp: extractInfoValue(html, "地域名"),
    seaJp: extractInfoValue(html, "海域名"),
    coordinate: extractCoordinate(html)
  };
}

function extractInfoValue(html, label) {
  const regex = new RegExp(`${escapeRegExp(label)}\\s*<\\/t[hd]>\\s*<t[hd][^>]*>([\\s\\S]*?)<\\/t[hd]>`, "i");
  const match = html.match(regex);
  return match ? htmlToText(match[1]) : "";
}

function extractCoordinate(html) {
  const match = htmlToText(html).match(/座標\s*（\s*([0-9０-９]+)\s*[，,]\s*([0-9０-９]+)\s*）/);
  if (!match) return "";
  return `${toHalfWidth(match[1])},${toHalfWidth(match[2])}`;
}

function extractTableById(html, id) {
  const start = html.indexOf(`id="${id}"`);
  if (start < 0) return "";
  const tableStart = html.indexOf("<table", start);
  if (tableStart < 0) return "";
  const tableEnd = html.indexOf("</table>", tableStart);
  if (tableEnd < 0) return "";
  return html.slice(tableStart, tableEnd + "</table>".length);
}

function extractRows(tableHtml, linkAction) {
  const rows = [];
  const rowRegex = /<tr\b[\s\S]*?<\/tr>/gi;
  const linkRegex = new RegExp(
    `<a\\s+[^>]*href=["'][^"']*${linkAction}\\?id=(\\d+)[^"']*["'][^>]*>([\\s\\S]*?)<\\/a>`,
    "i"
  );
  for (const rowHtml of tableHtml.match(rowRegex) || []) {
    const link = rowHtml.match(linkRegex);
    if (!link) continue;
    const cells = extractCells(rowHtml);
    rows.push({
      linkId: link[1],
      linkText: htmlToText(link[2]),
      cells
    });
  }
  return rows;
}

function extractCells(rowHtml) {
  const cells = [];
  const cleanRow = String(rowHtml || "")
    .replace(/\s+onmouseover="[^"]*"/gi, "")
    .replace(/\s+onmouseout="[^"]*"/gi, "");
  const cellRegex = /<td\b[^>]*>([\s\S]*?)(?=<td\b|<\/tr>)/gi;
  for (const match of cleanRow.matchAll(cellRegex)) {
    cells.push(htmlToText(match[1]));
  }
  return cells;
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36"
    }
  });
  if (!response.ok) throw new Error(`GVDB request failed: ${response.status}`);
  return response.text();
}

async function readCacheEntry(key) {
  const cache = await readCache();
  const entry = cache[key];
  if (!entry) return null;
  const age = Date.now() - Date.parse(entry.savedAt || 0);
  if (!Number.isFinite(age) || age > CACHE_TTL_MS) return null;
  return entry.value;
}

async function writeCacheEntry(key, value) {
  const cache = await readCache();
  cache[key] = {
    savedAt: new Date().toISOString(),
    value
  };
  await mkdir(dirname(cachePath), { recursive: true });
  await writeFile(cachePath, `${JSON.stringify(cache, null, 2)}\n`, "utf8");
}

async function readCache() {
  try {
    return JSON.parse(await readFile(cachePath, "utf8"));
  } catch {
    return {};
  }
}

function translateName(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (JP_TO_ZH.has(text)) return JP_TO_ZH.get(text);
  return text
    .replace(/交易品（食料品）/g, "交易品（食料品）")
    .replace(/交易品（調味料）/g, "交易品（调味料）")
    .replace(/交易品（家畜）/g, "交易品（家畜）")
    .replace(/交易品（鉱石）/g, "交易品（矿石）")
    .replace(/交易品（工業品）/g, "交易品（工业品）")
    .replace(/交易品（織物）/g, "交易品（织物）")
    .replace(/交易品（酒類）/g, "交易品（酒类）")
    .replace(/ヨーロッパ/g, "欧洲")
    .replace(/北部/g, "北部")
    .replace(/西部/g, "西部")
    .replace(/東部/g, "东部")
    .replace(/南部/g, "南部");
}

function htmlToText(value) {
  return decodeEntities(
    String(value || "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim();
}

function decodeEntities(value) {
  return String(value || "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function cleanPrice(value) {
  return toHalfWidth(value).replace(/\s+/g, "");
}

function toHalfWidth(value) {
  return String(value || "").replace(/[０-９]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0xfee0)
  );
}

function normalizeKey(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u30a1-\u30f6]/g, (char) =>
      String.fromCharCode(char.charCodeAt(0) - 0x60)
    )
    .replace(/[^\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}a-z0-9]+/gu, "");
}

function uniqueBy(items, keyFn) {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function uniqueStrings(items) {
  return Array.from(new Set(items));
}

function absoluteUrl(url) {
  return new URL(url, BASE_URL).toString();
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const mode = process.argv[2] === "port" ? "port" : "item";
  const query = process.argv.slice(3).join(" ");
  lookupMarket({ mode, query, refresh: true })
    .then((result) => {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
