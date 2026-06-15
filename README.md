# ReptileManager — 功能架構書

> 版本：1.1　　最後更新：2026-06-15

---

## 1. 專案概覽

ReptileManager 是一款以爬蟲飼主為目標族群的**個人寵物管理 PWA**。  
所有資料儲存於使用者本機瀏覽器（IndexedDB），無需後端伺服器，可完全離線使用。  
部署於 Netlify，支援繁體中文與英文介面切換。

| 項目 | 說明 |
|------|------|
| 應用類型 | 純前端 PWA（Progressive Web App） |
| 主要語言 | TypeScript + React 18 |
| 資料層 | Dexie（IndexedDB 封裝） |
| 樣式 | Tailwind CSS 4 |
| 路由 | React Router 6（Hash 模式） |
| 國際化 | i18next（繁中 / 英文） |
| 部署平台 | Netlify |

---

## 2. 技術架構

```
瀏覽器
│
├── Service Worker（Workbox）
│   ├── HTML 文件：StaleWhileRevalidate
│   └── 靜態資源：CacheFirst（永久快取）
│
└── React SPA（HashRouter）
    ├── 頁面層（src/pages/）
    ├── 元件層（src/components/）
    ├── 資料存取層（src/db/repos.ts）
    │   └── Dexie ORM → IndexedDB
    ├── 業務邏輯層（src/lib/）
    └── 國際化（src/i18n/ + i18next）
```

### 狀態管理

本專案**不使用全域狀態管理器**（無 Redux / Zustand / Context Store）。

- **資料來源**：Dexie（IndexedDB）為唯一持久化真實資料來源
- **頁面狀態**：各頁面以 `useState` 管理本地載入狀態與表單值
- **更新策略**：mutation 後直接呼叫 `load()` 重新讀取資料庫，重整畫面

---

## 3. 功能模組

### 3.1 爬蟲管理（Reptile Management）

**核心功能**：建立與維護每隻爬蟲的基本檔案。

| 欄位 | 說明 |
|------|------|
| 名稱 / 種類 / 品系（Morph） | 基本識別資訊 |
| 性別 | 公 / 母 / 未知 |
| 出生日期 | 自動計算年齡（年月日精度） |
| 飼育箱名稱 | 用於首頁快速識別 |
| 照片 URL | 自定義大頭照 |
| 過敏資訊 / 慢性病記錄 | 健康備注 |
| QR Code | 可設定自訂目標 URL，於詳細頁產生 QR Code |

---

### 3.2 餵食記錄（Feed Log）

記錄每次餵食事件。

| 項目 | 說明 |
|------|------|
| 食物類型 | 9 種預設（活餌 / 冷凍 / 蟋蟀 / 麵包蟲等）+ 自訂 |
| 份量 | 自由輸入 |
| 餵食時間 | datetime-local |
| 備注 | 自由文字 |

---

### 3.3 藥物管理（Medication）

分為**療程**與**投藥記錄**兩層。

#### 療程（MedicationCourse）

| 項目 | 說明 |
|------|------|
| 藥物名稱 / 劑量 | 基本資訊 |
| 排程類型 | `daily`（每日）、`hourly`（每 N 小時）、`weekly`（每週特定星期） |
| 開始 / 結束日期 | 有效期間 |
| 啟用狀態 | 可停用不刪除 |

#### 投藥記錄（MedicationLog）

記錄實際每次投藥時間、劑量與備注，可關聯至療程。

---

### 3.4 環境監控（Environment）

分三個子模組：

| 子模組 | 記錄內容 |
|--------|---------|
| 棲息環境（HabitatLog） | 溫度（°C）、濕度（%）、時間戳記 |
| UVB 燈管（UvbLog） | 燈管名稱、安裝日期、預計更換日、實際更換日 |
| 底材（SubstrateLog） | 更換日期、底材類型、備注 |

---

### 3.5 健康追蹤（Health）

分三個子模組：

