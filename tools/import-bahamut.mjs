#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const DEFAULT_MENU_URL = "https://acg.gamer.com.tw/wikimenu.php?s=7501";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

const FIELD_ALIASES = {
  title: ["title", "任務名", "任務名稱", "巴哈任務名", "巴哈任务名", "中文任務名", "中文任务名"],
  aliases: ["aliases", "別名", "别名", "日服任務名", "日服任务名", "日文任務名", "日文任务名", "クエスト名"],
  notes: ["notes", "備註", "备注", "メモ"]
};

const args = parseArgs(process.argv.slice(2));
const urls = args.urls.length > 0 ? args.urls : [DEFAULT_MENU_URL];
const outputPath = resolve(args.out || "data/bahamut-import.json");
const detailLimit = Number(args.limit || 0);
const delayMs = Number(args.delay || 450);
const fetchDetails = Boolean(args.details);
const includePatterns = splitPatterns(args.include);
const aliasMap = args.alias ? await loadAliasMap(resolve(args.alias)) : new Map();

const seenCategoryUrls = new Set();
const seenQuestUrls = new Set();
const quests = [];

for (const inputUrl of urls) {
  const pageUrl = absoluteUrl(inputUrl, DEFAULT_MENU_URL);
  const html = await fetchText(pageUrl);
  const pageTitle = getPageTitle(html);

  if (pageUrl.includes("wikimenu.php")) {
    const categories = extractTaskCategoryLinks(html, pageUrl).filter((category) =>
      matchesInclude(`${category.text} ${decodeWikiTitle(category.url)} ${category.url}`)
    );
    log(`Found ${categories.length} task category links from menu.`);
    for (const category of categories) {
      if (seenCategoryUrls.has(category.url)) continue;
      seenCategoryUrls.add(category.url);
      await importCategory(category.url, category.text);
      if (fetchDetails && detailLimit > 0 && seenQuestUrls.size >= detailLimit) break;
      await sleep(delayMs);
    }
    continue;
  }

  if (looksLikeQuestDetail(html)) {
    const quest = extractQuestDetail(html, pageUrl);
    if (quest?.title) quests.push(applyAliases(quest, aliasMap));
    continue;
  }

  await importCategory(pageUrl, pageTitle);
}

const normalized = mergeByTitle(quests);
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");

console.log(`Imported ${normalized.length} quests`);
console.log(`Output: ${outputPath}`);
if (!fetchDetails) {
  console.log("Tip: add --details to fetch each quest detail page and include exact flow text.");
}
if (!args.alias) {
  console.log("Tip: add --alias data/jp-aliases-template.csv after filling Japanese quest names.");
}

async function importCategory(url, label) {
  log(`Reading category: ${label || url}`);
  const html = await fetchText(url);
  const type = inferType(`${label} ${getPageTitle(html)}`);
  const rows = extractQuestRows(html, url, type, label);
  log(`  Found ${rows.length} quest rows.`);

  for (const row of rows) {
    if (fetchDetails && row.detailUrl && !seenQuestUrls.has(row.detailUrl)) {
      if (detailLimit > 0 && seenQuestUrls.size >= detailLimit) break;
      seenQuestUrls.add(row.detailUrl);
      if (seenQuestUrls.size === 1 || seenQuestUrls.size % 25 === 0) {
        log(`  Fetching details: ${seenQuestUrls.size}${detailLimit ? `/${detailLimit}` : ""}`);
      }
      await sleep(delayMs);
      try {
        const detailHtml = await fetchText(row.detailUrl);
        const detail = extractQuestDetail(detailHtml, row.detailUrl, row);
        quests.push(applyAliases({ ...row, ...detail }, aliasMap));
      } catch (error) {
        console.warn(`Detail failed: ${row.title} ${row.detailUrl}`);
        quests.push(applyAliases(row, aliasMap));
      }
      continue;
    }

    quests.push(applyAliases(row, aliasMap));
  }
}

