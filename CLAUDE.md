# ReptileManager — Claude 工作指引

## 專案簡介

爬蟲飼主用的個人 PWA，純前端，資料存於 IndexedDB（Dexie）。部署於 Netlify。

Tech stack：Vite + React 18 + TypeScript、Dexie.js、Tailwind CSS v4、i18next、vite-plugin-pwa

詳細功能架構見 [README.md](README.md)。

---

## 每次修改功能後的必做事項

### 1. 更新 README.md

每次新增、修改、移除任何使用者可見的功能後，**必須同步更新 README.md** 對應的段落：

- 新增功能 → 在對應模組（第 3 節）補充說明，如有新路由也更新第 5 節路由表
- 修改功能 → 找到舊敘述並更新，不要保留過時描述
- 移除功能 → 從 README.md 刪除，如仍有可能補回則移至第 10 節「目前不包含的功能」
- 更新 README.md 頂部的「最後更新」日期

### 2. 確認版本號

每次完成功能修改後，判斷是否需要更新版本號：

| 變更類型 | package.json version | README.md 版本 |
|---------|---------------------|----------------|
| 新增功能（minor feature） | patch 版號 +1（0.1.0 → 0.1.1） | 同步更新 |
| 較大功能或架構調整 | minor 版號 +1（0.1.x → 0.2.0） | 同步更新 |
| 僅修 bug / 樣式微調 | 不強制更新 | 不更新 |

**兩個版本號必須保持一致**：`package.json` 的 `version` 和 `README.md` 頂部的版本標示需同步修改。

---

## Build 特殊注意事項

- 路徑含有單引號（`Saori's Life`），workbox `generateSW` 策略會失敗
- Service Worker 必須使用 `injectManifest` 策略，見 `vite.config.ts`

---

## 開發常用指令

```bash
npm run dev      # 本地開發
npm run build    # 型別檢查 + Vite build
npm run preview  # 預覽 dist
```

---

## 資料庫

Dexie ORM，共 13 張資料表（含 `settings`），定義於 `src/db/`。  
無全域狀態管理，mutation 後直接呼叫 `load()` 重整畫面。