| 子模組 | 記錄內容 | 特別功能 |
|--------|---------|---------|
| 體重記錄（WeightLog） | 日期、體重（g）、備注 | 折線圖視覺化（Recharts） |
| 脫皮記錄（ShedLog） | 日期、狀態（完整 / 部分 / 困難脫皮）、備注 | — |
| 就診記錄（VisitLog） | 日期、診療摘要、備注 | — |

---

### 3.6 待辦事項系統（Todo System）

這是本 App 的核心排程引擎，分為**規則**與**實例**兩層。

#### 待辦規則（TodoRule）

| 項目 | 說明 |
|------|------|
| 類型 | `feeding` / `medication` / `cleaning` / `weight` / `uvb_check` / `substrate` / `shed_check` / `custom` |
| 排程類型 | `fixed_daily`（每日固定時間）、`fixed_weekly`（每週特定星期+時間）、`interval_days`（每 N 天） |
| 適用對象 | 特定爬蟲（reptileId）或全域規則（null） |
| 啟用狀態 | 可停用保留歷史 |

#### 待辦實例（TodoInstance）

由 `src/lib/todoEngine.ts` 依規則自動產生當日應完成的任務清單。

每筆實例狀態：`pending`（待處理）/ `done`（完成）/ `skipped`（略過）

#### 首頁整合

首頁顯示：
- 今日待辦清單（依規則生成）
- 待處理藥物提醒（有效療程中尚未投藥）

---

### 3.7 繁殖管理（Clutch/Breeding Management）

**核心功能**：記錄爬蟲的繁殖事件與子代信息。

| 項目 | 說明 |
|------|------|
| 繁殖日期 | 卵産日期或孵化日期 |
| 親代 | 父爬蟲 / 母爬蟲的 ID 關聯 |
| 卵數 / 孵化數 | 繁殖成果統計 |
| 備注 | 自由文字，記錄特殊情況 |

---

### 3.8 備份與設定（Backup & Settings）

| 功能 | 說明 |
|------|------|
| 語言切換 | 繁體中文 / English，偏好存於 localStorage |
| 資料統計 | 顯示各資料表筆數 |
| 匯出備份 | 將所有 13 張資料表序列化為 JSON 下載 |
| 匯入備份 | 上傳 JSON 檔，驗證後寫入 IndexedDB（覆蓋模式） |

---

## 4. 資料模型

資料庫以 Dexie 定義，共 **13 張資料表**，全部儲存於瀏覽器 IndexedDB。

```
ReptileDB (Dexie)
│
├── reptiles          → 爬蟲基本資料
├── feedLogs          → 餵食記錄
├── weightLogs        → 體重記錄
├── medicationCourses → 藥物療程
├── medicationLogs    → 投藥記錄
├── shedLogs          → 脫皮記錄
├── habitatLogs       → 棲息環境記錄
├── uvbLogs           → UVB 燈管記錄
├── substrateLogs     → 底材更換記錄
├── visitLogs         → 就診記錄
├── todoRules         → 待辦規則
├── todoInstances     → 待辦實例
├── clutchLogs        → 繁殖記錄
└── settings          → 應用設定（key-value）
```

### 核心實體關聯

```
Reptile (1)
  ├──< FeedLog
  ├──< WeightLog
  ├──< ShedLog
  ├──< VisitLog
  ├──< HabitatLog
  ├──< UvbLog
  ├──< SubstrateLog
  ├──< MedicationCourse (1) ──< MedicationLog
  ├──< TodoRule (0..1) ──< TodoInstance
  │     │
  │     └── 亦可為全域規則（reptileId = null）
  └──< ClutchLog（作為父或母）
```

---

## 5. 頁面與路由

採 Hash 路由（`#/path`），確保 Netlify 靜態部署相容性。