function parseArgs(values) {
  const parsed = {
    urls: []
  };

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--details") {
      parsed.details = true;
    } else if (value.startsWith("--out=")) {
      parsed.out = value.slice("--out=".length);
    } else if (value === "--out") {
      parsed.out = values[++index];
    } else if (value.startsWith("--limit=")) {
      parsed.limit = value.slice("--limit=".length);
    } else if (value === "--limit") {
      parsed.limit = values[++index];
    } else if (value.startsWith("--delay=")) {
      parsed.delay = value.slice("--delay=".length);
    } else if (value === "--delay") {
      parsed.delay = values[++index];
    } else if (value.startsWith("--alias=")) {
      parsed.alias = value.slice("--alias=".length);
    } else if (value === "--alias") {
      parsed.alias = values[++index];
    } else if (value.startsWith("--include=")) {
      parsed.include = value.slice("--include=".length);
    } else if (value === "--include") {
      parsed.include = values[++index];
    } else if (!value.startsWith("--")) {
      parsed.urls.push(value);
    }
  }

  return parsed;
}

function splitPatterns(value) {
  const aliases = {
    merchant: ["商人"],
    trade: ["商人"],
    adventure: ["冒險", "考古", "宗教", "美術", "財寶", "生物", "地理", "天文", "傳承", "追究", "冒險家"],
    battle: ["海事", "軍人"],
    story: ["主線", "轉職", "敕命"],
    transfer: ["轉職"],
    job: ["轉職"],
    jobchange: ["轉職"]
  };

  return String(value || "")
    .split(/\s*(?:\||,|，|;|；)\s*/g)
    .map((item) => item.trim())
    .filter(Boolean)
    .flatMap((item) => aliases[item.toLowerCase()] || [item]);
}

function matchesInclude(text) {
  if (includePatterns.length === 0) return true;
  return includePatterns.some((pattern) => text.includes(pattern));
}

function log(message) {
  console.log(`[${new Date().toLocaleTimeString("zh-CN", { hour12: false })}] ${message}`);
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": USER_AGENT,
      accept: "text/html,application/xhtml+xml"
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }

  return response.text();
}

function extractTaskCategoryLinks(html, sourceUrl) {
  const links = extractLinks(html, sourceUrl);
  const categories = links.filter((link) => {
    const text = stripText(link.text);
    const href = link.url;
    if (!href.includes("wiki2.gamer.com.tw/wiki.php")) return false;
    if (!text.includes("任務")) return false;
    if (/使用索引|歷年|官方|注意事項/.test(text)) return false;
    return true;
  });

  return uniqueBy(categories, (link) => link.url);
}

function extractQuestRows(html, sourceUrl, type, categoryLabel) {
  const tables = extractTables(html);
  const quests = [];

  for (const table of tables) {
    const rows = parseRows(table);
    quests.push(...extractJobChangeRows(rows, sourceUrl, categoryLabel));

    const headerIndex = rows.findIndex((row) => row.some((cell) => stripText(cell.text) === "任務名稱"));
    if (headerIndex < 0) continue;

    const headers = rows[headerIndex].map((cell) => stripText(cell.text));
    const titleIndex = headers.findIndex((header) => header === "任務名稱");
    const requirementIndex = headers.findIndex((header) => header === "任務要求");
    const rewardMoneyIndex = headers.findIndex((header) => header === "任務獎金");
    const rewardItemIndex = headers.findIndex((header) => header === "報酬物品");
    const destinationIndex = headers.findIndex((header) => header === "任務終點");

    for (const row of rows.slice(headerIndex + 1)) {
      const titleCell = row[titleIndex];
      const titleLink = titleCell?.links?.[0];
      const title = stripText(titleLink?.text || titleCell?.text || "").replace(/\s*\(.+?\)\s*$/, "");
      if (!title || title === "任務名稱") continue;

      const requirement = stripText(row[requirementIndex]?.text || "");
      const rewardMoney = stripText(row[rewardMoneyIndex]?.text || "");
      const rewardItem = stripText(row[rewardItemIndex]?.text || "");
      const destination = stripText(row[destinationIndex]?.text || "");
      const detailUrl = titleLink?.url ? absoluteUrl(titleLink.url, sourceUrl) : "";
      const requirements = cleanList([requirement === "-" ? "" : requirement]);
      const reward = cleanList([rewardMoney === "-" ? "" : rewardMoney, rewardItem === "-" ? "" : rewardItem]).join(" / ");

      quests.push({
        title,
        type,
        version: "巴哈姆特攻略百科",
        aliases: [],
        tags: cleanList(["巴哈", categoryLabel, typeLabel(type)]),
        start: "待从详情页补充",
        destination: destination === "-" ? "待补充" : destination,
        npc: "待补充",
        difficulty: stripText(row[0]?.text || "") || "待判断",
        estimatedTime: "待判断",
        reward: reward || "待补充",
        requirements,
        prep: requirements.length ? [`准备：${requirements.join("、")}`] : [],
        steps: buildStarterSteps(type, title, requirement, destination),
        notes: cleanList([`来源：${detailUrl || sourceUrl}`]),
        detailUrl
      });
    }
  }

  return quests;
}

