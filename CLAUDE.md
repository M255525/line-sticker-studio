# line-sticker-studio — LINE 貼圖自動化助手

單檔靜態網頁（`index.html`＋`manual.html`＋PWA）。輸入主題＋角色參考圖 → 產生台詞 → AI 生成多格網格圖 → 前端 Canvas 自動切割成 LINE Creators Market 規格 PNG → JSZip 打包下載。

- 本機預覽：port **8829**（`.claude/launch.json` 的 `line-sticker-studio`）。
- **尚未部署**：只有本機 git，沒有遠端、沒有 GitHub Pages、沒有序號授權。依使用者偏好，新工具上線前要先問過。
- BYOK：圖像（Gemini `gemini-3.1-flash-image`／OpenRouter `google/gemini-3.1-flash-image`／OpenAI `gpt-image-1`）與文字（Gemini/OpenRouter/Claude/OpenAI，沿用 food-calorie-tracker 的 callLLM 格式）分開選服務商；**金鑰依服務商存在 `keys` 表**（`lineStickerStudioApiConfig.keys`），兩邊選同一家就共用；舊版 `imgKey/txtKey` 會在載入時自動搬進去。設定值存在 `lineStickerStudioSettings`。
- OpenRouter 圖像：`chat/completions` 加 `modalities:["image","text"]` 與 `image_config.aspect_ratio`，圖片從 `choices[0].message.images[].image_url.url`（data URL）取出。模型 ID 用 `curl https://openrouter.ai/api/v1/models` 篩選 `output_modalities` 含 image 的模型來確認（2026-10-12 已確認）。假金鑰測試回 401，代表 CORS 和請求路徑都正常。
- **步驟 1「產生提示詞」**（2026-10-12 加入）：`buildPhrasePrompt()`／`buildImagePrompt(b)` 同時給 API 呼叫和手動複製用；`promptCompact`（精簡版）會一併影響兩者。台詞回覆用 `applyPhraseReply(raw)` 匯入，`parseJsonArray` 可容忍前後的說明文字和 ```json 標記。條件改變時 `persistSettings` 會呼叫 `refreshShownPrompts` 重新產生已顯示的提示詞。「每批格數」`batchSize` 已從步驟 3 移到步驟 1。
- **主題拆解**（2026-10-12）：`themeMode` 選單 plain（預設，不用 AI）／ai。`buildBreakdownPrompt(viaChat)` 要 AI 回傳 JSON 物件（character_zh/character_en/personality/props/props_en/catchphrases/audience/tone/phrases[N]），可走 `aiBreakdown()`（callLLM 第 6 參數附參考圖，四家 vision 格式）或複製到聊天 AI 再用 `applyBreakdown(raw)` 匯入。`state.breakdown` 存 localStorage `lineStickerStudioBreakdown` 與專案 JSON；`useBreakdown()` 為真時 `buildImagePrompt` 加 `breakdownEnLine()`、`buildPhrasePrompt` 加 `breakdownZhLine()`。拆解完成會自動 `showImagePrompts()` 填入「產生提示詞」區。
- 頂部跑馬燈共用工作區公告 GAS（滑鼠移入會暫停）。
- 頁尾（2026-10-12）：使用警語（摘要＋`<details>` 完整警語，內容是貼圖專用的版權、肖像、審核、AI 商用條款、資料送往服務商）、創作者 Mark Tsai（蔡豐全）＋信箱、visitor-badge 訪客計數（`page_id=m255525.linestickerstudio`，手冊頁用 `.manual`）、授權限制。頂部按鈕是「📖 操作手冊」「📲 加入主畫面」。manual.html 有 `#creator` 創作者資料（與 company-digital-transformation-analyzer 手冊同一份）、使用警語、加入主畫面教學。SW 快取版本 v2。

## 架構重點
- 預設值集中放在 `INTENTS`（24 個英文動作描述，順序＝常用優先序）、`LANG_MODES`（8 種語言，各 24 句台詞，跟 INTENTS 一一對應）、`STYLES`、`EXAGGERATION`、`KEYS`、`FONTS`、`GRID`（每批格數→欄列／Gemini aspectRatio／OpenAI size）。
- 圖像模型**預設不畫字**，台詞由 `composeSticker` 用 Canvas 疊上，避免 AI 寫錯中文字；`textMode=ai` 時才讓 AI 畫字（這時雜點清除會保留小元件）。
- 切割管線（`runCut`）：`cellRects` 平均切格 → `detectBg`（取整張圖外框像素的中位數當背景色，不寫死 #00FF00）→ `keyOut`（global 或 flood；半透明邊緣做 unpremultiply，綠幕另外做 despill）→ `despeckle`（連通元件，刪掉小噪點和碰到邊緣的鄰格殘影）→ `alphaBounds` 裁切 → `composeSticker`（疊字、裁到內容＋10px、強制偶數）。
- main/tab 由主要圖片的 `charCanvas`（不含文字）`fitInto` 產生（`buildMainTab`）。
- **LINE 規格強制**（`LINE_SPEC`，依 creator.line.me/en/guideline/sticker/，2026-10-12 確認）：`composeSticker` 最後用 `padToLineSize` 把內容置中放進「內容＋10px」的偶數尺寸畫布（最大 370×320）；`encodeLinePng` 在 IHDR 後寫入 72dpi 的 pHYs（canvas.toBlob 本身不帶 dpi）；`validateLineImage` 讀回 PNG 檔頭檢查尺寸、偶數、RGB 8bit、dpi、≤1MB，並檢查四邊 margin−1 px 帶狀區域全透明；`specReport`／`renderSpecReport` 列出 10 項檢查，**任一項不合格就停用 ZIP 下載**（含缺圖、ZIP 超過 60MB）。已用 PIL 獨立驗證過 ZIP 內 26 個檔案。
- 測試掛鉤：`window._sticker`（state、runCut、generateDemo、showStep、buildImagePrompt）。「產生示範網格」用程式畫的角色，不需要金鑰就能驗證切割流程。

## 驗證紀錄（2026-10-12）
- 示範網格 24 張全部符合規格（寬高偶數、≤370×320、角落 alpha=0、沒有殘留綠色）；ZIP 裡有 26 個檔案，main 是 240×240，tab 是 96×74。
- 白底 flood 模式會保留角色內部的白色區塊；16 張／台語模式、專案 JSON 存讀、未填金鑰的提示都測過。
- **真實 AI 生圖還沒做端對端測試**（需要使用者提供 Gemini 金鑰）。