| 路由 | 頁面 | 功能 |
|------|------|------|
| `/` | HomePage | 儀表板：爬蟲卡片、今日待辦、藥物提醒 |
| `/reptiles` | ReptilesPage | 爬蟲清單（種類 / 性別 / 年齡 / 飼育箱） |
| `/reptile/new` | ReptileFormPage | 新增爬蟲 |
| `/reptile/:id` | ReptileDetailPage | 爬蟲詳細檔案 + QR Code |
| `/reptile/:id/edit` | ReptileFormPage | 編輯爬蟲資料 |
| `/reptile/:id/feed` | FeedLogPage | 餵食記錄管理 |
| `/reptile/:id/medication` | MedicationPage | 療程 + 投藥記錄管理 |
| `/reptile/:id/environment` | EnvironmentPage | 環境三合一（棲息 / UVB / 底材） |
| `/reptile/:id/health` | HealthPage | 健康三合一（體重 / 脫皮 / 就診） |
| `/reptile/:id/todos` | TodoRulesPage | 待辦規則設定 |
| `/reptile/:id/clutch` | ClutchPage | 繁殖記錄管理 |
| `/backup` | BackupPage | 設定 + 備份匯出入 |

---

## 6. 國際化（i18n）

| 項目 | 說明 |
|------|------|
| 框架 | i18next + react-i18next |
| 語言偵測 | 優先讀取 localStorage，次為瀏覽器語系 |
| 支援語言 | `zh-TW`（繁體中文，預設）、`en`（英文） |
| 翻譯檔路徑 | `src/i18n/zh-TW.ts`、`src/i18n/en.ts` |
| 命名空間 | common, nav, pwa, home, reptile, feed, medication, environment, health, todo, todoItem, backup |
| 偏好儲存 | localStorage key: `reptileManager_lang` |

---

## 7. PWA 與離線能力

| 特性 | 實作方式 |
|------|---------|
| 可安裝 | Web App Manifest（圖示、名稱、顯示模式） |
| 離線存取 | Service Worker（vite-plugin-pwa + Workbox） |
| 更新通知 | 新版本上線時提示用戶手動更新 |
| HTML 快取策略 | StaleWhileRevalidate |
| 字型快取策略 | CacheFirst（Google Fonts，365 天） |
| 靜態資源 | 永久快取（Content Hash 命名） |
| SW 快取排除 | `/sw.js` 本身不快取（確保更新生效） |

---

## 8. 部署架構

```
開發者 git push
      │
      ▼
  GitHub 倉庫
      │
      ▼
   Netlify CI
   npm run build
   (vite build)
      │
      ▼
   dist/ 靜態檔案
   發布至 Netlify CDN
      │
      ▼
   使用者瀏覽器
   Service Worker 快取
   IndexedDB 本地資料
```

- **Build 指令**：`npm run build`
- **Publish 目錄**：`dist`
- **Redirect 規則**：`/* → /index.html 200`（支援 SPA Hash Routing）
- **快取控制 Header**：`/sw.js` 與 HTML 設定 `no-cache`

---

## 9. 功能依賴總覽

```
首頁（Home）
  依賴 → TodoRule + TodoInstance（todoEngine 生成今日清單）
  依賴 → MedicationCourse（有效療程提醒）
  依賴 → Reptile（爬蟲卡片展示）

爬蟲詳細頁（ReptileDetail）
  包含 → FeedLog / WeightLog / ShedLog / VisitLog
         HabitatLog / UvbLog / SubstrateLog
         MedicationCourse + MedicationLog
         TodoRule + TodoInstance
         ClutchLog

備份（Backup）
  讀寫 → 全部 13 張資料表
```

---

## 10. 目前不包含的功能（架構層可擴充）

| 功能 | 說明 |
|------|------|
| 後端 / 雲端同步 | 目前純本地；架構可在 repos.ts 層加入 API 呼叫 |
| 推播通知 | Service Worker 支援；尚未實作 Push API |
| IoT 感測器整合 | HabitatLog 結構已預留；可接溫濕度感測器 API |
| 照片本地上傳 | 目前僅支援 URL 輸入；可擴充為 File API + Blob 儲存 |
| 多帳號 / 分享 | 目前單使用者；可透過 QR Code 分享靜態頁面 |