function extractJobChangeRows(rows, sourceUrl, categoryLabel) {
  const headerIndex = rows.findIndex((row) => row.some((cell) => stripText(cell.text) === "轉職任務"));
  if (headerIndex < 0) return [];

  const headers = rows[headerIndex].map((cell) => stripText(cell.text).replace(/\s+/g, ""));
  const jobIndex = headers.findIndex((header) => header === "職業");
  const certificateIndex = headers.findIndex((header) => header === "轉職證");
  const questIndex = headers.findIndex((header) => header === "轉職任務");
  if (questIndex < 0) return [];

  const quests = [];
  const seen = new Set();

  for (const row of rows.slice(headerIndex + 1)) {
    const questCell = row[questIndex];
    if (!questCell?.links?.length) continue;

    const job = stripText(row[jobIndex]?.text || "");
    const certificate = stripText(row[certificateIndex]?.text || "");
    const questText = stripText(questCell.text || "");
    const requirementText = questText
      .split("\n")
      .slice(1)
      .join(" ")
      .replace(/^\s*[|｜]\s*/, "")
      .trim();

    for (const link of questCell.links) {
      const title = stripText(link.text);
      if (!title || seen.has(title)) continue;
      seen.add(title);

      quests.push({
        title,
        type: inferType(`${title} ${categoryLabel} 轉職任務`),
        version: "巴哈姆特攻略百科",
        aliases: [],
        tags: cleanList(["巴哈", categoryLabel, "轉職", job]),
        start: "待从详情页补充",
        destination: "待补充",
        npc: "待补充",
        difficulty: "待判断",
        estimatedTime: "待判断",
        reward: certificate || "转职证待补充",
        requirements: cleanList([requirementText]),
        prep: cleanList([requirementText ? `确认转职条件：${requirementText}` : "确认转职条件。"]),
        steps: cleanList([`完成「${title}」并取得${certificate || "转职证"}。`]),
        notes: cleanList([job ? `对应职业：${job}` : "", `来源：${sourceUrl}`]),
        detailUrl: absoluteUrl(link.url, sourceUrl)
      });
    }
  }

  return quests;
}

function extractQuestDetail(html, sourceUrl, fallback = {}) {
  const pageTitle = getQuestTitle(html) || fallback.title || decodeWikiTitle(sourceUrl);
  const tables = extractTables(html);
  let pairs = new Map();

  for (const table of tables) {
    const rows = parseRows(table);
    const text = rows.flat().map((cell) => stripText(cell.text)).join(" ");
    if (!/任務流程|接受地點|必要技能/.test(text)) continue;

    pairs = new Map(
      rows
        .filter((row) => row.length >= 2)
        .map((row) => [stripText(row[0].text), stripText(row[1].text)])
        .filter(([label]) => label)
    );
    break;
  }

  const flow = readPair(pairs, ["任務流程"]) || "";
  const notes = cleanList([readPair(pairs, ["備註"]), `来源：${sourceUrl}`]);
  const requirements = cleanList([readPair(pairs, ["必要技能"]), fallback.requirements?.join("、")]);
  const rewardMoney = readPair(pairs, ["定金／報酬", "訂金／報酬"]);
  const rewardExp = readPair(pairs, ["經驗／聲望"]);
  const rewardItem = readPair(pairs, ["報酬物品", "入手物"]);
  const rewardParts = cleanList([
    rewardMoney,
    rewardExp ? `经验/声望：${rewardExp}` : "",
    rewardItem && rewardItem !== "無" ? rewardItem : ""
  ]);
  const reward = rewardParts.length ? rewardParts.join(" / ") : fallback.reward || "";

  return {
    title: pageTitle,
    type: fallback.type || inferType(pageTitle),
    version: "巴哈姆特攻略百科",
    aliases: fallback.aliases || [],
    tags: cleanList([...(fallback.tags || []), "详情页"]),
    start: readPair(pairs, ["接受地點"]) || fallback.start || "待补充",
    destination: fallback.destination || inferDestination(flow) || "待补充",
    npc: inferNpc(flow) || fallback.npc || "待补充",
    difficulty: readPair(pairs, ["★", "難易度"]) || fallback.difficulty || "待判断",
    estimatedTime: readPair(pairs, ["時限"]) ? `时限：${readPair(pairs, ["時限"])}` : fallback.estimatedTime || "待判断",
    reward: reward || fallback.reward || "待补充",
    requirements,
    prep: cleanList([
      requirements.length ? `确认必要条件：${requirements.join("、")}` : "",
      fallback.requirements?.length ? `准备任务要求：${fallback.requirements.join("、")}` : ""
    ]),
    steps: splitSteps(flow).length ? splitSteps(flow) : fallback.steps || [],
    notes,
    detailUrl: sourceUrl
  };
}

