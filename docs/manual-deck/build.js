const path = require("path");
const fs = require("fs");
const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const fa = require("react-icons/fa");

const IMG = path.join(__dirname, "img");
const OUT = process.argv[2] || path.join(__dirname, "deck.pptx");

// 色票：跟工具一樣的 LINE 綠＋米色
const C = {
  dk: "123B2E", g: "1E9E6A", gl: "E3F4EC", cream: "FAF7F0", card: "FFFFFF",
  or: "F08A3C", orl: "FDEBDC", ink: "26302B", dim: "66706B", line: "DDE3DF", red: "C8553D", redl: "FBE7E2"
};
const F = "Microsoft JhengHei";

const size = {}; // 圖片原始尺寸
async function loadSizes() {
  for (const f of fs.readdirSync(IMG)) {
    const m = await sharp(path.join(IMG, f)).metadata();
    size[f] = [m.width, m.height];
  }
}
async function icon(Comp, color, px = 256) {
  const svg = ReactDOMServer.renderToStaticMarkup(React.createElement(Comp, { color: "#" + color, size: String(px) }));
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  return "image/png;base64," + buf.toString("base64");
}
const shadow = () => ({ type: "outer", color: "000000", blur: 8, offset: 2, angle: 90, opacity: 0.12 });

let pres, n = 0;
function base(title, kicker) {
  const s = pres.addSlide();
  n++;
  s.background = { color: C.cream };
  if (kicker) s.addText(kicker, { x: 0.5, y: 0.28, w: 6, h: 0.3, fontFace: F, fontSize: 11, bold: true, color: C.g, margin: 0, charSpacing: 2 });
  s.addText(title, { x: 0.5, y: kicker ? 0.55 : 0.4, w: 9, h: 0.6, fontFace: F, fontSize: 28, bold: true, color: C.dk, margin: 0 });
  s.addText(String(n), { x: 9.2, y: 5.2, w: 0.4, h: 0.25, fontFace: F, fontSize: 10, color: C.dim, align: "right", margin: 0 });
  return s;
}
// 截圖：等比放進框內，外加白底框與陰影
function shot(s, file, x, y, w, h, opt = {}) {
  const [iw, ih] = size[file];
  let dw = w, dh = w * ih / iw;
  if (dh > h) { dh = h; dw = h * iw / ih; }
  const dx = x + (opt.alignLeft ? 0 : (w - dw) / 2), dy = y + (opt.alignTop ? 0 : (h - dh) / 2);
  const pad = 0.06;
  s.addShape(pres.shapes.RECTANGLE, { x: dx - pad, y: dy - pad, w: dw + pad * 2, h: dh + pad * 2, fill: { color: C.card }, line: { color: C.line, width: 0.75 }, shadow: shadow() });
  s.addImage({ path: path.join(IMG, file), x: dx, y: dy, w: dw, h: dh });
  return { x: dx, y: dy, w: dw, h: dh };
}
function badge(s, num, x, y, d = 0.42, fill = C.g) {
  s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: fill }, line: { color: fill } });
  s.addText(String(num), { x, y, w: d, h: d, fontFace: F, fontSize: d > 0.5 ? 20 : 13, bold: true, color: "FFFFFF", align: "center", valign: "middle", margin: 0 });
}
// 編號說明列：[標題, 說明]
function tips(s, items, x, y, w, gap = 0.78, numFill = C.g) {
  items.forEach((it, i) => {
    const yy = y + i * gap;
    badge(s, i + 1, x, yy, 0.36, numFill);
    s.addText(it[0], { x: x + 0.5, y: yy - 0.03, w: w - 0.5, h: 0.3, fontFace: F, fontSize: 14, bold: true, color: C.ink, margin: 0 });
    if (it[1]) s.addText(it[1], { x: x + 0.5, y: yy + 0.27, w: w - 0.5, h: gap - 0.3, fontFace: F, fontSize: 11, color: C.dim, margin: 0, valign: "top" });
  });
}
function callout(s, text, x, y, w, h, kind = "g") {
  const fill = kind === "or" ? C.orl : kind === "red" ? C.redl : C.gl;
  const bar = kind === "or" ? C.or : kind === "red" ? C.red : C.g;
  s.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: fill }, line: { color: fill } });
  s.addShape(pres.shapes.RECTANGLE, { x, y, w: 0.07, h, fill: { color: bar }, line: { color: bar } });
  s.addText(text, { x: x + 0.2, y, w: w - 0.3, h, fontFace: F, fontSize: 12, color: C.ink, valign: "middle", margin: 0 });
}

