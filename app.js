(function () {
  const STORAGE_KEY = "uw-quest-guide-library";
  const CALIBRATION_STORAGE_KEY = "uw-quest-guide-map-calibrations";
  const TYPE_LABELS = {
    all: "全部",
    trade: "交易",
    adventure: "冒险",
    battle: "战斗",
    story: "主线",
    generic: "通用"
  };

  const TYPE_KEYWORDS = {
    trade: [
      "运",
      "运输",
      "送",
      "交付",
      "货物",
      "采购",
      "购买",
      "出售",
      "贸易",
      "交易",
      "葡萄酒",
      "香料",
      "丝绸",
      "宝石",
      "納品",
      "配達",
      "配送",
      "届ける",
      "購入",
      "売却",
      "交易",
      "商人",
      "ワイン",
      "香辛料",
      "宝石"
    ],
    adventure: [
      "寻找",
      "发现",
      "调查",
      "地图",
      "遗迹",
      "考古",
      "地理",
      "生物",
      "财宝",
      "搜索",
      "观察",
      "冒険",
      "発見",
      "探索",
      "調査",
      "地図",
      "遺跡",
      "考古",
      "地理",
      "生物",
      "財宝",
      "宗教",
      "美術",
      "視認",
      "観察"
    ],
    battle: [
      "讨伐",
      "击败",
      "击沉",
      "海盗",
      "战斗",
      "舰队",
      "护卫",
      "剿灭",
      "私掠",
      "炮",
      "海事",
      "戦闘",
      "討伐",
      "撃破",
      "撃沈",
      "海賊",
      "艦隊",
      "護衛"
    ],
    story: [
      "主线",
      "剧情",
      "章节",
      "新手",
      "训练",
      "启航",
      "转职",
      "入港许可",
      "メイン",
      "ストーリー",
      "シナリオ",
      "イベント",
      "入港許可",
      "転職",
      "初心者",
      "訓練"
    ]
  };

  const TRADITIONAL_SEARCH_MAP = {
    務: "务",
    會: "会",
    給: "给",
    個: "个",
    萬: "万",
    請: "请",
    問: "问",
    裡: "里",
    聯: "联",
    貨: "货",
    購: "购",
    買: "买",
    運: "运",
    輸: "输",
    達: "达",
    歐: "欧",
    國: "国",
    倫: "伦",
    蘭: "兰",
    爾: "尔",
    維: "维",
    馬: "马",
    賽: "赛",
    亞: "亚",
    納: "纳",
    聖: "圣",
    喬: "乔",
    舊: "旧",
    圖: "图",
    險: "险",
    發: "发",
    現: "现",
    學: "学",
    寶: "宝",
    鑑: "鉴",
    傳: "传",
    戰: "战",
    鬥: "斗",
    軍: "军",
    艦: "舰",
    護: "护",
    衛: "卫",
    續: "续",
    轉: "转",
    職: "职",
    獎: "奖",
    報: "报",
    聲: "声",
    點: "点",
    無: "无",
    時: "时",
    備: "备",
    註: "注",
    級: "级",
    類: "类",
    進: "进",
    號: "号",
    產: "产",
    資: "资",
    訊: "讯",
    義: "义",
    麵: "面",
    鐵: "铁",
    羊: "羊",
    體: "体",
    龍: "龙",
    齊: "齐"
  };

  const FIELD_ALIASES = {
    title: ["title", "任务名", "任务名称", "クエスト名", "依頼名", "名称", "名前"],
    type: ["type", "类型", "分類", "種別", "类别"],
    version: ["version", "版本", "来源", "資料", "資料來源", "出典", "source"],
    aliases: ["aliases", "别名", "別名", "読み", "略称", "通称"],
    tags: ["tags", "标签", "標籤", "タグ"],
    start: ["start", "起点", "接取", "接任务", "受注場所", "受注", "開始", "開始場所"],
    destination: ["destination", "目的地", "到达", "到達", "納品先", "発見場所", "海域", "場所"],
    npc: ["npc", "NPC", "依頼人", "報告", "報告先", "交付NPC", "納品NPC"],
    difficulty: ["difficulty", "难度", "難度", "難易度"],
    estimatedTime: ["estimatedTime", "estimated_time", "耗时", "耗時", "時間", "所要時間"],
    reward: ["reward", "奖励", "報酬", "報償"],
    requirements: ["requirements", "前置", "条件", "必要", "必要条件", "スキル", "必要スキル"],
    prep: ["prep", "准备", "準備", "持ち物", "携行品"],
    steps: ["steps", "步骤", "步驟", "手順", "攻略", "流れ", "流程"],
    notes: ["notes", "注意", "备注", "備註", "メモ", "備考"]
  };

  const MAP_WIDTH = 1000;
  const MAP_HEIGHT = 520;
  const MAP_BOUNDS = {
    minLon: -180,
    maxLon: 180,
    minLat: -60,
    maxLat: 75
  };

  const PORT_COORDS = {
    萨格雷斯: port(-8.94, 37.01, "葡萄牙南岸", { major: true }),
    里斯本: port(-9.14, 38.72, "葡萄牙西岸", { major: true }),
    奥波多: port(-8.61, 41.15, "葡萄牙北岸", { major: true }),
    波尔图: port(-8.61, 41.15, "葡萄牙北岸"),
    法鲁: port(-7.93, 37.02, "葡萄牙南岸"),
    马德拉: port(-16.91, 32.65, "大西洋"),
    亚速尔: port(-25.67, 37.74, "大西洋"),
    塞维利亚: port(-5.99, 37.39, "伊比利亚", { major: true }),
    希洪: port(-5.66, 43.54, "伊比利亚北岸"),
    毕尔巴鄂: port(-2.94, 43.26, "伊比利亚北岸"),
    马拉加: port(-4.42, 36.72, "伊比利亚南岸"),
    巴塞罗那: port(2.17, 41.38, "伊比利亚东岸", { major: true }),
    瓦伦西亚: port(-0.38, 39.47, "伊比利亚东岸"),
    帕尔马: port(2.65, 39.57, "巴利阿里群岛"),
    拉斯帕尔马斯: port(-15.43, 28.12, "加那利群岛"),
    卡萨布兰卡: port(-7.62, 33.59, "北非西岸"),
    休达: port(-5.32, 35.89, "直布罗陀海峡"),
    波尔多: port(-0.58, 44.84, "法国西岸"),
    南特: port(-1.55, 47.22, "法国西岸"),
    勒阿弗尔: port(0.11, 49.49, "法国北岸"),
    加来: port(1.85, 50.95, "法国北岸", { major: true }),
    巴黎: port(2.35, 48.85, "法国"),
    蒙彼利埃: port(3.88, 43.61, "法国南岸"),
    马赛: port(5.37, 43.3, "法国南岸", { major: true }),
    多佛: port(1.31, 51.13, "英格兰南岸"),
    普利茅斯: port(-4.14, 50.37, "英格兰西南岸", { major: true }),
    朴茨茅斯: port(-1.09, 50.8, "英格兰南岸", { major: true }),
    伦敦: port(-0.1, 51.5, "英格兰", { major: true }),
    牛津: port(-1.26, 51.75, "英格兰"),
    曼彻斯特: port(-2.24, 53.48, "英格兰"),
    爱丁堡: port(-3.19, 55.95, "苏格兰"),
    都柏林: port(-6.26, 53.35, "爱尔兰"),
    阿姆斯特丹: port(4.9, 52.37, "低地国家", { major: true }),
    鹿特丹: port(4.48, 51.92, "低地国家", { major: true }),
    安特卫普: port(4.4, 51.22, "低地国家", { major: true }),
    海尔德: port(4.76, 52.96, "低地国家"),
    格罗宁根: port(6.57, 53.22, "低地国家"),
    汉堡: port(9.99, 53.55, "北德意志", { major: true }),
    不来梅: port(8.8, 53.08, "北德意志"),
    吕贝克: port(10.69, 53.86, "北德意志"),
    法兰克福: port(8.68, 50.11, "中欧"),
    哥本哈根: port(12.57, 55.68, "北欧", { major: true }),
    哥德堡: port(11.97, 57.71, "北欧"),
    奥斯陆: port(10.75, 59.91, "北欧"),
    卑尔根: port(5.32, 60.39, "北欧"),
    斯德哥尔摩: port(18.07, 59.33, "北欧", { major: true }),
    维斯比: port(18.29, 57.63, "波罗的海"),
    里加: port(24.1, 56.95, "波罗的海"),
    但泽: port(18.65, 54.35, "波罗的海"),
    圣彼得堡: port(30.33, 59.93, "北欧"),
    纳尔维克: port(17.43, 68.44, "欧洲极北"),
    热那亚: port(8.94, 44.41, "意大利北岸", { major: true }),
    比萨: port(10.4, 43.72, "意大利"),
    佛罗伦萨: port(11.25, 43.77, "意大利"),
    卡利亚里: port(9.12, 39.22, "撒丁岛"),
    萨萨里: port(8.56, 40.73, "撒丁岛"),
    卡尔维: port(8.76, 42.57, "科西嘉"),
    罗马: port(12.5, 41.9, "意大利"),
    那不勒斯: port(14.27, 40.85, "意大利南岸", { major: true }),
    安科纳: port(13.52, 43.62, "亚得里亚海"),
    威尼斯: port(12.33, 45.44, "亚得里亚海", { major: true }),
    的里雅斯特: port(13.77, 45.65, "亚得里亚海"),
    扎达尔: port(15.23, 44.12, "亚得里亚海"),
    拉古萨: port(18.09, 42.65, "亚得里亚海"),
    科托尔: port(18.77, 42.42, "亚得里亚海"),
    锡拉库萨: port(15.29, 37.08, "西西里"),
    萨洛尼卡: port(22.94, 40.64, "希腊"),
    雅典: port(23.73, 37.98, "希腊", { major: true }),
    甘地亚: port(25.13, 35.34, "克里特"),
    伊斯坦布尔: port(28.98, 41.0, "黑海入口", { major: true }),
    特拉布宗: port(39.73, 41.0, "黑海南岸"),
    敖德萨: port(30.72, 46.48, "黑海"),
    塞瓦斯托波尔: port(33.53, 44.62, "黑海"),
    卡法: port(35.38, 45.03, "黑海"),
    法马古斯塔: port(33.94, 35.12, "塞浦路斯"),
    贝鲁特: port(35.5, 33.89, "黎凡特"),
    雅法: port(34.75, 32.05, "黎凡特"),
    亚历山大: port(29.92, 31.2, "埃及", { major: true }),
    开罗: port(31.24, 30.04, "埃及"),
    苏伊士: port(32.55, 29.97, "红海入口"),
    班加西: port(20.06, 32.12, "北非"),
    的黎波里: port(13.19, 32.89, "北非"),
    突尼斯: port(10.18, 36.8, "北非", { major: true }),
    阿尔及尔: port(3.06, 36.75, "北非", { major: true }),
    佛得角: port(-23.5, 15.1, "非洲西岸"),
    阿尔金: port(-16.6, 20.6, "非洲西岸"),
    塞拉利昂: port(-13.23, 8.48, "非洲西岸"),
    阿比让: port(-4.03, 5.32, "非洲西岸"),
    圣乔治: port(-1.35, 5.08, "黄金海岸"),
    贝宁: port(2.43, 6.34, "几内亚湾"),
    圣多美: port(6.73, 0.34, "几内亚湾"),
    杜阿拉: port(9.7, 4.05, "几内亚湾"),
    加蓬: port(9.45, 0.39, "中非西岸"),
    罗安达: port(13.23, -8.84, "西非南岸"),
    本格拉: port(13.41, -12.58, "西非南岸"),
    卡里比布: port(15.85, -21.93, "纳米比亚"),
    开普敦: port(18.42, -33.92, "非洲南端", { major: true }),
    纳塔尔: port(31.02, -29.86, "非洲东南岸"),
    伊尼扬巴内: port(35.38, -23.86, "非洲东岸"),
    索法拉: port(34.74, -20.17, "非洲东岸"),
    莫桑比克: port(40.73, -15.03, "非洲东岸"),
    塔马塔夫: port(49.4, -18.15, "马达加斯加"),
    基尔瓦: port(39.51, -8.95, "东非"),
    桑给巴尔: port(39.2, -6.16, "东非", { major: true }),
    马林迪: port(40.12, -3.22, "东非"),
    蒙巴萨: port(39.67, -4.05, "东非"),
    摩加迪沙: port(45.31, 2.05, "东非"),
    马萨瓦: port(39.45, 15.61, "红海"),
    泽拉: port(43.47, 11.35, "红海"),
    亚丁: port(45.03, 12.79, "阿拉伯海", { major: true }),
    延布: port(38.06, 24.09, "红海"),
    吉达: port(39.17, 21.54, "红海"),
    佐法尔: port(54.09, 17.02, "阿拉伯海"),
    马斯喀特: port(58.4, 23.59, "阿曼湾", { major: true }),
    霍尔木兹: port(56.45, 27.1, "波斯湾"),
    麦纳麦: port(50.58, 26.22, "波斯湾"),
    巴士拉: port(47.78, 30.51, "波斯湾"),
    第乌: port(70.98, 20.71, "印度西岸"),
    果阿: port(73.82, 15.5, "印度西岸"),
    芒格洛尔: port(74.86, 12.91, "印度西岸"),
    卡利卡特: port(75.78, 11.25, "印度洋", { major: true }),
    科钦: port(76.27, 9.93, "印度洋", { major: true }),
    锡兰: port(79.86, 6.93, "锡兰"),
    本地治里: port(79.81, 11.93, "印度东岸"),
    马苏利帕特南: port(81.14, 16.18, "印度东岸"),
    维沙卡帕特南: port(83.3, 17.69, "印度东岸"),
    加尔各答: port(88.36, 22.57, "印度东岸"),
    勃固: port(96.48, 17.34, "缅甸"),
    亚齐: port(95.32, 5.55, "苏门答腊"),
    北大年: port(101.25, 6.87, "暹罗湾"),
    马六甲: port(102.25, 2.19, "马六甲海峡", { major: true }),
    嘉定: port(106.7, 10.78, "东南亚"),
    华富里: port(100.62, 14.8, "东南亚"),
    文莱: port(114.94, 4.9, "婆罗洲"),
    古晋: port(110.36, 1.55, "婆罗洲"),
    马辰: port(114.59, -3.32, "婆罗洲"),
    泗水: port(112.75, -7.25, "爪哇"),
    雅加达: port(106.85, -6.2, "爪哇", { major: true }),
    占碑: port(103.61, -1.59, "苏门答腊"),
    巨港: port(104.75, -2.99, "苏门答腊"),
    望加锡: port(119.43, -5.15, "苏拉威西"),
    安汶: port(128.19, -3.7, "摩鹿加"),
    特尔纳特: port(127.38, 0.79, "摩鹿加"),
    伦岛: port(129.68, -4.55, "班达海"),
    帝力: port(125.57, -8.55, "帝汶"),
    霍洛: port(121.0, 6.05, "苏禄海"),
    马尼拉: port(120.98, 14.6, "吕宋", { major: true }),
    达沃: port(125.61, 7.07, "棉兰老"),
    关岛: port(144.75, 13.44, "西太平洋"),
    萨马赖: port(150.67, -10.61, "新几内亚"),
    夏威夷: port(-157.86, 21.31, "太平洋"),
    霍巴特: port(147.33, -42.88, "大洋洲"),
    旺阿努伊: port(175.05, -39.93, "大洋洲"),
    平贾拉: port(115.88, -32.63, "澳大利亚"),
    卡卡杜: port(132.5, -12.5, "澳大利亚"),
    库加里: port(131.0, -25.0, "澳大利亚"),
    堺: port(135.47, 34.57, "日本", { major: true }),
    江户: port(139.76, 35.68, "日本", { major: true }),
    长崎: port(129.87, 32.75, "日本", { major: true }),
    浦项: port(129.37, 36.03, "朝鲜半岛"),
    釜山: port(129.07, 35.18, "朝鲜半岛", { major: true }),
    汉阳: port(126.98, 37.57, "朝鲜半岛"),
    淡水: port(121.44, 25.17, "台湾"),
    安平: port(120.16, 23.0, "台湾"),
    澳门: port(113.54, 22.2, "华南", { major: true }),
    杭州: port(120.16, 30.25, "华东"),
    泉州: port(118.67, 24.87, "华南"),
    重庆: port(106.55, 29.56, "中国内陆"),
    西安: port(108.94, 34.34, "中国内陆"),
    云台山: port(119.3, 34.6, "华东"),
    撒马尔罕: port(66.97, 39.65, "中亚"),
    上都: port(116.18, 42.36, "蒙古高原"),
    旧金山: port(-122.42, 37.77, "北美西岸", { major: true }),
    萨克拉门托: port(-121.49, 38.58, "北美西岸"),
    塔科马: port(-122.44, 47.25, "北美西岸"),
    锡特卡: port(-135.33, 57.05, "阿拉斯加"),
    巴罗: port(-156.79, 71.29, "阿拉斯加"),
    丘吉尔: port(-94.16, 58.77, "加拿大"),
    奥马哈: port(-95.94, 41.26, "北美内陆"),
    大平原: port(-100.0, 42.0, "北美内陆"),
    波士顿: port(-71.06, 42.36, "北美东岸", { major: true }),
    威廉斯塔德: port(-68.93, 12.12, "加勒比海"),
    卡宴: port(-52.33, 4.93, "南美东北岸"),
    加拉加斯: port(-66.9, 10.48, "加勒比海"),
    危地马拉: port(-90.5, 14.63, "中美"),
    大开曼: port(-81.38, 19.3, "加勒比海"),
    圣地亚哥: port(-75.83, 20.02, "加勒比海"),
    圣多明各: port(-69.93, 18.49, "加勒比海", { major: true }),
    圣胡安: port(-66.11, 18.47, "加勒比海"),
    牙买加: port(-76.79, 17.97, "加勒比海"),
    特诺奇蒂特兰: port(-99.13, 19.43, "中美内陆"),
    通贝斯: port(-80.45, -3.57, "南美西岸"),
    特鲁希略: port(-79.03, -8.11, "南美西岸"),
    拿骚: port(-77.35, 25.06, "加勒比海"),
    哈瓦那: port(-82.37, 23.11, "加勒比海", { major: true }),
    巴拿马: port(-79.52, 8.98, "中美"),
    希瓦奥阿: port(-139.0, -9.8, "南太平洋"),
    伯南布哥: port(-34.88, -8.05, "南美东岸"),
    波多贝罗: port(-79.65, 9.55, "中美"),
    皇家港: port(-76.84, 17.94, "加勒比海"),
    马拉开波: port(-71.64, 10.65, "加勒比海"),
    梅里达: port(-89.62, 20.97, "中美"),
    兰巴耶克: port(-79.91, -6.7, "南美西岸"),
    韦拉克鲁斯: port(-96.14, 19.17, "中美"),
    乌斯怀亚: port(-68.3, -54.8, "南美南端"),
    库斯科: port(-71.97, -13.53, "南美内陆"),
    科皮亚波: port(-70.33, -27.37, "南美西岸"),
    圣安东尼奥: port(-71.62, -33.59, "南美西岸"),
    巴伊亚: port(-38.5, -12.97, "南美东岸"),
    瓦尔帕莱索: port(-71.62, -33.05, "南美西岸"),
    布宜诺斯艾利斯: port(-58.38, -34.6, "南美东岸"),
    马丘比丘: port(-72.55, -13.16, "南美内陆"),
    里约热内卢: port(-43.17, -22.91, "南美东岸", { major: true }),
    利马: port(-77.04, -12.05, "南美西岸", { major: true }),
    曼加泽亚: port(82.0, 65.0, "欧亚大陆北部"),
    季克西: port(128.86, 71.64, "欧亚大陆极北"),
    彼得罗巴甫洛夫斯克: port(158.65, 53.02, "北太平洋"),
    克孜勒扎尔: port(69.16, 54.88, "欧亚内陆"),
    サグレス: port(-8.94, 37.01, "葡萄牙南岸", { label: "萨格雷斯", alias: true }),
    リスボン: port(-9.14, 38.72, "葡萄牙西岸", { label: "里斯本", alias: true }),
    オポルト: port(-8.61, 41.15, "葡萄牙北岸", { label: "奥波多", alias: true }),
    ロンドン: port(-0.1, 51.5, "英格兰", { label: "伦敦", alias: true }),
    アルジェ: port(3.06, 36.75, "北非", { label: "阿尔及尔", alias: true }),
    コチン: port(76.27, 9.93, "印度洋", { label: "科钦", alias: true }),
    ディヴ: port(70.98, 20.71, "印度西岸", { label: "第乌", alias: true })
  };

  const GAME_COORD_WRAP = 16384;
  const GAME_COORD_MAX_Y = 8192;
  const GAME_COORD_ANCHORS = [
    gameCoordAnchor("Sagres", 15781, 3244, -8.94, 37.01),
    gameCoordAnchor("Lisbon", 15782, 3205, -9.14, 38.72),
    gameCoordAnchor("Oporto", 15765, 3119, -8.61, 41.15),
    gameCoordAnchor("Seville", 15902, 3270, -5.99, 37.39),
    gameCoordAnchor("Malaga", 16058, 3274, -4.42, 36.72),
    gameCoordAnchor("Ceuta", 15970, 3360, -5.32, 35.89),
    gameCoordAnchor("Casablanca", 15773, 3445, -7.62, 33.59),
    gameCoordAnchor("Barcelona", 16357, 3110, 2.17, 41.38),
    gameCoordAnchor("Marseille", 126, 2969, 5.37, 43.3),
    gameCoordAnchor("Algiers", 35, 3275, 3.06, 36.75),
    gameCoordAnchor("London", 16324, 2418, -0.1, 51.5),
    gameCoordAnchor("Plymouth", 16085, 2494, -4.14, 50.37),
    gameCoordAnchor("Calais", 16305, 2568, 1.85, 50.95),
    gameCoordAnchor("Amsterdam", 97, 2497, 4.9, 52.37)
  ];

  const LANDMASSES = [
    {
      name: "北美洲",
      label: [-104, 47],
      className: "north-america",
      points: [
        [-168, 72],
        [-140, 72],
        [-121, 62],
        [-126, 50],
        [-123, 39],
        [-116, 32],
        [-104, 24],
        [-96, 17],
        [-86, 20],
        [-80, 27],
        [-74, 37],
        [-62, 48],
        [-59, 56],
        [-76, 62],
        [-100, 67],
        [-128, 71],
        [-168, 72]
      ]
    },
    {
      name: "南美洲",
      label: [-61, -18],
      className: "south-america",
      points: [
        [-82, 12],
        [-68, 9],
        [-51, 2],
        [-36, -8],
        [-39, -23],
        [-50, -38],
        [-66, -55],
        [-75, -44],
        [-79, -18],
        [-82, 12]
      ]
    },
    {
      name: "欧亚大陆",
      label: [60, 52],
      className: "eurasia",
      points: [
        [-11, 72],
        [12, 72],
        [35, 70],
        [70, 72],
        [112, 70],
        [150, 62],
        [171, 54],
        [148, 43],
        [130, 35],
        [116, 23],
        [103, 9],
        [91, 7],
        [78, 7],
        [69, 19],
        [58, 25],
        [44, 14],
        [37, 31],
        [28, 40],
        [11, 42],
        [-5, 36],
        [-10, 45],
        [-11, 72]
      ]
    },
    {
      name: "非洲",
      label: [21, 5],
      className: "africa",
      points: [
        [-17, 37],
        [9, 37],
        [33, 31],
        [45, 12],
        [42, -3],
        [34, -25],
        [18, -35],
        [8, -33],
        [-7, -20],
        [-17, 5],
        [-17, 37]
      ]
    },
    {
      name: "大洋洲",
      label: [135, -26],
      className: "oceania",
      points: [
        [113, -12],
        [130, -12],
        [154, -25],
        [146, -43],
        [116, -35],
        [113, -12]
      ]
    },
    {
      name: "格陵兰",
      label: [-42, 69],
      className: "greenland",
      points: [
        [-58, 74],
        [-26, 72],
        [-20, 63],
        [-40, 59],
        [-54, 65],
        [-58, 74]
      ]
    },
    {
      name: "日本列岛",
      className: "island",
      points: [
        [130, 32],
        [141, 36],
        [145, 43],
        [139, 45],
        [132, 36],
        [130, 32]
      ]
    },
    {
      name: "不列颠",
      className: "island",
      points: [
        [-7, 50],
        [-2, 58],
        [2, 55],
        [1, 50],
        [-7, 50]
      ]
    },
    {
      name: "马达加斯加",
      className: "island",
      points: [
        [49, -12],
        [51, -25],
        [46, -26],
        [44, -15],
        [49, -12]
      ]
    },
    {
      name: "新西兰",
      className: "island",
      points: [
        [166, -34],
        [178, -45],
        [173, -47],
        [165, -39],
        [166, -34]
      ]
    }
  ];

  const OCEAN_LABELS = [
    { text: "北大西洋", lon: -38, lat: 39 },
    { text: "南大西洋", lon: -20, lat: -23 },
    { text: "地中海", lon: 16, lat: 35 },
    { text: "北海", lon: 4, lat: 56 },
    { text: "印度洋", lon: 75, lat: -15 },
    { text: "东南亚海域", lon: 117, lat: 0 },
    { text: "太平洋", lon: -150, lat: -7 },
    { text: "加勒比海", lon: -77, lat: 17 }
  ];

  const SEA_WAYPOINTS = {
    萨格雷斯外海: seaPoint("萨格雷斯外海", -9.15, 36.82),
    圣文森特角外海: seaPoint("圣文森特角外海", -9.15, 37.18),
    里斯本外海: seaPoint("里斯本外海", -9.55, 38.72),
    葡萄牙西岸外海: seaPoint("葡萄牙西岸外海", -9.75, 40.0),
    奥波多外海: seaPoint("奥波多外海", -9.25, 41.25),
    加利西亚外海: seaPoint("加利西亚外海", -9.7, 43.4),
    比斯开湾西南: seaPoint("比斯开湾西南", -8.8, 44.7),
    比斯开湾北部: seaPoint("比斯开湾北部", -5.0, 46.8),
    布列塔尼外海: seaPoint("布列塔尼外海", -5.8, 48.2),
    康沃尔外海: seaPoint("康沃尔外海", -5.2, 50.0),
    怀特岛外海: seaPoint("怀特岛外海", -1.4, 50.5),
    泰晤士河口: seaPoint("泰晤士河口", 1.15, 51.55),
    加来外海: seaPoint("加来外海", 1.75, 50.95),
    阿尔及尔外海: seaPoint("阿尔及尔外海", 3.0, 36.9),
    北非西岸航道: seaPoint("北非西岸航道", 1.2, 36.7),
    西班牙南岸外海: seaPoint("西班牙南岸外海", -3.5, 36.25),
    直布罗陀海峡中线: seaPoint("直布罗陀海峡中线", -5.35, 35.95),
    葡萄牙南岸外海: seaPoint("葡萄牙南岸外海", -9.2, 36.5),
    比斯开湾外海: seaPoint("比斯开湾外海", -6.6, 45.4),
    韦桑岛外海: seaPoint("韦桑岛外海", -5.2, 48.6),
    英吉利海峡西口: seaPoint("英吉利海峡西口", -3.5, 49.7),
    多佛海峡: seaPoint("多佛海峡", 1.25, 51.0),
    北海南部: seaPoint("北海南部", 3.3, 52.4),
    直布罗陀海峡西口: seaPoint("直布罗陀海峡西口", -6.0, 35.85),
    直布罗陀海峡东口: seaPoint("直布罗陀海峡东口", -4.25, 36.0),
    阿尔沃兰海: seaPoint("阿尔沃兰海", -2.6, 36.2),
    西地中海中线: seaPoint("西地中海中线", 4.2, 38.2),
    撒丁岛南方海域: seaPoint("撒丁岛南方海域", 9.2, 38.2),
    西西里海峡: seaPoint("西西里海峡", 12.2, 37.1),
    爱奥尼亚海: seaPoint("爱奥尼亚海", 19.5, 36.4),
    克里特北方海域: seaPoint("克里特北方海域", 25.0, 35.7),
    尼罗河口外海: seaPoint("尼罗河口外海", 30.2, 31.5),
    苏伊士湾: seaPoint("苏伊士湾", 32.6, 29.3),
    红海中部: seaPoint("红海中部", 39.0, 20.0),
    曼德海峡: seaPoint("曼德海峡", 43.2, 12.7),
    加那利外海: seaPoint("加那利外海", -16.2, 28.2),
    佛得角外海: seaPoint("佛得角外海", -23.4, 15.6),
    几内亚湾外海: seaPoint("几内亚湾外海", -1.5, 3.8),
    刚果外海: seaPoint("刚果外海", 11.5, -7.0),
    好望角外海: seaPoint("好望角外海", 18.2, -35.2),
    莫桑比克海峡: seaPoint("莫桑比克海峡", 40.5, -18.0),
    桑给巴尔外海: seaPoint("桑给巴尔外海", 40.1, -6.2),
    亚丁湾: seaPoint("亚丁湾", 45.2, 12.5),
    阿曼外海: seaPoint("阿曼外海", 58.4, 20.4),
    印度西岸航道: seaPoint("印度西岸航道", 73.5, 15.5),
    锡兰外海: seaPoint("锡兰外海", 80.2, 6.5),
    孟加拉湾: seaPoint("孟加拉湾", 90.0, 12.0),
    马六甲海峡: seaPoint("马六甲海峡", 101.4, 2.6),
    南海西部: seaPoint("南海西部", 112.5, 10.0),
    台湾海峡: seaPoint("台湾海峡", 120.5, 24.0),
    日本西海道: seaPoint("日本西海道", 130.0, 32.2),
    亚速尔外海: seaPoint("亚速尔外海", -28.0, 36.0),
    大西洋中部: seaPoint("大西洋中部", -45.0, 28.0),
    巴哈马外海: seaPoint("巴哈马外海", -76.0, 24.5)
  };

  const templateFactories = {
    trade: buildTradePlan,
    adventure: buildAdventurePlan,
    battle: buildBattlePlan,
    story: buildStoryPlan,
    generic: buildGenericPlan
  };

  const els = {
    form: document.querySelector("#quest-form"),
    input: document.querySelector("#quest-input"),
    chips: Array.from(document.querySelectorAll(".chip")),
    questList: document.querySelector("#quest-list"),
    questCount: document.querySelector("#quest-count"),
    matchStatus: document.querySelector("#match-status"),
    resultType: document.querySelector("#result-type"),
    resultTitle: document.querySelector("#result-title"),
    confidence: document.querySelector("#confidence"),
    metaGrid: document.querySelector("#meta-grid"),
    routeMap: document.querySelector("#route-map"),
    routeSummary: document.querySelector("#route-summary"),
    positionForm: document.querySelector("#position-form"),
    positionGameX: document.querySelector("#position-game-x"),
    positionGameY: document.querySelector("#position-game-y"),
    positionLat: document.querySelector("#position-lat"),
    positionLon: document.querySelector("#position-lon"),
    positionStatus: document.querySelector("#position-status"),
    positionClear: document.querySelector("#position-clear"),
    calibrationForm: document.querySelector("#calibration-form"),
    calibrationPort: document.querySelector("#calibration-port"),
    calibrationPortList: document.querySelector("#calibration-port-list"),
    calibrationStatus: document.querySelector("#calibration-status"),
    calibrationClear: document.querySelector("#calibration-clear"),
    marketForm: document.querySelector("#market-form"),
    marketQuery: document.querySelector("#market-query"),
    marketResults: document.querySelector("#market-results"),
    steps: document.querySelector("#steps"),
    prepList: document.querySelector("#prep-list"),
    notesList: document.querySelector("#notes-list"),
    copyBtn: document.querySelector("#copy-btn"),
    exportBtn: document.querySelector("#export-btn"),
    importFile: document.querySelector("#import-file"),
    saveGeneratedBtn: document.querySelector("#save-generated-btn"),
    resetBtn: document.querySelector("#reset-btn"),
    toast: document.querySelector("#toast")
  };

  const state = {
    filter: "all",
    quests: loadQuests(),
    activeQuestId: null,
    currentPlan: null,
    currentPosition: null,
    calibrationAnchors: loadCalibrationAnchors(),
    leafletMap: null,
    shipMarker: null,
    positionPollTimer: null,
    toastTimer: null
  };

  init();

  function init() {
    bindEvents();
    renderQuestList();
    renderPlan(buildGenericPlan("准备开始一段新任务"), {
      status: "等待输入任务",
      confidence: 0
    });
    bindPositionControls();
    populateCalibrationPortList();
    updateCalibrationStatus();
    bindMarketControls();
    startPositionPolling();

    if (window.lucide) {
      window.lucide.createIcons();
    } else {
      window.addEventListener("load", () => {
        if (window.lucide) window.lucide.createIcons();
      });
    }
  }

  function bindEvents() {
    els.form.addEventListener("submit", (event) => {
      event.preventDefault();
      const query = els.input.value.trim();
      if (!query) {
        showToast("先输入一个任务名称或任务描述。");
        els.input.focus();
        return;
      }
      resolveQuest(query);
    });

    els.input.addEventListener("input", () => {
      renderQuestList(els.input.value);
    });

    els.chips.forEach((chip) => {
      chip.addEventListener("click", () => {
        state.filter = chip.dataset.filter;
        els.chips.forEach((item) => item.classList.toggle("active", item === chip));
        renderQuestList(els.input.value);
      });
    });

    els.copyBtn.addEventListener("click", copyCurrentPlan);
    els.exportBtn.addEventListener("click", exportLibrary);
    els.importFile.addEventListener("change", importLibrary);
    els.saveGeneratedBtn.addEventListener("click", saveGeneratedPlan);
    els.resetBtn.addEventListener("click", resetLibrary);
  }

  function bindPositionControls() {
    els.positionForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const manualPosition = readPositionForm();
      if (!manualPosition) {
        showToast("请输入游戏坐标 X/Y，或经纬度。");
        return;
      }
      await updatePosition(manualPosition);
      showToast("船位已显示在地图上。");
      return;
      const lat = Number(els.positionLat.value);
      const lon = Number(els.positionLon.value);
      if (!isValidLatLon(lat, lon)) {
        showToast("请输入有效纬度和经度。");
        return;
      }
      await updatePosition({ lat, lon, label: "当前船位", source: "manual" });
      showToast("船位已显示在地图上。");
    });

    els.positionClear?.addEventListener("click", async () => {
      state.currentPosition = null;
      updateShipMarker();
      updatePositionStatus();
      if (canUseLocalApi()) {
        await fetch("/api/position", { method: "DELETE" }).catch(() => {});
      }
    });

    els.calibrationForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const result = addCalibrationFromCurrentPosition();
      if (!result.ok) {
        showToast(result.message);
        return;
      }
      showToast(`已添加校准点：${result.label}`);
      if (state.currentPosition?.gameX !== undefined && state.currentPosition?.gameY !== undefined) {
        await updatePosition({
          gameX: state.currentPosition.gameX,
          gameY: state.currentPosition.gameY,
          label: "当前船位",
          source: "calibrated"
        });
      }
    });

    els.calibrationClear?.addEventListener("click", async () => {
      state.calibrationAnchors = [];
      saveCalibrationAnchors();
      updateCalibrationStatus();
      if (state.currentPosition?.gameX !== undefined && state.currentPosition?.gameY !== undefined) {
        await updatePosition({
          gameX: state.currentPosition.gameX,
          gameY: state.currentPosition.gameY,
          label: "当前船位",
          source: "game"
        });
      }
      showToast("地图校准已清空。");
    });
  }

  function bindMarketControls() {
    els.marketForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const query = els.marketQuery?.value.trim() || "";
      const mode =
        els.marketForm.querySelector('input[name="market-mode"]:checked')?.value === "port"
          ? "port"
          : "item";
      if (!query) {
        showToast("请输入物品名或港口名。");
        els.marketQuery?.focus();
        return;
      }

      renderMarketLoading(mode, query);
      try {
        const response = await fetch(
          `/api/market?${new URLSearchParams({ mode, q: query })}`,
          { cache: "no-store" }
        );
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error || "查询失败");
        }
        const result = await response.json();
        renderMarketResult(result);
      } catch (error) {
        if (els.marketResults) {
          els.marketResults.innerHTML = `<p>没有查到结果，或者本地服务暂时无法连接 GVDB。可以换日文名再试一次。</p>`;
        }
        showToast(error.message || "交易查询失败。");
      }
    });
  }

  function renderMarketLoading(mode, query) {
    if (!els.marketResults) return;
    els.marketResults.innerHTML = `<p>正在查询 ${escapeHtml(query)}...</p>`;
  }

  function renderMarketResult(result) {
    if (!els.marketResults) return;
    if (result.mode === "port") {
      renderPortMarketResult(result);
    } else {
      renderItemMarketResult(result);
    }
    if (window.lucide) window.lucide.createIcons();
  }

  function renderItemMarketResult(result) {
    const ports = Array.isArray(result.ports) ? result.ports : [];
    const item = result.item || {};
    const title = formatDualName(item.zh, item.jp);
    if (!ports.length) {
      els.marketResults.innerHTML = `
        <div class="market-result-heading">
          <strong>${escapeHtml(title || result.query || "物品")}</strong>
          ${renderSourceLink(result.source)}
        </div>
        <p>没有找到销售港。可以试试日文名，或确认它是不是交易品。</p>
      `;
      return;
    }

    els.marketResults.innerHTML = `
      <div class="market-result-heading">
        <strong>${escapeHtml(title)}</strong>
        <span>${ports.length} 个销售港${result.cached ? " · 已缓存" : ""}</span>
        ${renderSourceLink(result.source)}
      </div>
      <div class="market-result-list">
        ${ports
          .slice(0, 24)
          .map(
            (port) => `
              <a class="market-row" href="${escapeHtml(port.url)}" target="_blank" rel="noreferrer">
                <span>
                  <strong>${escapeHtml(formatDualName(port.townZh, port.townJp, { forceSecondary: true }))}</strong>
                  <em>${escapeHtml(formatDualName(port.regionZh, port.regionJp, { forceSecondary: true }))}</em>
                </span>
                <b>${escapeHtml(port.price || "-")}${port.alliedPrice ? ` / ${escapeHtml(port.alliedPrice)}` : ""}</b>
              </a>
            `
          )
          .join("")}
      </div>
    `;
  }

  function renderPortMarketResult(result) {
    const port = result.port || {};
    const sections = Array.isArray(result.sections) ? result.sections : [];
    const saleSections = sections
      .filter((section) => Array.isArray(section.items) && section.items.length)
      .slice(0, 6);
    const title = formatDualName(port.zh, port.jp, { forceSecondary: true });
    if (!saleSections.length) {
      els.marketResults.innerHTML = `
        <div class="market-result-heading">
          <strong>${escapeHtml(title || result.query || "港口")}</strong>
          ${renderSourceLink(result.source)}
        </div>
        <p>这个港口没有查到销售品，可能是补给港，或 GVDB 没有登记。</p>
      `;
      return;
    }

    els.marketResults.innerHTML = `
      <div class="market-result-heading">
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(formatPortMeta(port))}${result.cached ? " · 已缓存" : ""}</span>
        ${renderSourceLink(result.source)}
      </div>
      ${saleSections
        .map(
          (section) => `
            <div class="market-section">
              <h4>${escapeHtml(section.name)}</h4>
              <div class="market-result-list">
                ${section.items
                  .slice(0, section.name === "交易品販売" ? 30 : 12)
                  .map(
                    (item) => `
                      <a class="market-row" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">
                        <span>
                          <strong>${escapeHtml(formatDualName(item.itemZh, item.itemJp))}</strong>
                          <em>${escapeHtml(formatDualName(item.groupZh, item.groupJp))}</em>
                        </span>
                        <b>${escapeHtml(item.price || "-")}${item.alliedPrice ? ` / ${escapeHtml(item.alliedPrice)}` : item.npc ? ` · ${escapeHtml(item.npc)}` : ""}</b>
                      </a>
                    `
                  )
                  .join("")}
              </div>
            </div>
          `
        )
        .join("")}
    `;
  }

  function formatDualName(primary, secondary, options = {}) {
    const left = String(primary || "").trim();
    const right = String(secondary || "").trim();
    if (!left) return right;
    if (!right || (!options.forceSecondary && normalize(left) === normalize(right))) return left;
    return `${left}（${right}）`;
  }

  function formatPortMeta(port) {
    return [formatDualName(port.regionZh, port.regionJp), port.coordinate ? `坐标 ${port.coordinate}` : ""]
      .filter(Boolean)
      .join(" · ");
  }

  function renderSourceLink(source) {
    if (!source) return "";
    return `<a class="market-source" href="${escapeHtml(source)}" target="_blank" rel="noreferrer">GVDB</a>`;
  }

  function readPositionForm() {
    const gameXText = els.positionGameX?.value.trim() || "";
    const gameYText = els.positionGameY?.value.trim() || "";
    const hasGameInput = gameXText || gameYText;
    if (hasGameInput) {
      const gameX = Number(gameXText);
      const gameY = Number(gameYText);
      if (!isValidGameCoord(gameX, gameY)) return null;
      return {
        gameX,
        gameY,
        label: "当前船位",
        source: "manual-game"
      };
    }

    const latText = els.positionLat?.value.trim() || "";
    const lonText = els.positionLon?.value.trim() || "";
    if (!latText && !lonText) return null;
    const lat = Number(latText);
    const lon = Number(lonText);
    if (!isValidLatLon(lat, lon)) return null;
    return {
      lat,
      lon,
      label: "当前船位",
      source: "manual"
    };
  }

  function populateCalibrationPortList() {
    if (!els.calibrationPortList) return;
    const names = uniquePorts()
      .map(({ key, coord }) => coord.label || key)
      .filter(Boolean)
      .sort((left, right) => left.localeCompare(right, "zh-CN"));
    els.calibrationPortList.innerHTML = names
      .map((name) => `<option value="${escapeHtml(name)}"></option>`)
      .join("");
  }

  function addCalibrationFromCurrentPosition() {
    if (!state.currentPosition || !Number.isFinite(state.currentPosition.gameX) || !Number.isFinite(state.currentPosition.gameY)) {
      return { ok: false, message: "先用 OCR 或游戏 X/Y 显示一次当前船位。" };
    }

    const query = els.calibrationPort?.value.trim() || "";
    if (!query) return { ok: false, message: "请输入当前所在港口名。" };

    const target = resolveCalibrationPort(query);
    if (!target) return { ok: false, message: "没有找到这个港口，请换中文名或日文名。" };

    const anchor = normalizeCalibrationAnchor({
      id: normalize(target.label),
      label: target.label,
      gameX: state.currentPosition.gameX,
      gameY: state.currentPosition.gameY,
      lon: target.coord.lon,
      lat: target.coord.lat,
      createdAt: new Date().toISOString()
    });
    if (!anchor) return { ok: false, message: "当前船位或港口坐标无效。" };

    state.calibrationAnchors = [
      anchor,
      ...state.calibrationAnchors.filter((item) => normalize(item.label) !== normalize(anchor.label))
    ].slice(0, 40);
    saveCalibrationAnchors();
    updateCalibrationStatus();
    return { ok: true, label: anchor.label };
  }

  function resolveCalibrationPort(query) {
    const direct = getPortCoord(query);
    if (direct) return { label: direct.label || query, coord: direct };
    const normalizedQuery = normalize(query);
    const entry = Object.entries(PORT_COORDS).find(([key, coord]) => {
      const label = coord.label || key;
      return normalize(key) === normalizedQuery || normalize(label) === normalizedQuery;
    });
    if (!entry) return null;
    const [key, coord] = entry;
    return { label: coord.label || key, coord };
  }

  function loadCalibrationAnchors() {
    try {
      const saved = JSON.parse(localStorage.getItem(CALIBRATION_STORAGE_KEY));
      if (!Array.isArray(saved)) return [];
      return saved.map(normalizeCalibrationAnchor).filter(Boolean).slice(0, 40);
    } catch (error) {
      console.warn("Failed to load map calibrations", error);
      return [];
    }
  }

  function saveCalibrationAnchors() {
    localStorage.setItem(CALIBRATION_STORAGE_KEY, JSON.stringify(state.calibrationAnchors));
  }

  function normalizeCalibrationAnchor(anchor) {
    if (!anchor) return null;
    const gameX = Number(anchor.gameX);
    const gameY = Number(anchor.gameY);
    const lon = Number(anchor.lon);
    const lat = Number(anchor.lat);
    if (!isValidGameCoord(gameX, gameY) || !isValidLatLon(lat, lon)) return null;
    const label = String(anchor.label || "校准点").slice(0, 40);
    return {
      id: String(anchor.id || normalize(label) || `${Math.round(gameX)}-${Math.round(gameY)}`).slice(0, 80),
      label,
      gameX: normalizeGameX(gameX),
      gameY: Math.round(gameY),
      lon: normalizeLon(lon),
      lat,
      source: "calibration",
      createdAt: anchor.createdAt || new Date().toISOString()
    };
  }

  function updateCalibrationStatus() {
    if (!els.calibrationStatus) return;
    const count = state.calibrationAnchors.length;
    if (!count) {
      els.calibrationStatus.textContent = "未添加校准点";
      return;
    }
    const labels = state.calibrationAnchors.slice(0, 3).map((anchor) => anchor.label).join("、");
    const hint =
      count === 1
        ? "；单点只修正附近"
        : count === 2
          ? "；再加 1 点更稳"
          : "；区域校准";
    els.calibrationStatus.textContent = `已校准 ${count} 点：${labels}${count > 3 ? "…" : ""}${hint}`;
  }

  function loadQuests() {
    const starter = Array.isArray(window.STARTER_QUESTS) ? window.STARTER_QUESTS : [];
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (Array.isArray(saved) && saved.length > 0) {
        return normalizeQuestList(saved);
      }
    } catch (error) {
      console.warn("Failed to load quest library", error);
    }
    return normalizeQuestList(starter);
  }

  function saveLibrary() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.quests, null, 2));
  }

  function normalizeQuestList(quests) {
    return quests
      .filter((quest) => quest && quest.title)
      .map((quest, index) => ({
        id: quest.id || `quest-${Date.now()}-${index}`,
        title: quest.title,
        type: normalizeType(quest.type || inferType([quest.title, ...ensureArray(quest.tags)].join(" "))),
        version: quest.version || "自定义",
        aliases: ensureArray(quest.aliases),
        tags: ensureArray(quest.tags),
        start: quest.start || "待补充",
        destination: quest.destination || "待补充",
        npc: quest.npc || "待补充",
        difficulty: quest.difficulty || "待判断",
        estimatedTime: quest.estimatedTime || "待判断",
        reward: quest.reward || "待补充",
        requirements: ensureArray(quest.requirements),
        prep: ensureArray(quest.prep),
        steps: ensureArray(quest.steps),
        notes: ensureArray(quest.notes)
      }));
  }

  function ensureArray(value) {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value === "string" && value.trim()) return splitImportList(value);
    return [];
  }

  function renderQuestList(query = "") {
    const normalizedQuery = normalize(query);
    const visible = state.quests
      .filter((quest) => state.filter === "all" || quest.type === state.filter)
      .map((quest) => ({ quest, score: scoreQuest(normalizedQuery, quest) }))
      .filter((item) => !normalizedQuery || item.score > 0)
      .sort((a, b) => b.score - a.score || a.quest.title.localeCompare(b.quest.title, "zh-CN"));

    els.questCount.textContent = `${visible.length}/${state.quests.length}`;
    els.questList.innerHTML = "";

    if (visible.length === 0) {
      const empty = document.createElement("div");
      empty.className = "quest-item";
      empty.innerHTML = "<strong>没有匹配任务</strong><span>可直接生成模板步骤</span>";
      els.questList.appendChild(empty);
      return;
    }

    visible.forEach(({ quest }) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `quest-item${quest.id === state.activeQuestId ? " active" : ""}`;
      button.innerHTML = `
        <strong>${escapeHtml(quest.title)}</strong>
        <span>${escapeHtml(TYPE_LABELS[quest.type] || "通用")} · ${escapeHtml(
          quest.destination || "待补充"
        )}</span>
      `;
      button.addEventListener("click", () => {
        state.activeQuestId = quest.id;
        els.input.value = quest.title.replace(/^示例：/, "");
        renderQuestList(els.input.value);
        renderPlan(quest, {
          status: "已从任务库载入",
          confidence: 100,
          source: "library"
        });
      });
      els.questList.appendChild(button);
    });
  }

  async function resolveQuest(rawQuery) {
    const query = normalize(rawQuery);
    const matches = state.quests
      .filter((quest) => state.filter === "all" || quest.type === state.filter)
      .map((quest) => ({ quest, score: scoreQuest(query, quest) }))
      .sort((a, b) => b.score - a.score);

    const best = matches[0];
    const shouldRefresh = best && best.score >= 62 && shouldRefreshFromGvdb(best.quest);
    if (best && best.score >= 62 && !shouldRefresh) {
      state.activeQuestId = best.quest.id;
      renderQuestList(rawQuery);
      renderPlan(best.quest, {
        status: "命中任务库",
        confidence: Math.min(100, best.score),
        source: "library"
      });
      return;
    }

    const onlineQuest = await lookupJapaneseQuest(rawQuery);
    if (onlineQuest) {
      state.quests = mergeQuestLists(state.quests, normalizeQuestList([onlineQuest]));
      saveLibrary();
      const saved = state.quests.find((quest) => normalize(quest.title) === normalize(onlineQuest.title)) || onlineQuest;
      state.activeQuestId = saved.id;
      renderQuestList(rawQuery);
      renderPlan(saved, {
        status: "已从日文资料站导入",
        confidence: 100,
        source: "library"
      });
      return;
    }

    if (best && best.score >= 62) {
      state.activeQuestId = best.quest.id;
      renderQuestList(rawQuery);
      renderPlan(best.quest, {
        status: shouldRefresh ? "命中任务库，在线刷新未成功" : "命中任务库",
        confidence: Math.min(100, best.score),
        source: "library"
      });
      return;
    }

    const inferredType = state.filter === "all" ? inferType(rawQuery) : state.filter;
    const factory = templateFactories[inferredType] || templateFactories.generic;
    const plan = factory(rawQuery);
    state.activeQuestId = null;
    renderQuestList(rawQuery);
    renderPlan(plan, {
      status: "已生成模板步骤",
      confidence: Math.max(42, best ? Math.min(best.score, 58) : 42),
      source: "generated"
    });
  }

  async function lookupJapaneseQuest(rawQuery) {
    if (!canUseLocalApi()) {
      if (/[ぁ-ゔァ-ヴー]/.test(rawQuery)) {
        showToast("要直接查询日服任务，请用 start-web.cmd 启动网页工具。");
      }
      return null;
    }

    els.matchStatus.textContent = "正在查询日文资料站...";
    try {
      const response = await fetch("/api/gvdb", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ query: rawQuery })
      });

      if (!response.ok) {
        return null;
      }

      const payload = await response.json();
      const quests = normalizeQuestList(payload.quests || []);
      if (!quests.length) return null;
      showToast(`已从日文资料站找到：${quests[0].title}`);
      return quests[0];
    } catch (error) {
      console.warn("GVDB lookup failed", error);
      showToast("在线查询不可用。请用 start-web.cmd 启动网页工具。");
      return null;
    }
  }

  function startPositionPolling() {
    updatePositionStatus();
    if (!canUseLocalApi()) return;
    pollPosition();
    state.positionPollTimer = window.setInterval(pollPosition, 2000);
  }

  async function pollPosition() {
    try {
      const response = await fetch("/api/position", { cache: "no-store" });
      if (!response.ok) return;
      const payload = await response.json();
      if (payload.position) {
        applyPosition(payload.position, { fillInputs: true });
      }
    } catch (error) {
      // The page can still work without the local position API.
    }
  }

  async function updatePosition(position) {
    applyPosition(position, { fillInputs: true });
    if (!canUseLocalApi()) return;
    const response = await fetch("/api/position", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(position)
    });
    if (response.ok) {
      const payload = await response.json();
      if (payload.position) applyPosition(payload.position, { fillInputs: true });
    }
  }

  function applyPosition(position, options = {}) {
    const normalizedPosition = normalizePositionInput(position);
    if (!normalizedPosition) return;
    state.currentPosition = normalizedPosition;
    const positionLat = normalizedPosition.lat;
    const positionLon = normalizedPosition.lon;
    if (options.fillInputs) {
      if (els.positionLat) els.positionLat.value = String(Math.round(positionLat * 10000) / 10000);
      if (els.positionLon) els.positionLon.value = String(Math.round(positionLon * 10000) / 10000);
      if (els.positionGameX) els.positionGameX.value = Number.isFinite(normalizedPosition.gameX) ? String(Math.round(normalizedPosition.gameX)) : "";
      if (els.positionGameY) els.positionGameY.value = Number.isFinite(normalizedPosition.gameY) ? String(Math.round(normalizedPosition.gameY)) : "";
    }
    if (!state.leafletMap && state.currentPlan) {
      renderRouteMap(state.currentPlan);
    }
    if (!state.leafletMap && window.L) {
      renderPositionOnlyMap();
    }
    updateShipMarker();
    updatePositionStatus();
    return;
    const lat = Number(position.lat);
    const lon = Number(position.lon);
    if (!isValidLatLon(lat, lon)) return;
    state.currentPosition = {
      lat,
      lon,
      label: position.label || "当前船位",
      source: position.source || "manual",
      updatedAt: position.updatedAt || new Date().toISOString()
    };
    if (options.fillInputs) {
      els.positionLat.value = String(Math.round(lat * 10000) / 10000);
      els.positionLon.value = String(Math.round(lon * 10000) / 10000);
    }
    updateShipMarker();
    if (!state.leafletMap && state.currentPlan) {
      renderRouteMap(state.currentPlan);
    }
    updatePositionStatus();
  }

  function updatePositionStatus() {
    if (!els.positionStatus) return;
    updatePositionStatusText();
    return;
    if (!state.currentPosition) {
      els.positionStatus.textContent = canUseLocalApi()
        ? "等待坐标，可手动输入或由外部工具推送"
        : "请用 start-web.cmd 启动后使用实时船位";
      return;
    }
    const { lat, lon, source, updatedAt } = state.currentPosition;
    const time = updatedAt ? new Date(updatedAt).toLocaleTimeString("zh-CN", { hour12: false }) : "";
    els.positionStatus.textContent = `${lat.toFixed(4)}, ${lon.toFixed(4)} · ${source || "manual"}${time ? ` · ${time}` : ""}`;
  }

  function isValidLatLon(lat, lon) {
    return Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
  }

  function normalizePositionInput(position = {}) {
    const rawLat = Number(position.lat);
    const rawLon = Number(position.lon);
    const rawGameX = Number(position.gameX);
    const rawGameY = Number(position.gameY);
    const hasLatLon = isValidLatLon(rawLat, rawLon);
    const hasGameCoord = isValidGameCoord(rawGameX, rawGameY);
    const converted = hasLatLon ? null : hasGameCoord ? convertGameCoordToLatLon(rawGameX, rawGameY) : null;
    if (!hasLatLon && !converted) return null;

    return {
      lat: hasLatLon ? rawLat : converted.lat,
      lon: hasLatLon ? rawLon : converted.lon,
      ...(hasGameCoord
        ? {
            gameX: normalizeGameX(rawGameX),
            gameY: Math.round(rawGameY)
          }
        : {}),
      label: String(position.label || "当前船位").slice(0, 40),
      source: String(position.source || (hasGameCoord ? "game" : "manual")).slice(0, 40),
      updatedAt: position.updatedAt || new Date().toISOString(),
      conversion: converted
        ? {
            anchors: converted.anchors,
            confidence: converted.confidence,
            calibrationInfluence: converted.calibrationInfluence
          }
        : position.conversion
    };
  }

  function updatePositionStatusText() {
    if (!state.currentPosition) {
      els.positionStatus.textContent = canUseLocalApi()
        ? "等待坐标：可输入游戏 X/Y，也可由外部 OCR 推送。"
        : "请先用 start-web.cmd 打开网页工具。";
      return;
    }
    const time = state.currentPosition.updatedAt
      ? new Date(state.currentPosition.updatedAt).toLocaleTimeString("zh-CN", { hour12: false })
      : "";
    els.positionStatus.textContent = [formatPositionDetails(state.currentPosition), state.currentPosition.source || "manual", time]
      .filter(Boolean)
      .join(" | ");
  }

  function formatPositionDetails(position) {
    const parts = [];
    if (Number.isFinite(position.gameX) && Number.isFinite(position.gameY)) {
      parts.push(`游戏坐标 ${Math.round(position.gameX)}, ${Math.round(position.gameY)}`);
    }
    if (Number.isFinite(position.lat) && Number.isFinite(position.lon)) {
      parts.push(`地图约 ${position.lat.toFixed(4)}, ${position.lon.toFixed(4)}`);
    }
    const calibrationNames = position.conversion?.anchors?.filter((name) => String(name).startsWith("校准:")) || [];
    if (calibrationNames.length) {
      const influence = Number(position.conversion?.calibrationInfluence);
      const suffix = Number.isFinite(influence) ? ` ${Math.round(influence * 100)}%` : "";
      parts.push(`使用${calibrationNames[0].replace("校准:", "")}校准${suffix}`);
    }
    return parts.join(" | ");
  }

  function isValidGameCoord(gameX, gameY) {
    return Number.isFinite(gameX) && Number.isFinite(gameY) && gameX >= 0 && gameX <= GAME_COORD_WRAP && gameY >= 0 && gameY <= GAME_COORD_MAX_Y;
  }

  function convertGameCoordToLatLon(gameX, gameY) {
    const base = convertGameCoordWithAnchors(gameX, gameY, GAME_COORD_ANCHORS);
    return applyCalibrationOffsets(gameX, gameY, base) || base;
  }

  function convertGameCoordWithAnchors(gameX, gameY, anchors) {
    const x = normalizeGameX(gameX);
    const y = Number(gameY);
    const nearestAnchors = anchors.map((anchor) => {
      const unwrappedX = unwrapGameX(anchor.gameX, x);
      const dx = unwrappedX - x;
      const dy = anchor.gameY - y;
      return {
        anchor,
        unwrappedX,
        distance: Math.hypot(dx, dy)
      };
    })
      .sort((left, right) => left.distance - right.distance)
      .slice(0, 8);

    if (nearestAnchors[0]?.distance <= 0.5) {
      return {
        lat: nearestAnchors[0].anchor.lat,
        lon: nearestAnchors[0].anchor.lon,
        confidence: 1,
        anchors: [nearestAnchors[0].anchor.label]
      };
    }

    const lat = solveWeightedAffine(nearestAnchors, "lat", x, y);
    const lon = solveWeightedAffine(nearestAnchors, "lon", x, y);
    const fallback = weightedAnchorAverage(nearestAnchors);
    return {
      lat: clampNumber(Number.isFinite(lat) ? lat : fallback.lat, -85, 85),
      lon: normalizeLon(Number.isFinite(lon) ? lon : fallback.lon),
      confidence: Math.max(0.25, Math.min(0.95, 1 - (nearestAnchors[0]?.distance || 0) / 900)),
      anchors: nearestAnchors.slice(0, 3).map((item) => item.anchor.label)
    };
  }

  function applyCalibrationOffsets(gameX, gameY, basePosition) {
    const calibrations = state.calibrationAnchors || [];
    if (!basePosition || !calibrations.length) return null;

    const x = normalizeGameX(gameX);
    const y = Number(gameY);
    const calibrationCount = calibrations.length;
    const nearby = calibrations
      .map((anchor) => {
        const unwrappedX = unwrapGameX(anchor.gameX, x);
        const distance = Math.hypot(unwrappedX - x, anchor.gameY - y);
        return { anchor, distance };
      })
      .sort((left, right) => left.distance - right.distance)
      .slice(0, 6);

    if (!nearby.length) return null;
    const nearestDistance = nearby[0].distance;
    const influence = getCalibrationInfluence(nearestDistance, calibrationCount);
    if (influence <= 0) return null;
    if (nearby[0].distance <= 0.5) {
      return {
        lat: nearby[0].anchor.lat,
        lon: nearby[0].anchor.lon,
        confidence: 1,
        calibrationInfluence: 1,
        anchors: [`校准:${nearby[0].anchor.label}`]
      };
    }

    let totalWeight = 0;
    let latOffset = 0;
    let lonOffset = 0;
    nearby.forEach(({ anchor, distance }) => {
      const baseAtAnchor = convertGameCoordWithAnchors(anchor.gameX, anchor.gameY, GAME_COORD_ANCHORS);
      if (!baseAtAnchor) return;
      const weight = 1 / Math.max(1, Math.pow(distance, 1.15));
      totalWeight += weight;
      latOffset += (anchor.lat - baseAtAnchor.lat) * weight;
      lonOffset += normalizeLonDelta(anchor.lon - baseAtAnchor.lon) * weight;
    });
    if (!totalWeight) return null;

    const offsetLat = (latOffset / totalWeight) * influence;
    const offsetLon = (lonOffset / totalWeight) * influence;
    return {
      lat: clampNumber(basePosition.lat + offsetLat, -85, 85),
      lon: normalizeLon(basePosition.lon + offsetLon),
      confidence: Math.max(basePosition.confidence || 0.25, Math.max(0.35, influence)),
      calibrationInfluence: influence,
      anchors: [
        ...nearby.slice(0, 3).map((item) => `校准:${item.anchor.label}`),
        ...(basePosition.anchors || []).slice(0, 2)
      ]
    };
  }

  function getCalibrationInfluence(distance, calibrationCount) {
    if (!Number.isFinite(distance)) return 0;
    const fullRadius = calibrationCount >= 3 ? 220 : calibrationCount === 2 ? 160 : 90;
    const maxRadius = calibrationCount >= 3 ? 2600 : calibrationCount === 2 ? 1500 : 700;
    if (distance <= fullRadius) return 1;
    if (distance >= maxRadius) return 0;
    const t = (distance - fullRadius) / (maxRadius - fullRadius);
    return Math.max(0, Math.min(1, Math.pow(1 - t, 2)));
  }

  function solveWeightedAffine(points, valueKey, originX, originY) {
    if (points.length < 3) return NaN;
    const matrix = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0]
    ];
    const vector = [0, 0, 0];

    points.forEach((item) => {
      const features = [item.unwrappedX - originX, item.anchor.gameY - originY, 1];
      const weight = 1 / Math.max(1, Math.pow(item.distance || 1, 1.35));
      for (let row = 0; row < 3; row += 1) {
        vector[row] += weight * features[row] * item.anchor[valueKey];
        for (let col = 0; col < 3; col += 1) {
          matrix[row][col] += weight * features[row] * features[col];
        }
      }
    });

    const coeffs = solveLinear3(matrix, vector);
    return coeffs ? coeffs[2] : NaN;
  }

  function solveLinear3(matrix, vector) {
    const augmented = matrix.map((row, index) => [...row, vector[index]]);
    for (let pivot = 0; pivot < 3; pivot += 1) {
      let maxRow = pivot;
      for (let row = pivot + 1; row < 3; row += 1) {
        if (Math.abs(augmented[row][pivot]) > Math.abs(augmented[maxRow][pivot])) maxRow = row;
      }
      if (Math.abs(augmented[maxRow][pivot]) < 1e-9) return null;
      if (maxRow !== pivot) {
        const temp = augmented[pivot];
        augmented[pivot] = augmented[maxRow];
        augmented[maxRow] = temp;
      }
      const divisor = augmented[pivot][pivot];
      for (let col = pivot; col < 4; col += 1) augmented[pivot][col] /= divisor;
      for (let row = 0; row < 3; row += 1) {
        if (row === pivot) continue;
        const factor = augmented[row][pivot];
        for (let col = pivot; col < 4; col += 1) augmented[row][col] -= factor * augmented[pivot][col];
      }
    }
    return [augmented[0][3], augmented[1][3], augmented[2][3]];
  }

  function weightedAnchorAverage(points) {
    const total = points.reduce((sum, item) => sum + 1 / Math.max(1, item.distance || 1), 0) || 1;
    return points.reduce(
      (acc, item) => {
        const weight = 1 / Math.max(1, item.distance || 1);
        acc.lat += (item.anchor.lat * weight) / total;
        acc.lon += (item.anchor.lon * weight) / total;
        return acc;
      },
      { lat: 0, lon: 0 }
    );
  }

  function gameCoordAnchor(label, gameX, gameY, lon, lat) {
    return { label, gameX, gameY, lon, lat };
  }

  function normalizeGameX(gameX) {
    const value = Number(gameX) % GAME_COORD_WRAP;
    return value < 0 ? value + GAME_COORD_WRAP : value;
  }

  function unwrapGameX(gameX, referenceX) {
    let x = normalizeGameX(gameX);
    while (x - referenceX > GAME_COORD_WRAP / 2) x -= GAME_COORD_WRAP;
    while (referenceX - x > GAME_COORD_WRAP / 2) x += GAME_COORD_WRAP;
    return x;
  }

  function normalizeLon(lon) {
    let value = Number(lon);
    while (value > 180) value -= 360;
    while (value < -180) value += 360;
    return value;
  }

  function normalizeLonDelta(delta) {
    let value = Number(delta);
    while (value > 180) value -= 360;
    while (value < -180) value += 360;
    return value;
  }

  function clampNumber(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function shouldRefreshFromGvdb(quest) {
    const text = [
      quest?.version,
      quest?.destination,
      quest?.npc,
      ...ensureArray(quest?.prep),
      ...ensureArray(quest?.steps),
      ...ensureArray(quest?.notes)
    ].join("\n");
    return (
      /GVDB|gvdb\.mydns\.jp/.test(text) &&
      /查看任务备注中的日文原文|阅读任务说明|见步骤|待补充/.test(text)
    );
  }

  function canUseLocalApi() {
    return location.protocol === "http:" && /^(localhost|127\.0\.0\.1)$/i.test(location.hostname);
  }

  function renderPlan(plan, options = {}) {
    const routeContext = buildRouteContext(plan);
    const displaySteps = withSailingGuidance(plan, routeContext);
    state.currentPlan = {
      ...plan,
      steps: displaySteps,
      source: options.source || plan.source || "generated"
    };

    els.matchStatus.textContent = options.status || "已生成步骤";
    els.resultType.textContent = `${TYPE_LABELS[plan.type] || "通用"} · ${
      plan.version || "自定义"
    }`;
    els.resultTitle.textContent = plan.title || "任务步骤";
    els.confidence.textContent =
      options.confidence > 0 ? `匹配度 ${Math.round(options.confidence)}%` : "匹配度 -";

    renderMeta(plan);
    renderRouteMap(plan, routeContext);
    renderList(els.steps, displaySteps, "输入任务后会在这里生成步骤。", "li");
    renderList(els.prepList, ensureArray(plan.prep), "暂无准备项。", "li");
    renderList(els.notesList, ensureArray(plan.notes), "暂无注意事项。", "li");

    if (window.lucide) window.lucide.createIcons();
  }

  function renderMeta(plan) {
    const items = [
      ["起点", plan.start || "待补充"],
      ["目的地", plan.destination || "待补充"],
      ["关键 NPC", plan.npc || "待补充"],
      ["耗时", plan.estimatedTime || "待判断"],
      ["难度", plan.difficulty || "待判断"],
      ["奖励", plan.reward || "待补充"],
      ["前置", ensureArray(plan.requirements).join(" / ") || "待补充"],
      ["标签", ensureArray(plan.tags).join(" / ") || TYPE_LABELS[plan.type] || "通用"]
    ];

    els.metaGrid.innerHTML = items
      .map(
        ([label, value]) => `
          <div class="meta-item">
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(value)}</strong>
          </div>
        `
      )
      .join("");
  }

  function renderList(container, items, emptyText, tagName) {
    container.innerHTML = "";
    const values = items.length ? items : [emptyText];
    values.forEach((item) => {
      const node = document.createElement(tagName);
      node.textContent = item;
      container.appendChild(node);
    });
  }

  function buildRouteContext(plan) {
    const stops = extractRouteStops(plan);
    const knownStops = stops
      .map((name, index) => ({ name, index, coord: getPortCoord(name) }))
      .filter((stop) => stop.coord);
    const routePlan = knownStops.length >= 2 ? buildSailingRoutePlan(knownStops) : null;
    return {
      stops,
      knownStops,
      routePlan
    };
  }

  function withSailingGuidance(plan, routeContext) {
    const steps = ensureArray(plan.steps);
    const guidance = buildSailingGuidance(routeContext);
    if (!guidance || steps.some((step) => String(step).startsWith("推荐航行路线："))) return steps;
    return [guidance, ...steps];
  }

  function renderRouteMap(plan, routeContext = buildRouteContext(plan)) {
    const { stops, knownStops, routePlan } = routeContext;
    if (stops.length < 2) {
      if (state.currentPosition && window.L) {
        els.routeSummary.textContent = "实时船位";
        renderPositionOnlyMap();
        return;
      }
      destroyInteractiveRouteMap();
      els.routeSummary.textContent = "暂无可绘制路线";
      els.routeMap.innerHTML = `
        <div class="route-empty">
          导入包含城市和航行步骤的任务后，这里会显示路线图。
        </div>
      `;
      return;
    }

    if (knownStops.length >= 2) {
      const routeCount = routePlan?.points?.length || knownStops.length;
      els.routeSummary.textContent = `${stops.length} 个航点 · ${routeCount} 个推荐航路点`;
      if (window.L) {
        renderInteractiveRouteMap(stops, knownStops, routePlan);
        return;
      }
      destroyInteractiveRouteMap();
      els.routeMap.innerHTML = buildSvgRoute(stops, knownStops, routePlan);
      return;
    }

    destroyInteractiveRouteMap();
    els.routeSummary.textContent = `${stops.length} 个航点`;
    els.routeMap.innerHTML = buildNodeRoute(stops);
  }

  function extractRouteStops(plan) {
    const stops = [];
    const addStop = (value) => {
      const cleaned = cleanStopName(value);
      if (!cleaned || /待补充|见步骤|任务指定|当前港口/.test(cleaned)) return;
      if (stops[stops.length - 1] !== cleaned) stops.push(cleaned);
    };

    addStop(plan.start);
    ensureArray(plan.steps).forEach((step) => {
      const text = String(step || "");
      const patterns = [
        /在([^，。]+?)接取任务/g,
        /从([^，。]+?)(?:出航)?前往([^，。]+?)(?:，|。|$)/g,
        /到达([^，。]+?)(?:后|，|。|$)/g,
        /在([^，。]+?)的交易所/g,
        /前往([^，。]+?)(?:，|。|$)/g
      ];

      patterns.forEach((pattern) => {
        for (const match of text.matchAll(pattern)) {
          addStop(match[1]);
          if (match[2]) addStop(match[2]);
        }
      });
    });
    addStop(plan.destination);

    return stops.filter((stop, index) => stop !== stops[index - 1]);
  }

  function cleanStopName(value) {
    return String(value || "")
      .replace(/^(?:在|从|到达|前往)/, "")
      .replace(/(?:出航)?前往.*$/, "")
      .replace(/的交易所.*$/, "")
      .replace(/后.*$/, "")
      .replace(/[，。；;、].*$/, "")
      .trim();
  }

  function getPortCoord(name) {
    const direct = PORT_COORDS[name];
    if (direct) return { ...direct, label: direct.label || name };
    const normalizedName = normalize(name);
    const entry = Object.entries(PORT_COORDS).find(([key]) => normalize(key) === normalizedName);
    if (!entry) return null;
    const [key, coord] = entry;
    return { ...coord, label: coord.label || key };
  }

  function renderPositionOnlyMap() {
    destroyInteractiveRouteMap();
    els.routeMap.innerHTML = '<div class="leaflet-route-map" aria-label="实时船位地图"></div>';
    const mapEl = els.routeMap.querySelector(".leaflet-route-map");
    const map = window.L.map(mapEl, {
      attributionControl: true,
      minZoom: 2,
      maxZoom: 18,
      scrollWheelZoom: true,
      worldCopyJump: true
    });
    state.leafletMap = map;
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      detectRetina: true,
      maxZoom: 19
    }).addTo(map);
    const { lat, lon } = state.currentPosition;
    map.setView([lat, lon], 6);
    map.whenReady(() => {
      updateShipMarker();
      window.requestAnimationFrame(() => map.invalidateSize());
    });
  }

  function renderInteractiveRouteMap(stops, knownStops, routePlan = buildSailingRoutePlan(knownStops)) {
    destroyInteractiveRouteMap();
    els.routeMap.innerHTML = `
      <div class="leaflet-route-map" aria-label="可缩放航行路线地图"></div>
      ${buildRouteItinerary(stops, routePlan)}
    `;
    const mapEl = els.routeMap.querySelector(".leaflet-route-map");
    const map = window.L.map(mapEl, {
      attributionControl: true,
      minZoom: 2,
      maxZoom: 18,
      scrollWheelZoom: true,
      worldCopyJump: true
    });
    state.leafletMap = map;

    const baseLayer = window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      detectRetina: true,
      maxZoom: 19
    }).addTo(map);

    const routeLayer = window.L.layerGroup().addTo(map);
    const portLayer = buildLeafletPortLayer(knownStops).addTo(map);
    buildLeafletRouteLayer(knownStops, routePlan).addTo(routeLayer);

    window.L.control
      .layers(
        { "OpenStreetMap": baseLayer },
        { "港口点位": portLayer, "任务航线": routeLayer },
        { collapsed: true }
      )
      .addTo(map);

    const bounds = window.L.latLngBounds((routePlan?.points || knownStops.map((stop) => stop.coord)).map((point) => [point.lat, point.lon]));
    map.fitBounds(bounds.pad(routePlan?.hasWaypoints ? 0.95 : 0.38), {
      animate: false,
      maxZoom: routePlan?.hasWaypoints ? 5 : knownStops.length <= 3 ? 7 : 6
    });

    map.whenReady(() => {
      window.requestAnimationFrame(() => map.invalidateSize());
    });
    updateShipMarker();
  }

  function destroyInteractiveRouteMap() {
    if (!state.leafletMap) return;
    state.leafletMap.remove();
    state.leafletMap = null;
    state.shipMarker = null;
  }

  function updateShipMarker() {
    if (!window.L || !state.leafletMap) return;
    if (!state.currentPosition) {
      if (state.shipMarker) {
        state.shipMarker.remove();
        state.shipMarker = null;
      }
      return;
    }

    const { lat, lon, label, source } = state.currentPosition;
    const icon = window.L.divIcon({
      className: "ship-position-marker",
      html: '<span></span><strong>船</strong>',
      iconAnchor: [14, 14],
      iconSize: [80, 28]
    });

    if (!state.shipMarker) {
      state.shipMarker = window.L.marker([lat, lon], {
        icon,
        keyboard: false,
        zIndexOffset: 1200
      }).addTo(state.leafletMap);
    } else {
      state.shipMarker.setLatLng([lat, lon]);
      state.shipMarker.setIcon(icon);
    }
    const shipPositionDetails = formatPositionDetails(state.currentPosition);
    state.shipMarker.bindPopup(
      `<strong>${escapeHtml(label || "当前船位")}</strong><br><span>${escapeHtml(shipPositionDetails)} | ${escapeHtml(source || "manual")}</span>`
    );
    return;
    state.shipMarker.bindPopup(
      `<strong>${escapeHtml(label || "当前船位")}</strong><br><span>${lat.toFixed(4)}, ${lon.toFixed(4)} · ${escapeHtml(source || "manual")}</span>`
    );
  }

  function buildLeafletPortLayer(knownStops) {
    const routeKeys = new Set(knownStops.map((stop) => geoKey(stop.coord)));
    const layer = window.L.layerGroup();
    uniquePorts().forEach(({ key, coord }) => {
      const label = coord.label || key;
      const isRoutePort = routeKeys.has(geoKey(coord));
      const marker = window.L.circleMarker([coord.lat, coord.lon], {
        className: `leaflet-port-dot ${coord.major ? "major" : ""} ${isRoutePort ? "route-port" : ""}`,
        color: coord.major ? "#285f65" : "#315f63",
        fillColor: isRoutePort ? "#c24b35" : coord.major ? "#fff5dd" : "#f9f1d6",
        fillOpacity: isRoutePort ? 0.86 : coord.major ? 0.9 : 0.72,
        opacity: isRoutePort ? 1 : 0.72,
        radius: isRoutePort ? 5 : coord.major ? 3.8 : 2.3,
        weight: isRoutePort ? 2 : coord.major ? 1.4 : 0.8
      });
      marker.bindTooltip(`${label} · ${coord.region || "港口"}`, {
        className: "leaflet-port-tooltip",
        direction: "top",
        opacity: 0.95,
        permanent: false
      });
      marker.bindPopup(
        `<strong>${escapeHtml(label)}</strong><br><span>${escapeHtml(coord.region || "港口")}</span>`
      );
      marker.addTo(layer);
    });
    return layer;
  }

  function buildLeafletRouteLayer(knownStops, routePlan = buildSailingRoutePlan(knownStops)) {
    const layer = window.L.layerGroup();
    const routePoints = routePlan?.points?.length ? routePlan.points : knownStops.map((stop) => stop.coord);
    const latLngs = routePoints.map((point) => [point.lat, point.lon]);
    window.L.polyline(latLngs, {
      color: "#ffffff",
      opacity: 0.84,
      weight: 8
    }).addTo(layer);
    window.L.polyline(latLngs, {
      color: "#c24b35",
      lineJoin: "round",
      opacity: 0.96,
      weight: 4
    }).addTo(layer);

    routePoints
      .filter((point) => point.kind === "waypoint")
      .forEach((point) => {
        const marker = window.L.circleMarker([point.lat, point.lon], {
          className: "leaflet-sea-waypoint",
          color: "#2f6d74",
          fillColor: "#ffffff",
          fillOpacity: 0.9,
          opacity: 0.75,
          radius: 3,
          weight: 1.2
        });
        marker.bindTooltip(point.label, {
          className: "leaflet-port-tooltip",
          direction: "top",
          opacity: 0.95
        });
        marker.addTo(layer);
      });

    groupedRouteStops(knownStops).forEach((group) => {
      const numbers = group.indices.map((index) => index + 1).join("/");
      const isStart = group.indices.includes(0);
      const isEnd = group.indices.includes(knownStops.length - 1);
      const icon = window.L.divIcon({
        className: `leaflet-route-marker ${isStart ? "start" : ""} ${isEnd ? "end" : ""}`,
        html: `<span>${escapeHtml(numbers)}</span><strong>${escapeHtml(group.label)}</strong>`,
        iconAnchor: [12, 12],
        iconSize: [150, 28]
      });
      window.L.marker([group.coord.lat, group.coord.lon], {
        icon,
        keyboard: false,
        zIndexOffset: 700
      }).addTo(layer);
    });

    return layer;
  }

  function groupedRouteStops(knownStops) {
    const groups = new Map();
    knownStops.forEach((stop, index) => {
      const key = geoKey(stop.coord);
      if (!groups.has(key)) {
        groups.set(key, {
          coord: stop.coord,
          label: stop.coord.label || stop.name,
          indices: []
        });
      }
      groups.get(key).indices.push(index);
    });
    return Array.from(groups.values());
  }

  function uniquePorts() {
    const byPosition = new Map();
    Object.entries(PORT_COORDS).forEach(([key, coord]) => {
      if (coord.alias) return;
      const id = geoKey(coord);
      const candidate = { key, coord };
      const existing = byPosition.get(id);
      if (!existing || coord.major) byPosition.set(id, candidate);
    });
    return Array.from(byPosition.values());
  }

  function buildSailingRoutePlan(knownStops) {
    const points = [];
    const legs = [];
    knownStops.forEach((stop, index) => {
      const from = asRoutePort(stop);
      const next = knownStops[index + 1];
      if (!next) {
        appendRoutePoint(points, from);
        return;
      }
      const to = asRoutePort(next);
      const waypoints = buildSeaLegWaypoints(from, to);
      const legPoints = [from, ...waypoints, to];
      legPoints.forEach((point) => appendRoutePoint(points, point));
      legs.push({
        from,
        to,
        waypoints,
        points: legPoints
      });
    });

    return {
      points,
      legs,
      hasWaypoints: legs.some((leg) => leg.waypoints.length > 0)
    };
  }

  function asRoutePort(stop) {
    return {
      ...stop.coord,
      label: stop.coord.label || stop.name,
      kind: "port",
      stopIndex: stop.index
    };
  }

  function appendRoutePoint(points, point) {
    const previous = points[points.length - 1];
    if (previous && geoKey(previous) === geoKey(point)) return;
    points.push(point);
  }

  function buildSeaLegWaypoints(from, to) {
    const exactLabels = exactCoastalRouteLabels(from, to);
    if (exactLabels.length) return labelsToWaypoints(exactLabels);

    const rule = pickSeaRouteRule(from, to);
    const labels = [
      ...portOffshoreLabels(from),
      ...(rule ? rule.reverse ? [...rule.labels].reverse() : rule.labels : []),
      ...portOffshoreLabels(to)
    ];
    return labelsToWaypoints(labels);
  }

  function labelsToWaypoints(labels) {
    const waypoints = [];
    labels.forEach((label) => {
      const point = SEA_WAYPOINTS[label];
      if (!point) return;
      const previous = waypoints[waypoints.length - 1];
      if (previous && geoKey(previous) === geoKey(point)) return;
      waypoints.push(point);
    });
    return waypoints;
  }

  function exactCoastalRouteLabels(from, to) {
    const routes = {
      "萨格雷斯->里斯本": ["萨格雷斯外海", "圣文森特角外海", "里斯本外海"],
      "里斯本->萨格雷斯": ["里斯本外海", "圣文森特角外海", "萨格雷斯外海"],
      "里斯本->奥波多": ["里斯本外海", "葡萄牙西岸外海", "奥波多外海"],
      "奥波多->里斯本": ["奥波多外海", "葡萄牙西岸外海", "里斯本外海"],
      "萨格雷斯->奥波多": ["萨格雷斯外海", "圣文森特角外海", "里斯本外海", "葡萄牙西岸外海", "奥波多外海"],
      "奥波多->萨格雷斯": ["奥波多外海", "葡萄牙西岸外海", "里斯本外海", "圣文森特角外海", "萨格雷斯外海"],
      "萨格雷斯->阿尔及尔": [
        "萨格雷斯外海",
        "葡萄牙南岸外海",
        "直布罗陀海峡西口",
        "直布罗陀海峡中线",
        "直布罗陀海峡东口",
        "西班牙南岸外海",
        "阿尔沃兰海",
        "北非西岸航道",
        "阿尔及尔外海"
      ],
      "阿尔及尔->萨格雷斯": [
        "阿尔及尔外海",
        "北非西岸航道",
        "阿尔沃兰海",
        "西班牙南岸外海",
        "直布罗陀海峡东口",
        "直布罗陀海峡中线",
        "直布罗陀海峡西口",
        "葡萄牙南岸外海",
        "萨格雷斯外海"
      ],
      "奥波多->伦敦": [
        "奥波多外海",
        "加利西亚外海",
        "比斯开湾西南",
        "比斯开湾北部",
        "布列塔尼外海",
        "韦桑岛外海",
        "英吉利海峡西口",
        "怀特岛外海",
        "多佛海峡",
        "泰晤士河口"
      ],
      "伦敦->奥波多": [
        "泰晤士河口",
        "多佛海峡",
        "怀特岛外海",
        "英吉利海峡西口",
        "韦桑岛外海",
        "布列塔尼外海",
        "比斯开湾北部",
        "比斯开湾西南",
        "加利西亚外海",
        "奥波多外海"
      ],
      "里斯本->伦敦": [
        "里斯本外海",
        "葡萄牙西岸外海",
        "奥波多外海",
        "加利西亚外海",
        "比斯开湾西南",
        "比斯开湾北部",
        "布列塔尼外海",
        "韦桑岛外海",
        "英吉利海峡西口",
        "怀特岛外海",
        "多佛海峡",
        "泰晤士河口"
      ],
      "伦敦->里斯本": [
        "泰晤士河口",
        "多佛海峡",
        "怀特岛外海",
        "英吉利海峡西口",
        "韦桑岛外海",
        "布列塔尼外海",
        "比斯开湾北部",
        "比斯开湾西南",
        "加利西亚外海",
        "奥波多外海",
        "葡萄牙西岸外海",
        "里斯本外海"
      ],
      "普利茅斯->加来": ["康沃尔外海", "英吉利海峡西口", "怀特岛外海", "多佛海峡", "加来外海"],
      "加来->普利茅斯": ["加来外海", "多佛海峡", "怀特岛外海", "英吉利海峡西口", "康沃尔外海"],
      "伦敦->加来": ["泰晤士河口", "多佛海峡", "加来外海"],
      "加来->伦敦": ["加来外海", "多佛海峡", "泰晤士河口"]
    };
    return routes[`${from.label}->${to.label}`] || [];
  }

  function portOffshoreLabels(port) {
    const byPort = {
      萨格雷斯: ["萨格雷斯外海"],
      里斯本: ["里斯本外海"],
      奥波多: ["奥波多外海"],
      伦敦: ["泰晤士河口"],
      普利茅斯: ["康沃尔外海"],
      朴茨茅斯: ["怀特岛外海"],
      加来: ["加来外海"],
      阿尔及尔: ["阿尔及尔外海"]
    };
    if (byPort[port.label]) return byPort[port.label];

    const region = port.region || "";
    if (/葡萄牙/.test(region)) return ["葡萄牙西岸外海"];
    if (/英格兰|法国北岸/.test(region)) return ["英吉利海峡西口"];
    if (/北非/.test(region)) return ["北非西岸航道"];
    if (/印度/.test(region)) return ["印度西岸航道"];
    if (/东非/.test(region)) return ["桑给巴尔外海"];
    return [];
  }

  function pickSeaRouteRule(from, to) {
    const rules = [
      {
        test: (a, b) => isAtlanticEurope(a) && isNorthSeaOrChannel(b),
        labels: ["比斯开湾外海", "韦桑岛外海", "英吉利海峡西口", "多佛海峡"]
      },
      {
        test: (a, b) => isNorthSeaOrChannel(a) && isAtlanticEurope(b),
        labels: ["多佛海峡", "英吉利海峡西口", "韦桑岛外海", "比斯开湾外海"]
      },
      {
        test: (a, b) => isAtlanticEurope(a) && isMediterranean(b),
        labels: ["葡萄牙南岸外海", "直布罗陀海峡西口", "直布罗陀海峡东口", "阿尔沃兰海"]
      },
      {
        test: (a, b) => isMediterranean(a) && isAtlanticEurope(b),
        labels: ["阿尔沃兰海", "直布罗陀海峡东口", "直布罗陀海峡西口", "葡萄牙南岸外海"]
      },
      {
        test: (a, b) => isWesternMediterranean(a) && isEasternMediterranean(b),
        labels: ["西地中海中线", "撒丁岛南方海域", "西西里海峡", "爱奥尼亚海", "克里特北方海域"]
      },
      {
        test: (a, b) => isEasternMediterranean(a) && isWesternMediterranean(b),
        labels: ["克里特北方海域", "爱奥尼亚海", "西西里海峡", "撒丁岛南方海域", "西地中海中线"]
      },
      {
        test: (a, b) => isEasternMediterranean(a) && (isRedSea(b) || isArabia(b)),
        labels: ["尼罗河口外海", "苏伊士湾", "红海中部", "曼德海峡"]
      },
      {
        test: (a, b) => (isRedSea(a) || isArabia(a)) && isEasternMediterranean(b),
        labels: ["曼德海峡", "红海中部", "苏伊士湾", "尼罗河口外海"]
      },
      {
        test: (a, b) => isAtlanticEurope(a) && isBeyondWestAfrica(b),
        labels: [
          "加那利外海",
          "佛得角外海",
          "几内亚湾外海",
          "刚果外海",
          "好望角外海",
          "莫桑比克海峡",
          "桑给巴尔外海",
          "亚丁湾",
          "阿曼外海",
          "印度西岸航道",
          "锡兰外海",
          "孟加拉湾",
          "马六甲海峡",
          "南海西部",
          "台湾海峡",
          "日本西海道"
        ]
      },
      {
        test: (a, b) => isBeyondWestAfrica(a) && isAtlanticEurope(b),
        labels: [
          "日本西海道",
          "台湾海峡",
          "南海西部",
          "马六甲海峡",
          "孟加拉湾",
          "锡兰外海",
          "印度西岸航道",
          "阿曼外海",
          "亚丁湾",
          "桑给巴尔外海",
          "莫桑比克海峡",
          "好望角外海",
          "刚果外海",
          "几内亚湾外海",
          "佛得角外海",
          "加那利外海"
        ]
      },
      {
        test: (a, b) => isWestAfrica(a) && isEastAfricaOrBeyond(b),
        labels: ["刚果外海", "好望角外海", "莫桑比克海峡", "桑给巴尔外海"]
      },
      {
        test: (a, b) => isEastAfricaOrBeyond(a) && isWestAfrica(b),
        labels: ["桑给巴尔外海", "莫桑比克海峡", "好望角外海", "刚果外海"]
      },
      {
        test: (a, b) => isEastAfrica(a) && (isArabia(b) || isIndia(b)),
        labels: ["桑给巴尔外海", "亚丁湾", "阿曼外海", "印度西岸航道"]
      },
      {
        test: (a, b) => (isArabia(a) || isIndia(a)) && isEastAfrica(b),
        labels: ["印度西岸航道", "阿曼外海", "亚丁湾", "桑给巴尔外海"]
      },
      {
        test: (a, b) => isIndia(a) && isSouthEastAsia(b),
        labels: ["锡兰外海", "孟加拉湾", "马六甲海峡"]
      },
      {
        test: (a, b) => isSouthEastAsia(a) && isIndia(b),
        labels: ["马六甲海峡", "孟加拉湾", "锡兰外海"]
      },
      {
        test: (a, b) => isSouthEastAsia(a) && isEastAsia(b),
        labels: ["南海西部", "台湾海峡", "日本西海道"]
      },
      {
        test: (a, b) => isEastAsia(a) && isSouthEastAsia(b),
        labels: ["日本西海道", "台湾海峡", "南海西部"]
      },
      {
        test: (a, b) => isAtlanticEurope(a) && isCaribbean(b),
        labels: ["亚速尔外海", "大西洋中部", "巴哈马外海"]
      },
      {
        test: (a, b) => isCaribbean(a) && isAtlanticEurope(b),
        labels: ["巴哈马外海", "大西洋中部", "亚速尔外海"]
      }
    ];

    return rules.find((rule) => rule.test(from, to)) || null;
  }

  function buildSvgRoute(stops, knownStops, routePlan = buildSailingRoutePlan(knownStops)) {
    const routePointKeys = new Set(knownStops.map((stop) => coordKey(stop.coord)));
    const grid = buildMapGrid();
    const land = buildWorldLandmasses();
    const oceanLabels = buildOceanLabels();
    const ports = buildMapPortDots(routePointKeys);
    const routePoints = routePlan?.points?.length ? routePlan.points : knownStops.map((stop) => stop.coord);
    const waypointMarkers = routePoints
      .filter((point) => point.kind === "waypoint")
      .map(
        (point) => `
          <g class="sea-waypoint" transform="translate(${point.x} ${point.y})">
            <title>${escapeHtml(point.label)}</title>
            <circle r="3"></circle>
          </g>
        `
      )
      .join("");
    const segments = routePoints
      .slice(1)
      .map((point, index) => {
        const from = routePoints[index];
        return `
          <line class="route-segment-shadow" x1="${from.x}" y1="${from.y}" x2="${point.x}" y2="${point.y}" />
          <line class="route-segment" x1="${from.x}" y1="${from.y}" x2="${point.x}" y2="${point.y}" />
        `;
      })
      .join("");
    const markers = knownStops
      .map((stop, index) => {
        const isStart = index === 0;
        const isEnd = index === knownStops.length - 1;
        return `
          <g class="route-marker ${isStart ? "start" : ""} ${isEnd ? "end" : ""}" transform="translate(${stop.coord.x} ${stop.coord.y})">
            <title>${escapeHtml(stop.coord.label)} · ${escapeHtml(stop.coord.region || "航点")}</title>
            <circle r="10"></circle>
            <text class="route-number" y="4">${index + 1}</text>
            <text class="route-label" x="16" y="${index % 2 ? 22 : -16}">${escapeHtml(stop.coord.label)}</text>
          </g>
        `;
      })
      .join("");
    const itinerary = buildRouteItinerary(stops);

    return `
      <svg class="route-svg world-map" viewBox="0 0 ${MAP_WIDTH} ${MAP_HEIGHT}" role="img" aria-label="任务航行路线图">
        <defs>
          <linearGradient id="seaGradient" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stop-color="#dceff0" />
            <stop offset="52%" stop-color="#b7d7da" />
            <stop offset="100%" stop-color="#8fbac2" />
          </linearGradient>
          <linearGradient id="landGradient" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stop-color="#efe3bd" />
            <stop offset="100%" stop-color="#cdb886" />
          </linearGradient>
          <marker id="routeArrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#c24b35"></path>
          </marker>
        </defs>
        <rect width="${MAP_WIDTH}" height="${MAP_HEIGHT}" rx="8" fill="url(#seaGradient)"></rect>
        ${grid}
        ${oceanLabels}
        ${land}
        ${ports}
        ${segments}
        ${waypointMarkers}
        ${markers}
      </svg>
      ${buildRouteItinerary(stops, routePlan)}
    `;
  }

  function buildMapGrid() {
    const meridians = [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150]
      .map((lon) => {
        const from = projectLonLat(lon, MAP_BOUNDS.minLat);
        const to = projectLonLat(lon, MAP_BOUNDS.maxLat);
        return `<line class="map-grid" x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}"></line>`;
      })
      .join("");
    const parallels = [-45, -30, -15, 0, 15, 30, 45, 60]
      .map((lat) => {
        const from = projectLonLat(MAP_BOUNDS.minLon, lat);
        const to = projectLonLat(MAP_BOUNDS.maxLon, lat);
        return `<line class="map-grid" x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}"></line>`;
      })
      .join("");
    return `<g class="map-grid-layer">${meridians}${parallels}</g>`;
  }

  function buildWorldLandmasses() {
    const paths = LANDMASSES.map((land) => {
      const d = land.points
        .map(([lon, lat], index) => {
          const point = projectLonLat(lon, lat);
          return `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`;
        })
        .join(" ");
      const label = land.label ? buildContinentLabel(land.name, land.label) : "";
      return `
        <path class="landmass ${land.className}" d="${d} Z"></path>
        ${label}
      `;
    }).join("");
    return `<g class="land-layer">${paths}</g>`;
  }

  function buildContinentLabel(name, position) {
    const point = projectLonLat(position[0], position[1]);
    return `<text class="continent-label" x="${point.x}" y="${point.y}">${escapeHtml(name)}</text>`;
  }

  function buildOceanLabels() {
    return OCEAN_LABELS.map((label) => {
      const point = projectLonLat(label.lon, label.lat);
      return `<text class="ocean-label" x="${point.x}" y="${point.y}">${escapeHtml(label.text)}</text>`;
    }).join("");
  }

  function buildMapPortDots(routePointKeys) {
    const byPosition = new Map();
    Object.entries(PORT_COORDS).forEach(([key, coord]) => {
      if (coord.alias) return;
      const id = coordKey(coord);
      const existing = byPosition.get(id);
      const candidate = {
        key,
        label: coord.label || key,
        coord
      };
      if (!existing || coord.major) byPosition.set(id, candidate);
    });

    return Array.from(byPosition.values())
      .sort((left, right) => Number(left.coord.major) - Number(right.coord.major))
      .map(({ label, coord }) => {
        const isRoutePoint = routePointKeys.has(coordKey(coord));
        const showLabel = coord.major && !isRoutePoint;
        return `
          <g class="map-port ${coord.major ? "major" : ""} ${isRoutePoint ? "route-port" : ""}" transform="translate(${coord.x} ${coord.y})">
            <title>${escapeHtml(label)} · ${escapeHtml(coord.region || "港口")}</title>
            <circle r="${coord.major ? 2.7 : 1.8}"></circle>
            ${showLabel ? `<text x="5" y="-4">${escapeHtml(label)}</text>` : ""}
          </g>
        `;
      })
      .join("");
  }

  function port(lon, lat, region, options = {}) {
    return {
      ...projectLonLat(lon, lat),
      lon,
      lat,
      region,
      label: options.label || "",
      major: Boolean(options.major),
      alias: Boolean(options.alias)
    };
  }

  function projectLonLat(lon, lat) {
    const clampedLat = Math.max(MAP_BOUNDS.minLat, Math.min(MAP_BOUNDS.maxLat, lat));
    const x = ((lon - MAP_BOUNDS.minLon) / (MAP_BOUNDS.maxLon - MAP_BOUNDS.minLon)) * MAP_WIDTH;
    const y = ((MAP_BOUNDS.maxLat - clampedLat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) * MAP_HEIGHT;
    return {
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10
    };
  }

  function coordKey(coord) {
    return `${Math.round(coord.x)}:${Math.round(coord.y)}`;
  }

  function geoKey(coord) {
    return `${Number(coord.lat).toFixed(3)}:${Number(coord.lon).toFixed(3)}`;
  }

  function seaPoint(label, lon, lat) {
    return {
      ...projectLonLat(lon, lat),
      lon,
      lat,
      label,
      region: "推荐航路点",
      kind: "waypoint"
    };
  }

  function isAtlanticEurope(coord) {
    return coord.lon >= -25 && coord.lon <= 6 && coord.lat >= 35 && coord.lat <= 62;
  }

  function isNorthSeaOrChannel(coord) {
    return coord.lon >= -8 && coord.lon <= 13 && coord.lat >= 49 && coord.lat <= 62;
  }

  function isMediterranean(coord) {
    return coord.lon >= -6.2 && coord.lon <= 42 && coord.lat >= 29 && coord.lat <= 46;
  }

  function isWesternMediterranean(coord) {
    return coord.lon >= -6.2 && coord.lon <= 16 && coord.lat >= 30 && coord.lat <= 45;
  }

  function isEasternMediterranean(coord) {
    return coord.lon > 16 && coord.lon <= 42 && coord.lat >= 29 && coord.lat <= 45;
  }

  function isWestAfrica(coord) {
    return coord.lon >= -25 && coord.lon <= 21 && coord.lat >= -36 && coord.lat < 30;
  }

  function isEastAfrica(coord) {
    return coord.lon > 21 && coord.lon <= 53 && coord.lat >= -36 && coord.lat <= 16;
  }

  function isEastAfricaOrBeyond(coord) {
    return coord.lon > 21 && coord.lat >= -36 && coord.lat <= 35;
  }

  function isRedSea(coord) {
    return coord.lon >= 32 && coord.lon <= 44 && coord.lat >= 11 && coord.lat <= 30;
  }

  function isArabia(coord) {
    return coord.lon >= 38 && coord.lon <= 65 && coord.lat >= 10 && coord.lat <= 31;
  }

  function isIndia(coord) {
    return coord.lon > 65 && coord.lon <= 92 && coord.lat >= 5 && coord.lat <= 25;
  }

  function isSouthEastAsia(coord) {
    return coord.lon > 92 && coord.lon <= 130 && coord.lat >= -11 && coord.lat <= 25;
  }

  function isEastAsia(coord) {
    return coord.lon > 110 && coord.lon <= 146 && coord.lat > 20 && coord.lat <= 46;
  }

  function isCaribbean(coord) {
    return coord.lon >= -100 && coord.lon <= -50 && coord.lat >= 5 && coord.lat <= 28;
  }

  function isBeyondWestAfrica(coord) {
    return (
      isWestAfrica(coord) ||
      isEastAfrica(coord) ||
      isRedSea(coord) ||
      isArabia(coord) ||
      isIndia(coord) ||
      isSouthEastAsia(coord) ||
      isEastAsia(coord)
    );
  }

  function distanceNm(a, b) {
    const radiusNm = 3440.1;
    const dLat = toRadians(b.lat - a.lat);
    const dLon = toRadians(b.lon - a.lon);
    const lat1 = toRadians(a.lat);
    const lat2 = toRadians(b.lat);
    const sinLat = Math.sin(dLat / 2);
    const sinLon = Math.sin(dLon / 2);
    const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
    return 2 * radiusNm * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  function toRadians(degrees) {
    return (degrees * Math.PI) / 180;
  }

  function buildNodeRoute(stops) {
    return `
      <div class="route-node-line">
        ${stops
          .map(
            (stop, index) => `
              <div class="route-node">
                <span>${index + 1}</span>
                <strong>${escapeHtml(stop)}</strong>
              </div>
            `
          )
          .join('<i data-lucide="arrow-right" aria-hidden="true"></i>')}
      </div>
      ${buildRouteItinerary(stops)}
    `;
  }

  function buildRouteItinerary(stops, routePlan = null) {
    const guide = routePlan?.hasWaypoints ? buildSeaRouteItinerary(routePlan) : "";
    return `
      <div class="route-itinerary">
        ${stops
          .map(
            (stop, index) => `
              <span class="${index === 0 ? "start" : index === stops.length - 1 ? "end" : ""}">
                ${index + 1}. ${escapeHtml(stop)}
              </span>
            `
          )
          .join("")}
      </div>
      ${guide}
    `;
  }

  function buildSeaRouteItinerary(routePlan) {
    const text = routePlan.legs
      .map((leg) => {
        const route = [leg.from, ...leg.waypoints, leg.to].map((point) => point.label).join(" → ");
        return route;
      })
      .join("；");
    return `
      <div class="sea-route-itinerary">
        <strong>推荐航路</strong>
        <span>${escapeHtml(text)}</span>
      </div>
    `;
  }

  function buildSailingGuidance(routeContext) {
    const routePlan = routeContext?.routePlan;
    if (!routePlan?.hasWaypoints) return "";
    const legTexts = routePlan.legs
      .filter((leg) => leg.waypoints.length)
      .map((leg) => {
        const waypoints = leg.waypoints.map((point) => point.label).join("、");
        return `${leg.from.label}到${leg.to.label}：先经${waypoints}`;
      });
    if (!legTexts.length) return "";
    const searchTip = "如果采购港或目的港尚未发现，抵达最后一个航路参照点后沿海岸线低速搜索港口光点。";
    return `推荐航行路线：${legTexts.join("；")}。${searchTip}`;
  }

  function scoreQuest(normalizedQuery, quest) {
    if (!normalizedQuery) return 1;

    const searchable = normalize(
      [
        quest.title,
        ...(quest.aliases || []),
        ...(quest.tags || []),
        quest.start,
        quest.destination,
        quest.npc,
        quest.reward,
        ...(quest.requirements || []),
        ...(quest.prep || []),
        ...(quest.steps || []),
        ...(quest.notes || [])
      ].join(" ")
    );

    if (!searchable) return 0;
    if (normalize(quest.title) === normalizedQuery) return 100;
    if (normalize(quest.title).includes(normalizedQuery)) return 92;
    if (normalizedQuery.includes(normalize(quest.title))) return 88;

    let score = 0;
    const queryTokens = splitTokens(normalizedQuery);
    queryTokens.forEach((token) => {
      if (token.length < 2) return;
      if (searchable.includes(token)) score += token.length >= 4 ? 18 : 12;
    });

    (quest.aliases || []).forEach((alias) => {
      const normalizedAlias = normalize(alias);
      if (normalizedAlias && normalizedQuery.includes(normalizedAlias)) score += 28;
    });

    if (quest.type === inferType(normalizedQuery)) score += 10;
    return Math.min(85, score);
  }

  function splitTokens(text) {
    const asciiTokens = text.match(/[a-z0-9]+/gi) || [];
    const cjkText = text.replace(/[a-z0-9]+/gi, "");
    const cjkChars = Array.from(cjkText);
    const cjkTokens = [];
    for (let size = 2; size <= 5; size += 1) {
      for (let index = 0; index <= cjkChars.length - size; index += 1) {
        cjkTokens.push(cjkChars.slice(index, index + size).join(""));
      }
    }
    return [...asciiTokens, ...cjkTokens];
  }

  function inferType(text) {
    const normalizedText = normalize(text);
    const scores = Object.entries(TYPE_KEYWORDS).map(([type, keywords]) => {
      const score = keywords.reduce((total, keyword) => {
        return total + (normalizedText.includes(normalize(keyword)) ? 1 : 0);
      }, 0);
      return { type, score };
    });
    scores.sort((a, b) => b.score - a.score);
    return scores[0].score > 0 ? scores[0].type : "generic";
  }

  function buildTradePlan(query) {
    const cargo = pickCargo(query);
    const destination = pickDestination(query);
    return {
      id: `generated-${Date.now()}`,
      title: `模板：${query}`,
      type: "trade",
      version: "自动生成",
      aliases: [],
      tags: ["交易", "运输", "交付"],
      start: "接取任务的城市",
      destination,
      npc: "任务指定收货人",
      difficulty: "待判断",
      estimatedTime: "按航线距离而定",
      reward: "交易经验、金钱、声望",
      requirements: ["足够货舱", "任务货物数量", "目的港入港权限"],
      prep: [
        `确认任务需要的货物与数量${cargo ? `：${cargo}` : ""}。`,
        "清理货舱，保留补给和任务货物空间。",
        "检查目的港入港权限、语言或通译方式。",
        "准备水、粮、资材，长途航线额外带停靠港计划。"
      ],
      steps: [
        "接任务后完整阅读任务说明，记录货物、数量、交付城市、交付 NPC 和期限。",
        cargo
          ? `在产地或交易所采购 ${cargo}；若当前港口缺货，先查附近港口或用玩家商店补齐。`
          : "在任务提示的港口或交易所采购指定货物；缺货时先去邻近产地补齐。",
        "采购后立刻核对货舱数量，避免途中交易、灾害或误操作导致数量不足。",
        destination === "任务指定城市"
          ? "按任务日志规划航线前往目的城市，优先选择已入港、补给稳定、海盗风险低的路线。"
          : `规划航线前往${destination}，途中按距离安排补给港，避开高风险海域。`,
        "进港后打开任务日志确认交付地点，依次检查交易所、酒馆、行会、广场和王宫相关 NPC。",
        "交付货物并领取报酬；把准确采购港、交付 NPC 和航线备注存入任务库。"
      ],
      notes: [
        "如果任务有期限，先确认当前船速是否足够，不够就减少绕路。",
        "交易任务失败多半来自货物数量不足、目的港权限不足或找错 NPC。",
        "这是模板步骤；导入真实任务数据后会输出固定 NPC、港口和路线。"
      ]
    };
  }

  function buildAdventurePlan(query) {
    const destination = pickDestination(query);
    return {
      id: `generated-${Date.now()}`,
      title: `模板：${query}`,
      type: "adventure",
      version: "自动生成",
      aliases: [],
      tags: ["冒险", "调查", "发现"],
      start: "冒险者任务介绍人",
      destination,
      npc: "酒馆、书库或任务提示 NPC",
      difficulty: "待判断",
      estimatedTime: "按线索数量而定",
      reward: "冒险经验、发现物、声望",
      requirements: ["任务提示技能", "行动力", "线索 NPC"],
      prep: [
        "确认任务要求的学科技能和触发技能。",
        "携带行动力恢复道具，连续搜索时更稳。",
        "把任务文本中的地名、方向、建筑物、海域和人物名记下来。",
        "若技能不足，先换装备、副官、船员或组队补足。"
      ],
      steps: [
        "接任务后读完说明，提取关键词：目标物、线索来源、调查地点和技能要求。",
        "到任务提示城市收集情报，优先访问酒馆、书库、学者和同城关键 NPC。",
        "每获得一条情报就回看任务日志，确认下一站是否更新。",
        destination === "任务指定地点"
          ? "前往线索指向的海域、城市建筑或郊外登陆点。"
          : `前往${destination}附近，按提示寻找建筑物、坐标或登陆点。`,
        "在目标位置使用观察、搜索或对应学科技能；没有触发时围绕目标点小范围移动后重试。",
        "触发发现或调查完成后，返回任务指定 NPC 报告并领取奖励。",
        "把最终坐标、需要技能等级和全部线索顺序存入任务库。"
      ],
      notes: [
        "冒险任务通常不能只靠任务名完成，线索链很关键。",
        "同一地点可能有多个发现物，技能和站位都会影响触发。",
        "这是模板步骤；真实攻略需要补入坐标、技能等级和 NPC 对话链。"
      ]
    };
  }

  function buildBattlePlan(query) {
    const destination = pickDestination(query);
    return {
      id: `generated-${Date.now()}`,
      title: `模板：${query}`,
      type: "battle",
      version: "自动生成",
      aliases: [],
      tags: ["战斗", "海事", "讨伐"],
      start: "海事任务介绍人",
      destination,
      npc: "海事委托人",
      difficulty: "待判断",
      estimatedTime: "按目标刷新与战斗强度而定",
      reward: "海事经验、金钱、声望",
      requirements: ["战斗船只", "补给", "目标舰队名称"],
      prep: [
        "修理船只并补满炮弹、资材、水手、水粮。",
        "确认炮、装甲、船帆和常用战斗技能快捷键。",
        "记下任务指定舰队名称、海域和击败数量。",
        "战斗压力高时准备撤退道具或找队友同行。"
      ],
      steps: [
        "接任务后读取任务目标，确认需要击败的舰队名称和数量。",
        "补给后出航，前往任务说明中的海域、岛屿、海峡或航线附近搜索。",
        "只攻击任务目标或明确同名舰队，避免浪费补给在无关敌人身上。",
        "开战后保持有利风向和炮击角度，优先减少敌方火力或控制旗舰。",
        "战斗结束后检查任务进度；未完成就继续在同一海域巡航寻找目标。",
        "完成条件后回委托城市报告，交任务前先修船以防返航遇敌。",
        "把目标刷新海域、舰队组成和推荐火力写入任务库。"
      ],
      notes: [
        "任务进度通常绑定具体舰队名称，看到海盗也不一定算数。",
        "如果搜索很久没有目标，换线、换海域边界或重新确认任务说明。",
        "这是模板步骤；真实攻略需要补入坐标、敌方配置和推荐等级。"
      ]
    };
  }

  function buildStoryPlan(query) {
    const destination = pickDestination(query);
    return {
      id: `generated-${Date.now()}`,
      title: `模板：${query}`,
      type: "story",
      version: "自动生成",
      aliases: [],
      tags: ["主线", "剧情", "流程"],
      start: "当前主线城市",
      destination,
      npc: "任务日志指定 NPC",
      difficulty: "待判断",
      estimatedTime: "按对话与航线距离而定",
      reward: "主线奖励、声望、许可或道具",
      requirements: ["当前章节进度", "任务日志", "必要道具"],
      prep: [
        "确认当前章节、职业线或国家线。",
        "把任务日志里的 NPC、城市和道具要求逐条记下。",
        "检查背包是否有剧情道具，避免误卖或丢弃。",
        "出航前补给，主线长距离移动时提前规划停靠港。"
      ],
      steps: [
        "回到任务日志显示的当前城市，先找最近一次对话的主线 NPC。",
        "逐段完成对话，直到任务日志或提示文本发生变化。",
        "如果要求拜访其他 NPC，按城市设施顺序检查：王宫、广场、酒馆、行会、交易所、码头。",
        destination === "任务指定城市"
          ? "根据新提示前往下一座城市，进港后再次确认任务日志。"
          : `根据提示前往${destination}，进港后寻找任务指定 NPC。`,
        "若流程卡住，回到上一位 NPC 重复对话，并检查背包里是否缺少或未交付剧情道具。",
        "完成章节后领取奖励，记录下一章起点和触发条件。"
      ],
      notes: [
        "主线任务常见卡点是漏对话、漏道具或进错城市设施。",
        "不同国家线、职业线和版本可能完全不同，请以任务日志为准。",
        "这是模板步骤；真实攻略需要补入章节、NPC 顺序和触发条件。"
      ]
    };
  }

  function buildGenericPlan(query) {
    return {
      id: `generated-${Date.now()}`,
      title: query ? `模板：${query}` : "任务步骤",
      type: "generic",
      version: "自动生成",
      aliases: [],
      tags: ["通用", "待分类"],
      start: "接任务城市",
      destination: "任务指定地点",
      npc: "任务日志指定 NPC",
      difficulty: "待判断",
      estimatedTime: "待判断",
      reward: "待补充",
      requirements: ["任务日志", "补给", "关键线索"],
      prep: [
        "完整阅读任务说明，先确定任务类型。",
        "记录起点、目的地、NPC、货物或敌方名称。",
        "补充水粮、资材和必要道具。",
        "如果任务描述含技能要求，先确认等级或替代方案。"
      ],
      steps: [
        "接任务后打开任务日志，抄下目标、地点、NPC、数量、期限和奖励。",
        "判断任务类型：运输交付走交易流程，线索发现走冒险流程，击败目标走战斗流程，对话推进走主线流程。",
        "按任务类型准备货物、技能、战斗补给或剧情道具。",
        "规划路线并出航，途中优先保证补给、安全和任务物品不丢失。",
        "到达目标城市或海域后，按任务日志检查 NPC、设施、坐标或敌方舰队。",
        "完成目标后立刻回报任务，领取奖励。",
        "把准确步骤补入任务库，让下次输入同名任务时直接输出精确攻略。"
      ],
      notes: [
        "当前没有命中任务库，所以这是通用拆解。",
        "要获得精确攻略，需要补入真实任务名、NPC、城市、技能、坐标和奖励。",
        "可以用右上角导入 JSON 批量加入任务。"
      ]
    };
  }

  function pickDestination(query) {
    const normalizedQuery = query.trim();
    const japaneseDestination = normalizedQuery.match(
      /([一-龥ぁ-ゔァ-ヴーa-zA-Z0-9]{2,16})(?:へ|まで|に)(?:届ける|届け|納品|配達|配送|運ぶ|向かう|行く|報告|納める)?/
    );
    if (japaneseDestination) return japaneseDestination[1];

    const markers = ["前往", "抵达", "到", "至", "去", "まで", "へ", "に"];
    for (const marker of markers) {
      const index = normalizedQuery.lastIndexOf(marker);
      if (index >= 0 && index + marker.length < normalizedQuery.length) {
        const candidate = normalizedQuery
          .slice(index + marker.length)
          .replace(/[，。,.、\sへにまでをの].*$/, "")
          .trim();
        if (candidate && candidate.length <= 12) return candidate;
      }
    }
    return "任务指定地点";
  }

  function pickCargo(query) {
    const match = query.match(
      /(?:运送|运输|交付|购买|采购|送|納品|配達|配送|購入|届ける|運ぶ)([^到至去，。,.、\sへにまでをの]{2,12})/
    );
    return match ? match[1] : "";
  }

  function saveGeneratedPlan() {
    if (!state.currentPlan) {
      showToast("还没有可保存的任务步骤。");
      return;
    }

    const exists = state.quests.some((quest) => quest.title === state.currentPlan.title);
    if (exists) {
      showToast("任务库里已经有同名任务。");
      return;
    }

    const savedQuest = {
      ...state.currentPlan,
      id: `custom-${Date.now()}`,
      version: state.currentPlan.version === "自动生成" ? "自定义草稿" : state.currentPlan.version,
      title: state.currentPlan.title.replace(/^模板：/, "")
    };
    state.quests.unshift(savedQuest);
    state.activeQuestId = savedQuest.id;
    saveLibrary();
    renderQuestList(els.input.value);
    renderPlan(savedQuest, {
      status: "已存入任务库",
      confidence: 100,
      source: "library"
    });
    showToast("已存入本地任务库。");
  }

  async function copyCurrentPlan() {
    if (!state.currentPlan) {
      showToast("还没有可复制的步骤。");
      return;
    }

    const plan = state.currentPlan;
    const lines = [
      `# ${plan.title}`,
      `类型：${TYPE_LABELS[plan.type] || "通用"}`,
      `起点：${plan.start || "待补充"}`,
      `目的地：${plan.destination || "待补充"}`,
      `关键 NPC：${plan.npc || "待补充"}`,
      "",
      "准备清单：",
      ...ensureArray(plan.prep).map((item) => `- ${item}`),
      "",
      "步骤：",
      ...ensureArray(plan.steps).map((item, index) => `${index + 1}. ${item}`),
      "",
      "注意事项：",
      ...ensureArray(plan.notes).map((item) => `- ${item}`)
    ];

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      showToast("步骤已复制。");
    } catch (error) {
      showToast("浏览器限制了复制权限，可手动选中页面内容。");
    }
  }

  function exportLibrary() {
    const blob = new Blob([JSON.stringify(state.quests, null, 2)], {
      type: "application/json;charset=utf-8"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "uw-quest-library.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast("任务库已导出。");
  }

  function importLibrary(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || "");
        const extension = file.name.split(".").pop().toLowerCase();
        const imported =
          extension === "csv" || extension === "tsv"
            ? parseDelimitedQuests(text, extension === "tsv" ? "\t" : ",")
            : JSON.parse(text);
        if (!Array.isArray(imported)) {
          showToast("导入失败：文件内容需要是任务数组或带表头的表格。");
          return;
        }
        const normalized = normalizeQuestList(imported);
        if (normalized.length === 0) {
          showToast("导入失败：没有读到有效任务。");
          return;
        }
        state.quests = mergeQuestLists(state.quests, normalized);
        saveLibrary();
        renderQuestList(els.input.value);
        showToast(`已导入 ${normalized.length} 条任务并合并。`);
      } catch (error) {
        console.warn("Import failed", error);
        showToast("导入失败：请检查 JSON/CSV/TSV 格式和 UTF-8 编码。");
      } finally {
        event.target.value = "";
      }
    };
    reader.readAsText(file, "utf-8");
  }

  function parseDelimitedQuests(text, delimiter) {
    const rows = parseDelimitedRows(text, delimiter).filter((row) =>
      row.some((cell) => cell.trim())
    );
    if (rows.length < 2) return [];

    const headers = rows[0].map((header) => normalizeHeader(header));
    return rows.slice(1).map((row) => {
      const raw = {};
      headers.forEach((header, index) => {
        const field = resolveFieldName(header);
        if (!field) return;
        raw[field] = row[index] || "";
      });
      return normalizeImportedQuest(raw);
    });
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

  function normalizeImportedQuest(raw) {
    const quest = { ...raw };
    ["aliases", "tags", "requirements", "prep", "steps", "notes"].forEach((field) => {
      quest[field] = splitImportList(quest[field]);
    });
    quest.type = normalizeType(quest.type || inferType([quest.title, quest.tags].join(" ")));
    return quest;
  }

  function splitImportList(value) {
    if (Array.isArray(value)) return value.filter(Boolean);
    return String(value || "")
      .split(/\s*(?:\||；|;)\s*/g)
      .map((item) => item.trim())
      .filter(Boolean);
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

  function normalizeType(value) {
    const normalizedType = normalize(value);
    if (["trade", "交易", "商人", "納品", "配達", "配送", "交易商人"].includes(normalizedType)) {
      return "trade";
    }
    if (["adventure", "冒险", "冒険", "発見", "探索", "調査"].includes(normalizedType)) {
      return "adventure";
    }
    if (["battle", "战斗", "戰鬥", "海事", "戦闘", "討伐", "護衛"].includes(normalizedType)) {
      return "battle";
    }
    if (["story", "主线", "主線", "剧情", "メイン", "ストーリー", "シナリオ"].includes(normalizedType)) {
      return "story";
    }
    return normalizedType || "generic";
  }

  function mergeQuestLists(current, imported) {
    const map = new Map();
    [...imported, ...current].forEach((quest) => {
      const key = normalize(quest.title);
      if (!map.has(key)) map.set(key, quest);
    });
    return Array.from(map.values());
  }

  function resetLibrary() {
    state.quests = normalizeQuestList(window.STARTER_QUESTS || []);
    state.activeQuestId = null;
    saveLibrary();
    renderQuestList(els.input.value);
    showToast("已恢复示例任务库。");
  }

  function normalize(text) {
    return String(text || "")
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[\u30a1-\u30f6]/g, (char) =>
        String.fromCharCode(char.charCodeAt(0) - 0x60)
      )
      .replace(/./gu, (char) => TRADITIONAL_SEARCH_MAP[char] || char)
      .replace(/[^\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー々a-z0-9]+/gu, "");
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.add("show");
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => {
      els.toast.classList.remove("show");
    }, 2200);
  }
})();
