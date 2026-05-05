#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const BASE_URL = "https://gvdb.mydns.jp";
const SEARCH_URL = `${BASE_URL}/db/module/QuestDB/action/QuestSearch`;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

const TYPE_MAP = {
  "冒険クエ": "adventure",
  "交易クエ": "trade",
  "海事クエ": "battle",
  レガシー: "adventure",
  勅命クエスト: "story"
};

const TERM_ZH = new Map(
  Object.entries({
    サグレス: "萨格雷斯",
    リスボン: "里斯本",
    ロンドン: "伦敦",
    アムステルダム: "阿姆斯特丹",
    セビリア: "塞维利亚",
    マルセイユ: "马赛",
    ヴェネツィア: "威尼斯",
    ジェノヴァ: "热那亚",
    チュニス: "突尼斯",
    オポルト: "奥波多",
    ポーツマス: "朴茨茅斯",
    ロッテルダム: "鹿特丹",
    アントワープ: "安特卫普",
    アテネ: "雅典",
    ナポリ: "那不勒斯",
    イスタンブール: "伊斯坦布尔",
    カリカット: "卡利卡特",
    ダブリン: "都柏林",
    カルヴィ: "卡尔维",
    カンディア: "甘地亚",
    ファマガスタ: "法马古斯塔",
    カレー: "加来",
    ナント: "南特",
    プリマス: "普利茅斯",
    ヘルデル: "海尔德",
    ボルドー: "波尔多",
    カサブランカ: "卡萨布兰卡",
    パルマ: "帕尔马",
    ヒホン: "希洪",
    ピサ: "比萨",
    ファロ: "法鲁",
    マディラ: "马德拉",
    マラガ: "马拉加",
    サロニカ: "萨洛尼卡",
    ラグーザ: "拉古萨",
    アルジェ: "阿尔及尔",
    コチン: "科钦",
    ディヴ: "第乌",
    "サクラメント": "萨克拉门托",
    "サンフランシスコ": "旧金山",
    "シトカ": "锡特卡",
    "タコマ": "塔科马",
    "バロー": "巴罗",
    "チャーチル": "丘吉尔",
    "オマハ": "奥马哈",
    "グレートプレーンズ": "大平原",
    "ボストン": "波士顿",
    "サマルカンド": "撒马尔罕",
    "ザナドゥ": "上都",
    "堺": "堺",
    "安平": "安平",
    "杭州": "杭州",
    "江戸": "江户",
    "泉州": "泉州",
    "浦項": "浦项",
    "淡水": "淡水",
    "漢陽": "汉阳",
    "澳門": "澳门",
    "西安": "西安",
    "重慶": "重庆",
    "釜山": "釜山",
    "長崎": "长崎",
    "雲台山": "云台山",
    "エディンバラ": "爱丁堡",
    "オクスフォード": "牛津",
    "オスロ": "奥斯陆",
    "コッコラ": "科科拉",
    "コペンハーゲン": "哥本哈根",
    "サンクトペテルブルク": "圣彼得堡",
    "ストックホルム": "斯德哥尔摩",
    "ダンツィヒ": "但泽",
    "ドーバー": "多佛",
    "ハンブルク": "汉堡",
    "フランクフルト": "法兰克福",
    "フローニンゲン": "格罗宁根",
    "ブレーメン": "不来梅",
    "ベルゲン": "卑尔根",
    "マンチェスター": "曼彻斯特",
    "ヨーテボリ": "哥德堡",
    "リガ": "里加",
    "リューベック": "吕贝克",
    "ルアーブル": "勒阿弗尔",
    "ヴィスビー": "维斯比",
    "アゾレス": "亚速尔",
    "カリアリ": "卡利亚里",
    "サッサリ": "萨萨里",
    "セウタ": "休达",
    "トリポリ": "的黎波里",
    "バルセロナ": "巴塞罗那",
    "バレンシア": "瓦伦西亚",
    "パリ": "巴黎",
    "ビルバオ": "毕尔巴鄂",
    "フィレンツェ": "佛罗伦萨",
    "モンペリエ": "蒙彼利埃",
    "ラスパルマス": "拉斯帕尔马斯",
    "ヴィアナドカステロ": "维亚纳堡",
    "アレクサンドリア": "亚历山大",
    "アンコナ": "安科纳",
    "オデッサ": "敖德萨",
    "カイロ": "开罗",
    "カッターロ": "科托尔",
    "カッファ": "卡法",
    "ザダール": "扎达尔",
    "シラクサ": "锡拉库萨",
    "セヴァストポリ": "塞瓦斯托波尔",
    "トリエステ": "的里雅斯特",
    "トレビゾント": "特拉布宗",
    "ベイルート": "贝鲁特",
    "ベンガジ": "班加西",
    "ヤッファ": "雅法",
    "ローマ": "罗马",
    "アビジャン": "阿比让",
    "アルギン": "阿尔金",
    "カーボヴェルデ": "佛得角",
    "ガボン": "加蓬",
    "サンジョルジュ": "圣乔治",
    "サントメ": "圣多美",
    "シエラレオネ": "塞拉利昂",
    "ドゥアラ": "杜阿拉",
    "ベニン": "贝宁",
    "ルアンダ": "罗安达",
    "イニャンバネ": "伊尼扬巴内",
    "カリビブ": "卡里比布",
    "ケープ": "开普敦",
    "ソファラ": "索法拉",
    "タマタブ": "塔马塔夫",
    "ナタール": "纳塔尔",
    "ベンゲラ": "本格拉",
    "モザンビーク": "莫桑比克",
    "アデン": "亚丁",
    "カルカッタ": "加尔各答",
    "キルワ": "基尔瓦",
    "ゴア": "果阿",
    "ザンジバル": "桑给巴尔",
    "ジェッダ": "吉达",
    "ジョファール": "佐法尔",
    "スエズ": "苏伊士",
    "セイラ": "泽拉",
    "セイロン": "锡兰",
    "ソコトラ": "索科特拉",
    "バスラ": "巴士拉",
    "ホルムズ": "霍尔木兹",
    "ポンディシェリ": "本地治里",
    "マスカット": "马斯喀特",
    "マスリパタム": "马苏利帕特南",
    "マッサワ": "马萨瓦",
    "マナーマ": "麦纳麦",
    "マリンディ": "马林迪",
    "マンガロール": "芒格洛尔",
    "モガディシオ": "摩加迪沙",
    "モンバサ": "蒙巴萨",
    "ヤンブー": "延布",
    "ヴィシャーカパトナム": "维沙卡帕特南",
    "アチン": "亚齐",
    "アンボイナ": "安汶",
    "クチン": "古晋",
    "グアム": "关岛",
    "サマライ": "萨马赖",
    "ジャカルタ": "雅加达",
    "ジャンビ": "占碑",
    "スラバヤ": "泗水",
    "ダバオ": "达沃",
    "テルナーテ": "特尔纳特",
    "ディリ": "帝力",
    "バンジェルマシン": "马辰",
    "パタニ": "北大年",
    "パレンバン": "巨港",
    "ブルネイ": "文莱",
    "ペグー": "勃固",
    "ホロ": "霍洛",
    "マカッサル": "望加锡",
    "マニラ": "马尼拉",
    "マラッカ": "马六甲",
    "ヤーデイン": "嘉定",
    "ルン": "伦岛",
    "ロッブリー": "华富里",
    "アカプルコ": "阿卡普尔科",
    "ウィレムスタッド": "威廉斯塔德",
    "カイエンヌ": "卡宴",
    "カラカス": "加拉加斯",
    "グァテマラ": "危地马拉",
    "グランドケイマン": "大开曼",
    "サンティアゴ": "圣地亚哥",
    "サントドミンゴ": "圣多明各",
    "サンフアン": "圣胡安",
    "ジャマイカ": "牙买加",
    "テノチティトラン": "特诺奇蒂特兰",
    "トゥンベス": "通贝斯",
    "トルヒーヨ": "特鲁希略",
    "ナッソー": "拿骚",
    "ハバナ": "哈瓦那",
    "パナマ": "巴拿马",
    "ヒバオア": "希瓦奥阿",
    "ペルナンブコ": "伯南布哥",
    "ポルトベロ": "波多贝罗",
    "ポートロイヤル": "皇家港",
    "マラカイボ": "马拉开波",
    "メリダ": "梅里达",
    "ランバイェケ": "兰巴耶克",
    "ヴェラクルス": "韦拉克鲁斯",
    "ウシュアイア": "乌斯怀亚",
    "クスコ": "库斯科",
    "コピアポ": "科皮亚波",
    "サンアントニオ": "圣安东尼奥",
    "バイーア": "巴伊亚",
    "バルパライソ": "瓦尔帕莱索",
    "ブエノスアイレス": "布宜诺斯艾利斯",
    "マチュピチュ": "马丘比丘",
    "リオデジャネイロ": "里约热内卢",
    "リマ": "利马",
    "カカドゥ": "卡卡杜",
    "クガリ": "库加里",
    "ハワイ": "夏威夷",
    "ピンジャラ": "平贾拉",
    "ホバート": "霍巴特",
    "ワンガヌイ": "旺阿努伊",
    "ナルヴィク": "纳尔维克",
    "マンガゼヤ": "曼加泽亚",
    "ティクシ": "季克西",
    "ペトロパブロフスク": "彼得罗巴甫洛夫斯克",
    "アクロポリス": "雅典卫城",
    商人ギルドマスター: "商人公会会长",
    冒険者ギルドマスター: "冒险者公会会长",
    海事ギルドマスター: "海事公会会长",
    交易所店主: "交易所店主",
    酒場マスター: "酒馆老板",
    豚肉: "猪肉",
    ビール: "啤酒",
    チーズ: "奶酪",
    乳: "牛奶",
    マスタード: "芥末",
    羊毛生地: "羊毛布料",
    商人ギルド登録証: "商人公会登录证",
    冒険者ギルド登録証: "冒险者公会登录证",
    海事ギルド登録証: "海事公会登录证",
    会計: "会计",
    英語: "英语",
    オランダ語: "荷兰语",
    ポルトガル語: "葡萄牙语",
    スペイン語: "西班牙语",
    フランス語: "法语",
    イタリア語: "意大利语",
    必要スキルはありません: "无必要技能",
    なし: "无"
  })
);
const TERM_ZH_ENTRIES = Array.from(TERM_ZH.entries()).sort((left, right) => right[0].length - left[0].length);