function readPair(pairs, labels) {
  const normalizedLabels = labels.map(normalizeHeader);
  for (const [label, value] of pairs.entries()) {
    const normalized = normalizeHeader(label.replace(/\(.+?\)/g, ""));
    if (normalizedLabels.some((target) => normalized === target || normalized.startsWith(target))) {
      return value;
    }
  }
  return "";
}

function extractTables(html) {
  return Array.from(html.matchAll(/<table[\s\S]*?<\/table>/gi), (match) => match[0]);
}

function parseRows(tableHtml) {
  return Array.from(tableHtml.matchAll(/<tr[\s\S]*?<\/tr>/gi), (rowMatch) => {
    return Array.from(rowMatch[0].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi), (cellMatch) => {
      const raw = cellMatch[1];
      return {
        text: htmlToText(raw),
        links: extractLinks(raw, "")
      };
    });
  });
}

function extractLinks(html, sourceUrl) {
  return Array.from(
    html.matchAll(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi),
    (match) => ({
      url: absoluteUrl(match[1], sourceUrl || DEFAULT_MENU_URL),
      text: htmlToText(match[2])
    })
  );
}

function htmlToText(html) {
  return stripText(
    decodeEntities(
      html
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>|<\/div>|<\/li>/gi, "\n")
        .replace(/<[^>]+>/g, "")
    )
  );
}