async function main() {
  await loadSizes();
  pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  pres.author = "Mark Tsai（蔡豐全）";
  pres.title = "LINE 貼圖自動化助手 操作手冊";

  const I = {
    pen: await icon(fa.FaPenFancy, C.g), list: await icon(fa.FaListUl, C.g), img: await icon(fa.FaImages, C.g), cut: await icon(fa.FaCut, C.g),
    key: await icon(fa.FaKey, "FFFFFF"), hand: await icon(fa.FaHandPointer, "FFFFFF"), check: await icon(fa.FaCheckCircle, C.g),
    warn: await icon(fa.FaExclamationTriangle, C.or), save: await icon(fa.FaSave, C.g), mobile: await icon(fa.FaMobileAlt, C.g),
    zip: await icon(fa.FaFileArchive, C.g), q: await icon(fa.FaQuestion, "FFFFFF"), arrow: await icon(fa.FaArrowRight, C.g),
    user: await icon(fa.FaUserCircle, C.g), globe: await icon(fa.FaGlobeAsia, "FFFFFF")
  };

  // ---------- 1 封面 ----------
  {
    const s = pres.addSlide(); n++;
    s.background = { color: C.dk };
    s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 5.625, fill: { color: C.dk } });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.6, y: 0.7, w: 0.75, h: 0.75, fill: { color: C.g }, line: { color: C.g }, rectRadius: 0.15 });
    s.addText("貼", { x: 0.6, y: 0.7, w: 0.75, h: 0.75, fontFace: F, fontSize: 28, bold: true, color: "FFFFFF", align: "center", valign: "middle", margin: 0 });
    s.addText("操作手冊", { x: 1.55, y: 0.78, w: 4, h: 0.6, fontFace: F, fontSize: 16, color: "A8D8C2", valign: "middle", margin: 0, charSpacing: 4 });
    s.addText("LINE 貼圖\n自動化助手", { x: 0.6, y: 1.65, w: 5.2, h: 1.7, fontFace: F, fontSize: 44, bold: true, color: "FFFFFF", margin: 0, valign: "top", paraSpaceAfter: 0 });
    s.addText("一句主題＋一張角色圖\n→ 24 張可以直接上架的 LINE 貼圖", { x: 0.6, y: 3.45, w: 5.2, h: 0.8, fontFace: F, fontSize: 15, color: "D5EDE2", margin: 0, valign: "top" });
    s.addText("m255525.github.io/line-sticker-studio", { x: 0.6, y: 4.75, w: 5, h: 0.3, fontFace: "Consolas", fontSize: 12, color: "7FC4A5", margin: 0 });
    // 右側貼圖拼貼
    const pos = [[6.0, 0.55], [7.75, 0.75], [6.25, 2.15], [8.0, 2.35], [6.0, 3.75], [7.75, 3.9]];
    pos.forEach(([x, y], i) => {
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: 1.55, h: 1.5, fill: { color: "FFFFFF" }, line: { color: "FFFFFF" }, rectRadius: 0.12, rotate: i % 2 ? 4 : -4, shadow: shadow() });
      const [iw, ih] = size["st" + i + ".png"]; const h = 1.3, w = h * iw / ih;
      s.addImage({ path: path.join(IMG, "st" + i + ".png"), x: x + (1.55 - w) / 2, y: y + 0.1, w, h, rotate: i % 2 ? 4 : -4 });
    });
  }

  // ---------- 2 能幫你做什麼 ----------
  {
    const s = base("這個工具幫你做什麼？", "先看懂全貌");
    // 你提供
    s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 1.45, w: 3.6, h: 3.4, fill: { color: C.card }, line: { color: C.line }, shadow: shadow() });
    s.addText("你只要準備", { x: 0.75, y: 1.6, w: 3, h: 0.4, fontFace: F, fontSize: 16, bold: true, color: C.dk, margin: 0 });
    [["一句貼圖主題", "例如：上班族柴犬，愛喝咖啡、常常加班"], ["一張角色參考圖（建議）", "正面、清楚、只有一個角色"], ["選好語言和畫風", "台灣口語、Q 版可愛…都有預設"]].forEach((t, i) => {
      const y = 2.15 + i * 0.85;
      s.addImage({ data: I.check, x: 0.75, y: y + 0.02, w: 0.28, h: 0.28 });
      s.addText(t[0], { x: 1.15, y, w: 2.8, h: 0.3, fontFace: F, fontSize: 13, bold: true, color: C.ink, margin: 0 });
      s.addText(t[1], { x: 1.15, y: y + 0.3, w: 2.8, h: 0.45, fontFace: F, fontSize: 10.5, color: C.dim, margin: 0, valign: "top" });
    });
    s.addImage({ data: I.arrow, x: 4.3, y: 2.9, w: 0.5, h: 0.5 });
    // 你得到
    s.addShape(pres.shapes.RECTANGLE, { x: 5.0, y: 1.45, w: 4.5, h: 3.4, fill: { color: C.dk }, line: { color: C.dk }, shadow: shadow() });
    s.addText("工具幫你完成", { x: 5.25, y: 1.6, w: 4, h: 0.4, fontFace: F, fontSize: 16, bold: true, color: "FFFFFF", margin: 0 });
    s.addText("24", { x: 5.25, y: 2.05, w: 1.6, h: 1.0, fontFace: F, fontSize: 60, bold: true, color: "6FD3A6", margin: 0, valign: "middle" });
    s.addText("張透明背景貼圖\n台詞自動疊上，不會寫錯中文", { x: 6.85, y: 2.15, w: 2.5, h: 0.8, fontFace: F, fontSize: 12, color: "D5EDE2", margin: 0, valign: "middle" });
    [["＋ main.png 主要圖片、tab.png 聊天室標籤", ""], ["＋ 自動檢查 LINE 上架規格", ""], ["＋ 打包成 ZIP，直接上傳", ""]].forEach((t, i) => {
      s.addText(t[0], { x: 5.25, y: 3.3 + i * 0.45, w: 4.1, h: 0.35, fontFace: F, fontSize: 13, color: "FFFFFF", margin: 0 });
    });
  }

  // ---------- 3 四個步驟 ----------
  {
    const s = base("四個步驟就完成", "整體流程");
    const steps = [
      [I.pen, "主題與角色", "寫主題、上傳角色圖，挑語言模式和畫風"],
      [I.list, "台詞設定", "自動帶入常用台詞，可以手改或讓 AI 改寫"],
      [I.img, "生成貼圖", "AI 一次畫一張多格「網格圖」，24 張分 2 批"],
      [I.cut, "切割匯出", "自動切格、去背、疊字，勾選後下載 ZIP"]
    ];
    const w = 2.0, gap = 0.27, x0 = 0.5;
    steps.forEach((st, i) => {
      const x = x0 + i * (w + gap);
      s.addShape(pres.shapes.RECTANGLE, { x, y: 1.55, w, h: 2.75, fill: { color: C.card }, line: { color: C.line }, shadow: shadow() });
      s.addShape(pres.shapes.RECTANGLE, { x, y: 1.55, w, h: 0.08, fill: { color: C.g }, line: { color: C.g } });
      badge(s, i + 1, x + 0.2, 1.85, 0.5);
      s.addImage({ data: st[0], x: x + w - 0.65, y: 1.9, w: 0.42, h: 0.42 });
      s.addText(st[1], { x: x + 0.2, y: 2.6, w: w - 0.4, h: 0.4, fontFace: F, fontSize: 17, bold: true, color: C.dk, margin: 0 });
      s.addText(st[2], { x: x + 0.2, y: 3.1, w: w - 0.4, h: 1.1, fontFace: F, fontSize: 13.5, color: C.dim, margin: 0, valign: "top" });
    });
    callout(s, "畫面上方有 1～4 的步驟按鈕，可以隨時跳回前面修改；每一步右下角也有「下一步」按鈕。", 0.5, 4.6, 9, 0.55);
  }

  // ---------- 4 兩種玩法 ----------
  {
    const s = base("有沒有 API 金鑰都能用", "選一種做法");
    const col = (x, fill, ic, title, sub, items, dark) => {
      s.addShape(pres.shapes.RECTANGLE, { x, y: 1.45, w: 4.35, h: 2.95, fill: { color: fill }, line: { color: dark ? fill : C.line }, shadow: shadow() });
      s.addShape(pres.shapes.OVAL, { x: x + 0.3, y: 1.7, w: 0.6, h: 0.6, fill: { color: dark ? C.g : C.or }, line: { color: dark ? C.g : C.or } });
      s.addImage({ data: ic, x: x + 0.45, y: 1.85, w: 0.3, h: 0.3 });
      s.addText(title, { x: x + 1.05, y: 1.68, w: 3.1, h: 0.36, fontFace: F, fontSize: 17, bold: true, color: dark ? "FFFFFF" : C.dk, margin: 0 });
      s.addText(sub, { x: x + 1.05, y: 2.04, w: 3.1, h: 0.3, fontFace: F, fontSize: 11, color: dark ? "A8D8C2" : C.dim, margin: 0 });
      s.addText(items.map((t, i) => ({ text: t, options: { bullet: { type: "number" }, breakLine: i < items.length - 1 } })),
        { x: x + 0.3, y: 2.55, w: 3.85, h: 1.7, fontFace: F, fontSize: 13.5, color: dark ? "FFFFFF" : C.ink, valign: "top", paraSpaceAfter: 6, margin: 0 });
    };
    col(0.5, C.dk, I.key, "全自動：自備金鑰", "按一下就生圖，最省時間", [
      "在「AI 連線設定」貼上 Gemini 等金鑰",
      "步驟 3 按「全部 AI 自動生成」",
      "到步驟 4 按「執行切割」",
      "勾選要的貼圖，下載 ZIP"
    ], true);
    col(5.15, C.card, I.hand, "手動模式：不用金鑰", "用你自己的 ChatGPT／Gemini 網頁版", [
      "步驟 3 每批按「複製提示詞」",
      "貼到 Gemini 或 ChatGPT，附上角色圖",
      "把生好的圖存下來，按「上傳網格圖」",
      "到步驟 4 切割、勾選、下載 ZIP"
    ], false);
    callout(s, "不確定要用哪一種？先用手動模式或「產生示範網格」跑一次完整流程，熟悉後再決定要不要申請金鑰。", 0.5, 4.6, 9, 0.55);
  }

  // ---------- 5 AI 連線設定 ----------
  {
    const s = base("開始前：AI 連線設定（選用）", "準備");
    shot(s, "sai.png", 0.5, 1.4, 5.6, 2.4);
    tips(s, [
      ["點開「AI 連線設定」", "在畫面最上方，預設是收起來的"],
      ["左邊管生圖、右邊管台詞", "生圖預設 Gemini，也可選 OpenRouter、OpenAI"],
      ["貼上金鑰就好", "沒有金鑰？點「申請 Gemini 金鑰」連結"]
    ], 6.5, 1.45, 3.1, 0.85);
    callout(s, "金鑰只存在你自己的瀏覽器，不會上傳到別的地方。生圖會用到你自己的 API 額度，可能產生費用。", 0.5, 4.3, 9, 0.6, "or");
  }

  // ---------- 6 步驟 1 ----------
  {
    const s = base("步驟 1：主題與角色", "STEP 1");
    shot(s, "s1a.png", 0.5, 1.3, 5.3, 3.9);
    tips(s, [
      ["寫一句主題", "誰＋個性＋愛做什麼，例如「上班族柴犬，愛喝咖啡」。下方有範例可以點"],
      ["上傳角色參考圖", "拖進右邊的虛線框。正面、清楚、單一角色最好"],
      ["挑語言、畫風、張數", "不知道怎麼選？下一頁有建議"],
      ["按「下一步：台詞設定」", "在畫面右下角"]
    ], 6.2, 1.4, 3.4, 0.92);
  }

  // ---------- 7 常用設定建議 ----------
  {
    const s = base("步驟 1 的設定，新手這樣選", "STEP 1　設定建議");
    const cards = [
      ["語言模式", "台灣日常口語", "另有職場、長輩、情侶、台語、中英混搭、英文、日文，每種都有 24 句"],
      ["畫風", "Q 版可愛", "還有手繪、水彩、扁平、像素、厚塗"],
      ["貼圖張數", "24 張", "LINE 上架只接受 8／16／24／32／40 張"],
      ["台詞文字", "程式疊字（推薦）", "AI 只畫角色，字由程式疊上，中文不會錯字，之後也能改"],
      ["生圖背景", "綠幕（推薦）", "最好去背。角色本身是綠色時改用洋紅"],
      ["主題拆解", "先用「不使用 AI」", "熟悉後再試「AI 拆解主題」，角色會更一致"]
    ];
    cards.forEach((c, i) => {
      const col = i % 3, row = Math.floor(i / 3);
      const x = 0.5 + col * 3.05, y = 1.4 + row * 1.85, w = 2.85, h = 1.65;
      s.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: C.card }, line: { color: C.line }, shadow: shadow() });
      s.addText(c[0], { x: x + 0.2, y: y + 0.15, w: w - 0.4, h: 0.28, fontFace: F, fontSize: 11, color: C.dim, margin: 0 });
      s.addText(c[1], { x: x + 0.2, y: y + 0.43, w: w - 0.4, h: 0.4, fontFace: F, fontSize: 17, bold: true, color: C.g, margin: 0 });
      s.addText(c[2], { x: x + 0.2, y: y + 0.88, w: w - 0.4, h: 0.68, fontFace: F, fontSize: 10.5, color: C.ink, margin: 0, valign: "top" });
    });
  }

  // ---------- 8 步驟 2 ----------
  {
    const s = base("步驟 2：台詞設定", "STEP 2");
    shot(s, "s2a.png", 0.5, 1.3, 5.6, 2.75);
    tips(s, [
      ["台詞已經自動填好", "依語言模式帶入 24 句常用台詞，直接用就可以"],
      ["想改就直接打字", "左欄「台詞」是貼圖上的字"],
      ["右欄是給 AI 看的動作", "英文描述角色要做的動作，可以加道具"]
    ], 6.5, 1.4, 3.1, 0.9);
    callout(s, "有文字模型金鑰時，按「AI 依主題改寫台詞」：上班族柴犬就會出現「打卡」「加班」這類台詞。換語言模式會把台詞重設成預設值。", 0.5, 4.4, 9, 0.7);
  }

  // ---------- 9 步驟 3 ----------
  {
    const s = base("步驟 3：生成貼圖網格", "STEP 3");
    shot(s, "s3.png", 0.5, 1.3, 5.6, 3.9);
    tips(s, [
      ["一張圖裡有好幾格", "24 張預設分 2 批，每批 4×3＝12 格"],
      ["有金鑰：全部 AI 自動生成", "某一批畫不好，可以單獨重按那批的「AI 生成」"],
      ["沒金鑰：複製提示詞", "貼到聊天 AI 生圖後，用「上傳網格圖」放回來"],
      ["先試玩：產生示範網格", "程式畫的小熊，不用金鑰就能試切割"]
    ], 6.5, 1.4, 3.1, 0.92);
  }

  // ---------- 10 手動流程 ----------
  {
    const s = base("沒有金鑰？用聊天 AI 生圖", "STEP 3　手動模式");
    const flow = [
      ["複製提示詞", "步驟 3 每一批都有「複製提示詞」"],
      ["開 Gemini 或 ChatGPT", "用網頁版就好，不花 API 費用"],
      ["貼上＋附角色圖", "一定要附上同一張角色參考圖"],
      ["下載生好的圖", "整張網格圖存到電腦"],
      ["上傳網格圖", "回到工具，放進對應的批次"]
    ];
    const w = 1.66, gap = 0.17;
    flow.forEach((f, i) => {
      const x = 0.5 + i * (w + gap), y = 1.6;
      s.addShape(pres.shapes.RECTANGLE, { x, y, w, h: 2.2, fill: { color: i === 2 ? C.dk : C.card }, line: { color: i === 2 ? C.dk : C.line }, shadow: shadow() });
      badge(s, i + 1, x + (w - 0.5) / 2, y + 0.25, 0.5, i === 2 ? C.or : C.g);
      s.addText(f[0], { x: x + 0.1, y: y + 0.9, w: w - 0.2, h: 0.4, fontFace: F, fontSize: 14, bold: true, color: i === 2 ? "FFFFFF" : C.dk, align: "center", margin: 0 });
      s.addText(f[1], { x: x + 0.12, y: y + 1.35, w: w - 0.24, h: 0.75, fontFace: F, fontSize: 10.5, color: i === 2 ? "D5EDE2" : C.dim, align: "center", margin: 0, valign: "top" });
    });
    callout(s, "省 token 小撇步：步驟 1 的「產生提示詞」區可以選「精簡版」，提示詞大約短 40～60%。沒有參考圖時，先生第 1 批，再把它當參考圖附給第 2 批，角色才會長得一樣。", 0.5, 4.15, 9, 0.85);
  }

  // ---------- 11 步驟 4 切割 ----------
  {
    const s = base("步驟 4：自動切割", "STEP 4");
    shot(s, "s4a.png", 0.5, 1.3, 5.6, 3.65);
    s.addText("按綠色「執行切割」，紅色虛線就是切割線。切不好時調這三個：", { x: 6.4, y: 1.35, w: 3.2, h: 0.65, fontFace: F, fontSize: 12, color: C.ink, margin: 0, valign: "top" });
    const t = [["去背容差", "背景沒去乾淨 → 調高\n角色邊緣被吃掉 → 調低"], ["外框內縮／格線間距", "虛線沒對準格子時調整"], ["雜點清除", "旁邊的愛心、汗滴被刪掉 → 關掉"]];
    t.forEach((x, i) => {
      const y = 2.1 + i * 1.0;
      s.addShape(pres.shapes.RECTANGLE, { x: 6.4, y, w: 3.2, h: 0.88, fill: { color: C.card }, line: { color: C.line } });
      s.addShape(pres.shapes.RECTANGLE, { x: 6.4, y, w: 0.07, h: 0.88, fill: { color: C.g }, line: { color: C.g } });
      s.addText(x[0], { x: 6.6, y: y + 0.08, w: 2.9, h: 0.3, fontFace: F, fontSize: 13, bold: true, color: C.dk, margin: 0 });
      s.addText(x[1], { x: 6.6, y: y + 0.38, w: 2.9, h: 0.45, fontFace: F, fontSize: 10.5, color: C.dim, margin: 0, valign: "top" });
    });
  }

  // ---------- 12 檢查與勾選 ----------
  {
    const s = base("步驟 4：檢查、改字、勾選要下載的圖", "STEP 4　新功能");
    shot(s, "s4b.png", 0.5, 1.3, 9, 2.4);
    const items = [
      ["☑ 下載勾選框", "不想要的那張取消勾選，就不會放進 ZIP（會變淡）"],
      ["全選／全不選／只選符合規格", "一鍵調整；「只選符合規格」會自動排除有問題的圖"],
      ["☆ 設成主要圖片", "main.png 和 tab.png 會用這張角色產生"],
      ["下方輸入框改台詞", "改完馬上重新疊字，勾選狀態不會跑掉"]
    ];
    items.forEach((it, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = 0.5 + col * 4.6, y = 4.0 + row * 0.7;
      badge(s, i + 1, x, y, 0.34);
      s.addText(it[0], { x: x + 0.45, y: y - 0.04, w: 3.95, h: 0.28, fontFace: F, fontSize: 12.5, bold: true, color: C.ink, margin: 0 });
      s.addText(it[1], { x: x + 0.45, y: y + 0.24, w: 3.95, h: 0.3, fontFace: F, fontSize: 10.5, color: C.dim, margin: 0 });
    });
  }

  // ---------- 13 匯出 ----------
  {
    const s = base("下載 ZIP：規格檢查幫你把關", "STEP 4　匯出");
    shot(s, "s4c.png", 0.5, 1.3, 5.5, 3.9);
    const rows = [
      [C.g, "✓ 綠色：全部符合", "ZIP 可以直接上傳 LINE Creators Market"],
      [C.or, "! 橘色：張數不是上架張數", "例如勾了 23 張。可以下載自用，但不能直接上架"],
      [C.red, "✗ 紅色：有圖不合規格", "按鈕會鎖住。取消勾選那張，或調整後重新切割"]
    ];
    rows.forEach((r, i) => {
      const y = 1.4 + i * 0.95;
      s.addShape(pres.shapes.RECTANGLE, { x: 6.35, y, w: 3.25, h: 0.82, fill: { color: C.card }, line: { color: C.line } });
      s.addShape(pres.shapes.RECTANGLE, { x: 6.35, y, w: 0.08, h: 0.82, fill: { color: r[0] }, line: { color: r[0] } });
      s.addText(r[1], { x: 6.55, y: y + 0.07, w: 3, h: 0.3, fontFace: F, fontSize: 12.5, bold: true, color: r[0], margin: 0 });
      s.addText(r[2], { x: 6.55, y: y + 0.36, w: 3, h: 0.42, fontFace: F, fontSize: 10, color: C.dim, margin: 0, valign: "top" });
    });
    s.addImage({ data: I.zip, x: 6.35, y: 4.37, w: 0.36, h: 0.36 });
    s.addText("ZIP 裡有 01.png～NN.png（依勾選順序重新編號）＋ main.png ＋ tab.png", { x: 6.85, y: 4.27, w: 2.75, h: 0.75, fontFace: F, fontSize: 10.5, color: C.ink, margin: 0, valign: "middle" });
  }

  // ---------- 14 常見問題 ----------
  {
    const s = base("常見問題", "Q & A");
    const qa = [
      ["每格角色長得不一樣？", "上傳角色參考圖；或先用「AI 拆解主題」，提示詞會加入固定的角色設定。"],
      ["AI 畫的字都是錯字？", "台詞文字選「程式疊字」，AI 只畫角色，字由工具疊上。"],
      ["去背後角色破洞或留綠邊？", "調整「去背容差」。白底圖改用「從邊緣去背」會保留角色裡的白色。"],
      ["做到一半想下次再繼續？", "右上角「儲存專案」存成 .json，下次用「開啟專案」載回來。"]
    ];
    qa.forEach((q, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = 0.5 + col * 4.6, y = 1.4 + row * 1.85, w = 4.4, h = 1.65;
      s.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: C.card }, line: { color: C.line }, shadow: shadow() });
      s.addShape(pres.shapes.OVAL, { x: x + 0.2, y: y + 0.2, w: 0.42, h: 0.42, fill: { color: C.or }, line: { color: C.or } });
      s.addImage({ data: I.q, x: x + 0.31, y: y + 0.31, w: 0.2, h: 0.2 });
      s.addText(q[0], { x: x + 0.75, y: y + 0.2, w: w - 0.95, h: 0.42, fontFace: F, fontSize: 14, bold: true, color: C.dk, margin: 0, valign: "middle" });
      s.addText(q[1], { x: x + 0.75, y: y + 0.72, w: w - 0.95, h: 0.85, fontFace: F, fontSize: 13.5, color: C.ink, margin: 0, valign: "top" });
    });
  }

  // ---------- 15 上架前提醒 ----------
  {
    const s = base("上架前一定要確認", "注意事項");
    s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 1.4, w: 5.4, h: 3.75, fill: { color: C.card }, line: { color: C.line }, shadow: shadow() });
    s.addImage({ data: I.warn, x: 0.75, y: 1.6, w: 0.4, h: 0.4 });
    s.addText("版權與審核", { x: 1.3, y: 1.6, w: 4, h: 0.4, fontFace: F, fontSize: 16, bold: true, color: C.dk, margin: 0, valign: "middle" });
    const w = ["角色參考圖要是你自己畫的，或已經取得授權", "不可以用別人的卡通角色、商標或真人照片", "AI 改寫的台詞，自己再看一次是否得體", "AI 生圖能不能商用，依各服務商的條款而定", "本工具不保證一定能通過 LINE 審核"];
    s.addText(w.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < w.length - 1 } })), { x: 0.75, y: 2.25, w: 4.95, h: 2.8, fontFace: F, fontSize: 14, color: C.ink, valign: "top", paraSpaceAfter: 13, margin: 0 });
    const side = [[I.save, "儲存專案", "主題、台詞、參考圖、網格圖一次存成 .json"], [I.mobile, "加入主畫面", "按右上角「加入主畫面」，像 App 一樣開啟"], [I.user, "資料只在你的電腦", "金鑰與圖片都存在本機瀏覽器，公用電腦用完請清除"]];
    side.forEach((t, i) => {
      const y = 1.4 + i * 1.28;
      s.addShape(pres.shapes.RECTANGLE, { x: 6.15, y, w: 3.45, h: 1.12, fill: { color: C.gl }, line: { color: C.gl } });
      s.addImage({ data: t[0], x: 6.35, y: y + 0.2, w: 0.36, h: 0.36 });
      s.addText(t[1], { x: 6.85, y: y + 0.15, w: 2.65, h: 0.32, fontFace: F, fontSize: 13.5, bold: true, color: C.dk, margin: 0 });
      s.addText(t[2], { x: 6.85, y: y + 0.48, w: 2.65, h: 0.58, fontFace: F, fontSize: 10.5, color: C.ink, margin: 0, valign: "top" });
    });
  }

  // ---------- 16 結尾 ----------
  {
    const s = pres.addSlide(); n++;
    s.background = { color: C.dk };
    s.addText("現在就做一組貼圖吧！", { x: 0.6, y: 1.0, w: 8.8, h: 0.8, fontFace: F, fontSize: 36, bold: true, color: "FFFFFF", margin: 0 });
    s.addText("沒有金鑰也可以：先按「產生示範網格」試試看整個流程。", { x: 0.6, y: 1.85, w: 8.8, h: 0.4, fontFace: F, fontSize: 15, color: "D5EDE2", margin: 0 });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.6, y: 2.6, w: 6.2, h: 0.75, fill: { color: C.g }, line: { color: C.g }, rectRadius: 0.12 });
    s.addImage({ data: I.globe, x: 0.85, y: 2.8, w: 0.35, h: 0.35 });
    s.addText("m255525.github.io/line-sticker-studio", { x: 1.35, y: 2.6, w: 5.3, h: 0.75, fontFace: "Consolas", fontSize: 18, bold: true, color: "FFFFFF", margin: 0, valign: "middle",
      hyperlink: { url: "https://m255525.github.io/line-sticker-studio/" } });
    s.addText("工具右上角「📖 操作手冊」有更完整的說明", { x: 0.6, y: 3.5, w: 8, h: 0.35, fontFace: F, fontSize: 12, color: "A8D8C2", margin: 0 });
    s.addText("製作：Mark Tsai（蔡豐全）｜tsaimark@gmail.com", { x: 0.6, y: 4.75, w: 6, h: 0.3, fontFace: F, fontSize: 11, color: "7FC4A5", margin: 0 });
    [[0, 7.15, 2.35], [3, 8.4, 2.75], [5, 7.35, 4.1]].forEach(([k, x, y]) => {
      const [iw, ih] = size["st" + k + ".png"]; const h = 1.3, w = h * iw / ih;
      s.addImage({ path: path.join(IMG, "st" + k + ".png"), x, y, w, h });
    });
  }

  await pres.writeFile({ fileName: OUT });
  console.log("wrote", OUT, n, "slides");
}
main().catch(e => { console.error(e); process.exit(1); });