const args = parseArgs(process.argv.slice(2));
const outputPath = resolve(args.out || "data/gvdb-import.json");
const query = args.query || args._.join(" ").trim();

if (!query) {
  console.error("Please provide a Japanese quest name, for example: --query 商人への転職");
  process.exit(2);
}

log(`Searching GVDB: ${query}`);
const searchHtml = await fetchText(`${SEARCH_URL}?${new URLSearchParams({ q: query, p: "1" })}`);
const links = extractQuestLinks(searchHtml);
if (links.length === 0) {
  console.error(`No GVDB quest matched: ${query}`);
  process.exit(1);
}

const limit = Number(args.limit || 5);
const quests = [];
for (const link of links.slice(0, limit)) {
  log(`Reading: ${link.title}`);
  const detailHtml = await fetchText(link.url);
  quests.push(await extractQuest(detailHtml, link.url));
}

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(quests, null, 2)}\n`, "utf8");
log(`Imported ${quests.length} quest(s).`);
log(`Output: ${outputPath}`);

function parseArgs(values) {
  const parsed = { _: [] };
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--query") parsed.query = values[++index];
    else if (value.startsWith("--query=")) parsed.query = value.slice("--query=".length);
    else if (value === "--out") parsed.out = values[++index];
    else if (value.startsWith("--out=")) parsed.out = value.slice("--out=".length);
    else if (value === "--limit") parsed.limit = values[++index];
    else if (value.startsWith("--limit=")) parsed.limit = value.slice("--limit=".length);
    else parsed._.push(value);
  }
  return parsed;
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": USER_AGENT,
      accept: "text/html,application/xhtml+xml"
    }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
  return response.text();
}

function extractQuestLinks(html) {
  const resultSection = html.slice(html.indexOf("クエスト検索結果"));
  const links = [];
  const regex = /<a\s+[^>]*href=["']([^"']*QuestShow\?id=\d+[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of resultSection.matchAll(regex)) {
    const title = htmlToText(match[2]);
    if (!title) continue;
    links.push({
      title,
      url: absoluteUrl(match[1])
    });
  }
  return uniqueBy(links, (link) => link.url);
}

async function extractQuest(html, url) {
  const text = pageText(html);
  const title = readBetween(text, "クエスト名", "クエスト内容");
  const content = readBetween(text, "クエスト内容", "クロノクエスト");
  const offer = readBetween(text, "オファー方法", "難易度");
  const difficulty = readBetween(text, "難易度", "期限");
  const deadline = readBetween(text, "期限", "都市");
  const start = readBetween(text, "都市", "必要スキル");
  const requirements = readBetween(text, "必要スキル", "発見物");
  const rewardMoney = readBetween(text, "報酬／前金", "経験値／名声");
  const rewardExp = readBetween(text, "経験値／名声", "入手アイテム");
  const item = readBetween(text, "入手アイテム", "連続クエスト");
  const notes = readBetween(text, "備考", "ボーナスクエスト") || readBetween(text, "備考", "最終更新日時");
  const translatedStart = translateInline(start) || "待补充";
  const routeText = cleanList([content, notes]).join("\n\n");
  const delivery = parseDelivery(routeText, translatedStart);
  const sourceInfo = delivery ? await resolveSourceInfo(routeText, delivery.itemJp) : null;
  const steps = buildChineseSteps(routeText, translatedStart, sourceInfo);
  const type = Object.entries(TYPE_MAP).find(([label]) => offer.includes(label))?.[1] || inferType(offer);

  return {
    title,
    type,
    version: "GVDB 日文任务数据库",
    aliases: [],
    tags: cleanList(["GVDB", offer, "日服任务"]),
    start: translatedStart,
    destination: delivery?.cityZh || inferChineseDestination(routeText) || "见步骤",
    npc: delivery?.npcZh || inferChineseNpc(routeText) || "见步骤",
    difficulty: difficulty || "待判断",
    estimatedTime: deadline ? `期限：${translateInline(deadline)}` : "待判断",
    reward: cleanList([translateInline(rewardMoney), translateInline(rewardExp), translateInline(item)]).join(" / ") || "待补充",
    requirements: cleanList([translateInline(requirements)]),
    prep: buildPrep(requirements, routeText, sourceInfo, translatedStart),
    steps,
    notes: cleanList([content ? `任务说明：${translateInline(content)}` : "", `日文原文：${routeText}`, `来源：${url}`]),
    detailUrl: url
  };
}

function pageText(html) {
  const full = htmlToText(html);
  const startMatch = full.match(/クエスト[〖【].+?[〗】]の詳細/);
  const startIndex = startMatch ? startMatch.index : 0;
  return full
    .slice(startIndex)
    .replace(/このページのURL[\s\S]*$/m, "")
    .replace(/\n{3,}/g, "\n\n");
}

function readBetween(text, startLabel, endLabel) {
  const start = text.indexOf(startLabel);
  if (start < 0) return "";
  const from = start + startLabel.length;
  const end = text.indexOf(endLabel, from);
  return cleanText(text.slice(from, end >= 0 ? end : undefined));
}

async function resolveSourceInfo(notes, itemJp) {
  const explicit = parseSourceInfo(notes, itemJp);
  if (explicit) return explicit;

  const lookedUp = await lookupItemSources(itemJp).catch((error) => {
    console.warn(`Item source lookup failed for ${itemJp}: ${error.message}`);
    return null;
  });
  return lookedUp;
}

function buildPrep(requirements, notes, sourceInfoOverride = null, defaultCity = "") {
  const prep = [];
  const req = translateInline(requirements);
  if (req && !req.startsWith("无必要技能")) prep.push(`确认条件：${req}`);

  const delivery = parseDelivery(notes, defaultCity);
  if (delivery) prep.push(`准备交付物：${delivery.itemZh} ${delivery.quantity} 个。`);

  const sourceInfo = sourceInfoOverride || parseSourceInfo(notes, delivery?.itemJp);
  if (sourceInfo) {
    prep.push(`采购地点：${sourceInfo.sourcesZh.slice(0, 8).join("、")}。`);
  }

  return prep.length ? prep : ["阅读任务说明，确认对话 NPC、交付物和目的地。"];
}

function buildChineseSteps(notes, startCity, sourceInfoOverride = null) {
  const lines = cleanText(notes)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const talkSteps = [];
  const steps = [];
  for (const line of lines) {
    const numbered = line.match(/^\s*([0-9０-９]+)[.．]\s+(.+)$/);
    if (numbered) {
      const action = translateAction(numbered[2]);
      talkSteps.push(action);
      steps.push(action);
      continue;
    }

    if (/届ける|納品|渡す/.test(line)) {
      steps.push(translateAction(line));
    }
  }

  const delivery = parseDelivery(notes, startCity);
  const sourceInfo = sourceInfoOverride || parseSourceInfo(notes, delivery?.itemJp);
  if (delivery && sourceInfo) {
    return buildRouteSteps({ startCity, talkSteps, delivery, sourceInfo });
  }

  return steps.length ? steps : ["查看任务备注中的日文原文，按 NPC 对话、交付物和目的地完成任务。"];
}

function translateAction(raw) {
  const text = translateInline(raw);
  const delivery = parseDelivery(raw);
  if (delivery) {
    if (!delivery.cityZh || !delivery.npcZh) {
      return `交付${delivery.itemZh} ${delivery.quantity} 个。`;
    }
    return `前往${delivery.cityZh}，向${delivery.npcZh}交付${delivery.itemZh} ${delivery.quantity} 个。`;
  }

  const talk = text.match(/^(.+?)\s+(.+?)(?:\s*x\s*([0-9０-９]+))?$/);
  if (talk && /会长|店主|老板|NPC|商人|军人|冒险/.test(talk[2])) {
    const count = talk[3] ? ` ${toHalfWidth(talk[3])} 次` : "";
    return `前往${talk[1]}，与${talk[2]}对话${count}。`;
  }

  const deliver = text.match(/([^。\n]+?)を\s*([0-9０-９]+)\s*(?:届ける|納品|渡す)/);
  if (deliver) return `交付${translateInline(deliver[1])} ${toHalfWidth(deliver[2])} 个。`;

  return `${text.replace(/。?$/, "")}。`;
}

function parseDelivery(notes, defaultCity = "") {
  const text = cleanText(notes);
  const labeled = text.match(/届け先[:：]\s*([^\n]+)[\s\S]*?配達品[:：]\s*([^\n]+)/);
  if (labeled) {
    const target = parseDeliveryTarget(labeled[1]);
    const item = parseItemQuantity(labeled[2]);
    if (target && item) {
      return {
        ...target,
        ...item
      };
    }
  }

  const direct = text.match(
    /([^\s。\n]+)の([^\s。\n]+)に、?\s*([^。\n]+?)を\s*([0-9０-９]+)\s*(?:箱|個|袋|樽|桶|本|巻|枚)?[^。\n]*(?:届ける|納品|渡す)/
  );
  if (direct) {
    return {
      cityJp: direct[1],
      cityZh: translateInline(direct[1]),
      npcJp: direct[2],
      npcZh: translateInline(direct[2]),
      itemJp: cleanItemName(direct[3]),
      itemZh: translateInline(cleanItemName(direct[3])),
      quantity: toHalfWidth(direct[4])
    };
  }

  const bringHere = text.match(
    /([^。\n]+?)を\s*([0-9０-９]+)\s*(?:箱|個|袋|樽|桶|本|巻|枚)?[、，]?\s*(?:ここ|こちら|依頼主|委託者)[^。\n]*(?:持ってきて)?[^。\n]*(?:届ける|納品|渡す)/
  );
  if (bringHere) {
    const itemJp = cleanItemName(bringHere[1]);
    return {
      cityJp: defaultCity,
      cityZh: defaultCity,
      npcJp: "依頼人",
      npcZh: "任务委托人",
      itemJp,
      itemZh: translateInline(itemJp),
      quantity: toHalfWidth(bringHere[2])
    };
  }

  const simple = text.match(
    /([^。\n]+?)を\s*([0-9０-９]+)\s*(?:箱|個|袋|樽|桶|本|巻|枚)?[^。\n]*(?:届ける|納品|渡す)/
  );
  if (!simple) return null;
  const itemJp = cleanItemName(simple[1]);
  return {
    cityJp: "",
    cityZh: "",
    npcJp: "",
    npcZh: "",
    itemJp,
    itemZh: translateInline(itemJp),
    quantity: toHalfWidth(simple[2])
  };
}

function cleanItemName(value) {
  return cleanText(value)
    .replace(/^内容は/, "")
    .replace(/^依頼は/, "")
    .replace(/^今回は/, "")
    .replace(/^[、，。:\s]+/, "")
    .trim();
}

function parseDeliveryTarget(value) {
  const target = cleanText(value);
  const withNo = target.match(/^(.+?)の(.+)$/);
  if (withNo) {
    return {
      cityJp: withNo[1].trim(),
      cityZh: translateInline(withNo[1].trim()),
      npcJp: withNo[2].trim(),
      npcZh: translateInline(withNo[2].trim())
    };
  }

  const parts = target.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return {
      cityJp: parts[0],
      cityZh: translateInline(parts[0]),
      npcJp: parts.slice(1).join(" "),
      npcZh: translateInline(parts.slice(1).join(" "))
    };
  }

  return null;
}

function parseItemQuantity(value) {
  const itemLine = cleanText(value).replace(/[　\s]+/g, "");
  const match = itemLine.match(/^(.+?)(?:[x×＊*])?([0-9０-９]+)(?:箱|個|袋|樽|桶|本|巻|枚)?$/);
  if (!match) return null;
  return {
    itemJp: match[1].trim(),
    itemZh: translateInline(match[1].trim()),
    quantity: toHalfWidth(match[2])
  };
}

function parseSourceInfo(notes, itemJp = "") {
  const text = cleanText(notes);
  const escapedItem = itemJp ? escapeRegExp(itemJp) : "[^\\s。\\n]+";
  const patterns = [
    new RegExp(`(${escapedItem})は([^。\\n]+?)(?:で|から)(?:入手可|購入|調達|入手)`, "u"),
    new RegExp(`(?:■)?\\s*${escapedItem}の販売港\\s*\\n+\\s*([^。\\n]+)`, "u"),
    new RegExp(`販売港[:：]?\\s*([^。\\n]+)`, "u")
  ];

  let item = itemJp;
  let sourcesText = "";
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    if (match.length >= 3) {
      item = match[1];
      sourcesText = match[2];
    } else {
      sourcesText = match[1];
    }
    break;
  }

  if (!sourcesText) return null;

  const sourcesJp = sourcesText
    .replace(/^[:：\s]+/, "")
    .split(/\s*(?:／|\/|、|,|，|・)\s*/g)
    .map((source) => source.trim())
    .filter((source) => source && !/^■/.test(source));

  if (sourcesJp.length === 0) return null;

  return {
    itemJp: item,
    itemZh: translateInline(item),
    sourcesJp,
    sourcesZh: sourcesJp.map(translateInline)
  };
}

async function lookupItemSources(itemJp) {
  if (!itemJp) return null;
  log(`Looking up item source: ${itemJp}`);
  const searchUrl = `${BASE_URL}/db/module/TradeDB/action/Search?${new URLSearchParams({
    name: itemJp,
    type: ""
  })}`;
  const searchHtml = await fetchText(searchUrl);
  const itemUrl = findExactItemUrl(searchHtml, itemJp);
  if (!itemUrl) return null;

  const itemHtml = await fetchText(itemUrl);
  const sourcesJp = extractItemSourceTowns(itemHtml);
  if (!sourcesJp.length) return null;

  return {
    itemJp,
    itemZh: translateInline(itemJp),
    sourcesJp,
    sourcesZh: sourcesJp.map(translateInline),
    source: itemUrl
  };
}

function findExactItemUrl(html, itemJp) {
  const links = [];
  const regex = /<a\s+[^>]*href=["']([^"']*ItemShow\?id=\d+[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(regex)) {
    const label = htmlToText(match[2]);
    links.push({ label, url: absoluteUrl(match[1]) });
  }

  const exact = links.find((link) => link.label === itemJp);
  return (exact || links[0])?.url || "";
}

function extractItemSourceTowns(html) {
  const tables = Array.from(html.matchAll(/<table[\s\S]*?<\/table>/gi), (match) => match[0]);
  const sourceTable = tables.find((table) => {
    const clean = htmlToText(table);
    return clean.includes("都市名") && clean.includes("買付価格");
  });
  if (!sourceTable) return [];

  const towns = [];
  const regex = /<a\s+[^>]*href=["'][^"']*TownShow\?id=\d+[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of sourceTable.matchAll(regex)) {
    const town = htmlToText(match[1]);
    if (town && !towns.includes(town)) towns.push(town);
  }
  return towns;
}

function buildRouteSteps({ startCity, talkSteps, delivery, sourceInfo }) {
  const recommendedSource = chooseSource(startCity, talkSteps, delivery, sourceInfo);
  const preDeliveryTalkSteps = talkSteps.filter((step) => {
    return !(delivery.cityZh && delivery.npcZh && step.includes(delivery.cityZh) && step.includes(delivery.npcZh));
  });
  const steps = [];
  let currentCity = startCity && startCity !== "待补充" ? startCity : "";

  if (startCity && startCity !== "待补充") {
    steps.push(`在${startCity}接取任务，确认期限、交付物和目的地。`);
  }

  for (const talkStep of preDeliveryTalkSteps) {
    const nextCity = extractCityFromStep(talkStep);
    if (currentCity && nextCity && currentCity !== nextCity) {
      const hint = routeHint(currentCity, nextCity);
      steps.push(`从${currentCity}出航前往${nextCity}${hint ? `，${hint}` : ""}。`);
    }
    steps.push(toArrivalAction(talkStep));
    if (nextCity) currentCity = nextCity;
  }

  if (recommendedSource) {
    const previousCity = currentCity || lastCityFromSteps(preDeliveryTalkSteps) || startCity;
    const hint = routeHint(previousCity, recommendedSource);
    steps.push(
      `从${previousCity || "当前港口"}出航前往${recommendedSource}${hint ? `，${hint}` : ""}。`
    );
    steps.push(
      `在${recommendedSource}的交易所购买${delivery.itemZh} ${delivery.quantity} 个；建议多买 1-2 个防止误操作。`
    );
  } else {
    steps.push(
      `购买${delivery.itemZh} ${delivery.quantity} 个。可采购地点：${sourceInfo.sourcesZh.join("、")}。`
    );
  }

  if (delivery.cityZh) {
    const from = recommendedSource || currentCity || lastCityFromSteps(preDeliveryTalkSteps) || startCity || "当前港口";
    const hint = routeHint(from, delivery.cityZh);
    steps.push(`从${from}前往${delivery.cityZh}${hint ? `，${hint}` : ""}。`);
    steps.push(`到达${delivery.cityZh}后，找${delivery.npcZh}交付${delivery.itemZh} ${delivery.quantity} 个。`);
    steps.push("交付后任务通常会直接完成；如果日志仍未完成，再回接任务城市找委托人报告。");
  }

  const alternatives = sourceInfo.sourcesZh.filter((source) => source !== recommendedSource).slice(0, 8);
  if (alternatives.length) {
    const suffix = sourceInfo.sourcesZh.length > alternatives.length + 1 ? "等" : "";
    steps.push(`备用采购港：${alternatives.join("、")}${suffix}。如果推荐港缺货，可改去这些港口购买。`);
  }

  return uniqueStrings(steps);
}

function toArrivalAction(step) {
  return String(step || "").replace(/^前往([^，。]+)，/, "到达$1后，");
}

function chooseSource(startCity, talkSteps, delivery, sourceInfo) {
  const sources = sourceInfo.sourcesZh;
  const routeCities = [startCity, ...talkSteps.map(extractCityFromStep), delivery.cityZh].filter(Boolean);
  for (const source of sources) {
    if (routeCities.includes(source)) return source;
  }

  const preferredByRoute = [
    ["里斯本", "伦敦", ["奥波多", "朴茨茅斯", "安特卫普", "鹿特丹"]],
    ["萨格雷斯", "伦敦", ["奥波多", "朴茨茅斯", "安特卫普", "鹿特丹"]],
    ["阿姆斯特丹", "伦敦", ["鹿特丹", "安特卫普", "朴茨茅斯", "奥波多"]]
  ];
  const routeText = routeCities.join(">");
  for (const [from, to, preference] of preferredByRoute) {
    if (routeText.includes(from) && routeText.includes(to)) {
      const found = preference.find((city) => sources.includes(city));
      if (found) return found;
    }
  }

  return sources[0] || "";
}

function routeHint(from, to) {
  const key = `${from || ""}->${to || ""}`;
  const hints = {
    "萨格雷斯->里斯本": "沿葡萄牙近海北上即可",
    "里斯本->奥波多": "沿葡萄牙近海继续北上",
    "萨格雷斯->奥波多": "先沿葡萄牙近海北上，经过里斯本方向",
    "萨格雷斯->阿尔及尔": "向东穿过直布罗陀海峡，再沿北非海岸航行",
    "阿尔及尔->萨格雷斯": "沿北非海岸向西返航，穿过直布罗陀海峡后回到葡萄牙南岸",
    "奥波多->伦敦": "继续北上穿过比斯开湾，再进入英吉利海峡",
    "里斯本->伦敦": "北上穿过比斯开湾，再进入英吉利海峡",
    "伦敦->普利茅斯": "沿英格兰南岸向西航行",
    "普利茅斯->加来": "沿英吉利海峡向东航行",
    "朴茨茅斯->伦敦": "沿英格兰南岸转入伦敦方向",
    "鹿特丹->伦敦": "从北海横渡至英格兰东南岸",
    "伦敦->安特卫普": "向东南穿过北海与英吉利海峡交界海域",
    "安特卫普->伦敦": "经北海或英吉利海峡返航",
    "安特卫普->加来": "沿低地国家海岸向西南航行",
    "伦敦->加来": "横渡多佛海峡",
    "阿姆斯特丹->伦敦": "从北海横渡至英格兰东南岸"
  };
  return hints[key] || "";
}

function lastCityFromSteps(steps) {
  for (let index = steps.length - 1; index >= 0; index -= 1) {
    const city = extractCityFromStep(steps[index]);
    if (city) return city;
  }
  return "";
}

function extractCityFromStep(step) {
  const match = String(step || "").match(/前往([^，。]+)[，。]/);
  return match?.[1] || "";
}

function inferChineseDestination(notes) {
  const translated = translateInline(notes);
  const match = translated.match(/(?:前往|^|\n)(里斯本|伦敦|萨格雷斯|阿姆斯特丹|塞维利亚|马赛|威尼斯|热那亚|突尼斯)/);
  return match?.[1] || "";
}

function inferChineseNpc(notes) {
  const translated = translateInline(notes);
  const match = translated.match(/(商人公会会长|冒险者公会会长|海事公会会长|交易所店主|酒馆老板)/);
  return match?.[1] || "";
}

function inferType(offer) {
  if (offer.includes("交易")) return "trade";
  if (offer.includes("海事")) return "battle";
  if (offer.includes("冒険")) return "adventure";
  return "generic";
}

function translateInline(value) {
  let text = cleanText(value);
  for (const [jp, zh] of TERM_ZH_ENTRIES) {
    text = text.replaceAll(jp, zh);
  }
  text = text
    .replace(/報酬：/g, "报酬：")
    .replace(/前金：/g, "定金：")
    .replace(/経験値：/g, "经验：")
    .replace(/名声：/g, "声望：")
    .replace(/必要交易名声/g, "必要交易声望")
    .replace(/前提条件/g, "前置条件")
    .replace(/入手可/g, "可取得")
    .replace(/で入手可/g, "可取得")
    .replace(/から話を聞いてくれ/g, "处询问")
    .replace(/×/g, " x ");
  return text;
}

function htmlToText(html) {
  return decodeEntities(
    String(html || "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>|<\/div>|<\/tr>|<\/li>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
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

function cleanText(value) {
  return String(value || "")
    .replace(/\r/g, "")
    .replace(/&color\(red\)\{(.+?)\};/g, "$1")
    .replace(/^[：:\s]+/, "")
    .trim();
}

function cleanList(values) {
  return values
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .map(cleanText)
    .filter((value) => value && value !== "なし" && value !== "無");
}

function absoluteUrl(url) {
  return new URL(url, BASE_URL).toString();
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
  return Array.from(new Set(items.filter(Boolean)));
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toHalfWidth(value) {
  return String(value || "").replace(/[０-９]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0xfee0)
  );
}

function log(message) {
  console.log(`[${new Date().toLocaleTimeString("zh-CN", { hour12: false })}] ${message}`);
}