function stripText(text) {
  return String(text || "")
    .replace(/\u00a0/g, " ")
    .replace(/　/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function decodeEntities(text) {
  return String(text || "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function getPageTitle(html) {
  const match = html.match(/<title>([\s\S]*?)<\/title>/i);
  return stripText(decodeEntities(match?.[1] || "")).replace(/^大航海時代 Online 攻略百科：/, "").replace(/ - 巴哈姆特$/, "");
}

function getQuestTitle(html) {
  return getPageTitle(html) || "";
}

function decodeWikiTitle(url) {
  const match = url.match(/n=7501:([^&#]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

function looksLikeQuestDetail(html) {
  return /任務流程|接受地點|必要技能/.test(html) && !/任務名稱/.test(html);
}

function splitSteps(flowText) {
  const text = stripText(flowText);
  if (!text) return [];
  const prepared = text
    .replace(/(\d+)[.．]/g, "\n$1. ")
    .replace(/→/g, "\n")
    .replace(/　+/g, " ");
  return prepared
    .split(/\n+/)
    .map((step) => step.replace(/^\d+[.．]\s*/, "").trim())
    .filter(Boolean);
}

function buildStarterSteps(type, title, requirement, destination) {
  const target = destination && destination !== "-" ? destination : "任务终点";
  if (type === "trade") {
    return cleanList([
      `接取「${title}」后确认任务要求。`,
      requirement && requirement !== "-" ? `准备任务物品：${requirement}。` : "确认任务物品或对话条件。",
      `前往${target}完成交付或报告。`
    ]);
  }
  if (type === "battle") {
    return cleanList([`接取「${title}」后确认目标。`, "补足炮弹、资材、水手和粮水。", `前往${target}或任务指定海域完成战斗。`]);
  }
  if (type === "adventure") {
    return cleanList([`接取「${title}」后确认线索和技能。`, "按任务提示收集情报。", `前往${target}完成发现、搜索或报告。`]);
  }
  return cleanList([`接取「${title}」。`, "按任务日志推进。", `前往${target}完成目标。`]);
}

function inferType(text) {
  if (/商人|交易|納品|交貨|購買|運送|進貨/.test(text)) return "trade";
  if (/海事|軍人|戰鬥|討伐|護衛|艦隊|海賊/.test(text)) return "battle";
  if (/冒險|考古|宗教|美術|財寶|生物|地理|天文|發現|探索|傳承|追究/.test(text)) return "adventure";
  if (/主線|敕命|轉職|移民|挑戰/.test(text)) return "story";
  return "generic";
}

function typeLabel(type) {
  return {
    trade: "商人",
    adventure: "冒险",
    battle: "海事",
    story: "主线",
    generic: "通用"
  }[type];
}

function inferDestination(flow) {
  const match = flow.match(/(?:交給|前往|去|到)\s*([^\s，。,.、]+)(?:\s|的|酒館|港|郊外)/);
  return match?.[1] || "";
}

function inferNpc(flow) {
  const match = flow.match(/(酒館老闆|交易所店主|城內官員|城市官員|冒險家公會會長|商人公會會長|海事公會會長|[^\s，。,.、]+NPC)/);
  return match?.[1] || "";
}

function cleanList(items) {
  return items
    .flatMap((item) => (Array.isArray(item) ? item : [item]))
    .map((item) => stripText(item))
    .filter((item) => item && item !== "-" && item !== "無");
}

function mergeByTitle(items) {
  const map = new Map();
  for (const item of items) {
    if (!item.title) continue;
    const key = normalizeKey(item.title);
    if (!map.has(key)) {
      map.set(key, item);
      continue;
    }

    const existing = map.get(key);
    map.set(key, {
      ...existing,
      ...item,
      aliases: uniqueStrings([...(existing.aliases || []), ...(item.aliases || [])]),
      tags: uniqueStrings([...(existing.tags || []), ...(item.tags || [])]),
      requirements: uniqueStrings([...(existing.requirements || []), ...(item.requirements || [])]),
      prep: uniqueStrings([...(existing.prep || []), ...(item.prep || [])]),
      steps: item.steps?.length ? item.steps : existing.steps,
      notes: uniqueStrings([...(existing.notes || []), ...(item.notes || [])])
    });
  }
  return Array.from(map.values());
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
  return Array.from(new Set(cleanList(items)));
}

function absoluteUrl(url, baseUrl) {
  if (!url) return "";
  if (url.startsWith("//")) return `https:${url}`;
  return new URL(url, baseUrl || DEFAULT_MENU_URL).toString();
}

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function loadAliasMap(filePath) {
  const text = await readFile(filePath, "utf8");
  const delimiter = filePath.endsWith(".tsv") ? "\t" : ",";
  const rows = parseDelimitedRows(text, delimiter).filter((row) => row.some((cell) => cell.trim()));
  if (rows.length < 2) return new Map();

  const headers = rows[0].map((header) => normalizeHeader(header));
  const map = new Map();

  for (const row of rows.slice(1)) {
    const raw = {};
    headers.forEach((header, index) => {
      const field = resolveFieldName(header);
      if (field) raw[field] = row[index] || "";
    });

    if (!raw.title || !raw.aliases) continue;
    const aliases = raw.aliases
      .split(/\s*(?:\||;|；)\s*/g)
      .map((alias) => alias.trim())
      .filter(Boolean);
    map.set(normalizeKey(raw.title), { aliases, notes: raw.notes });
  }

  return map;
}

function applyAliases(quest, map) {
  const mapped = map.get(normalizeKey(quest.title));
  if (!mapped) return quest;
  return {
    ...quest,
    aliases: uniqueStrings([...(quest.aliases || []), ...mapped.aliases]),
    notes: uniqueStrings([...(quest.notes || []), mapped.notes])
  };
}

function parseDelimitedRows(text, delimiter) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === delimiter) {
      row.push(cell);
      cell = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell);
  rows.push(row);
  return rows;
}

function resolveFieldName(header) {
  return Object.entries(FIELD_ALIASES).find(([, aliases]) =>
    aliases.some((alias) => normalizeHeader(alias) === header)
  )?.[0];
}

function normalizeHeader(value) {
  return String(value || "")
    .replace(/^\ufeff/, "")
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[\s_\-]+/g, "");
}

function normalizeKey(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー々a-z0-9]+/gu, "");
}
