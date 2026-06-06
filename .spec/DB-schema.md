## 一、總體設計概念

- 資料庫名稱：`reptileManagerDb`。 [linkedin](https://www.linkedin.com/pulse/what-indexeddb-complete-guide-client-side-o1lpc)
- 版本：v1（之後 schema 變動再升版本）。 [dexie](https://dexie.org/docs/Tutorial/Design)
- 主體採「多 object store」設計，每種實體一個 store。  
- 使用一層 repository 抽象，避免在 component 直接碰 IndexedDB API。 [techresolve](https://techresolve.blog/2026/03/09/is-indexeddb-actually-viable-in-2026-or-am-i-wa/)

建議用 `idb` 或 Dexie 這類 wrapper，而不要自己硬幹原生 IndexedDB API，會省掉很多 schema / transaction / migration 的坑。 [oidaisdes](https://www.oidaisdes.org/blog/offline-storage-indexeddb/)

***

## 二、IndexedDB Schema 草稿

### 1. Database

```ts
// DB name & version
const DB_NAME = 'reptileManagerDb';
const DB_VERSION = 1;
```

### 2. Object Stores 一覽

| Store 名稱         | 用途                         | KeyPath         | 主要索引 (示意)             |
|--------------------|------------------------------|-----------------|-----------------------------|
| `reptiles`         | 爬蟲主資料                   | `id`            | `byName`, `bySpecies`       |
| `weight_logs`      | 體重歷史                     | `id`            | `byReptile`, `byReptileDate`|
| `feed_logs`        | 餵食紀錄                     | `id`            | `byReptileDate`             |
| `medication_courses` | 療程設定                  | `id`            | `byReptile`, `byActive`     |
| `medication_logs`  | 實際投藥紀錄                 | `id`            | `byReptileDate`             |
| `shed_logs`        | 脫皮紀錄                     | `id`            | `byReptileDate`             |
| `habitat_logs`     | 溫濕度紀錄                   | `id`            | `byReptileDate`             |
| `uvb_logs`         | UVB / 燈照管理紀錄           | `id`            | `byReptile`, `byStartDate`  |
| `substrate_logs`   | 墊材更換紀錄                 | `id`            | `byReptileDate`             |
| `todo_rules`       | 待辦規則                     | `id`            | `byReptile`, `byType`       |
| `todo_instances`   | 已產生的待辦實例             | `id`            | `byReptileDateStatus`       |
| `visit_logs`       | 看診紀錄                     | `id`            | `byReptileDate`             |
| `settings`         | 系統與 UI 設定 (單筆 or 小量)| `key`           | （通常不需要額外 index）    |  

 [web](https://web.dev/articles/indexeddb)

### 3. 各 Store 欄位（TypeScript 型別草稿）

#### 3.1 `reptiles`

```ts
interface Reptile {
  id: string;                // reptileId, 例如 'rpt_20260605_xxx'
  name: string;
  species: string;           // 物種
  breed: string;             // 品種
  sex?: 'male' | 'female' | 'unknown';
  birthDate?: string;        // ISO date
  enclosureName?: string;    // 飼養箱/位置
  photoUrl?: string;
  notes?: string;
  qrTargetUrl: string;       // deep link，例如 '/#/reptile/:id'
  createdAt: string;         // ISO date-time
  updatedAt: string;         // ISO date-time
}
```

#### 3.2 `weight_logs`

```ts
interface WeightLog {
  id: string;
  reptileId: string;
  date: string;       // ISO date
  weight: number;     // g
  notes?: string;
  createdAt: string;
}
```

#### 3.3 `feed_logs`

```ts
interface FeedLog {
  id: string;
  reptileId: string;
  fedAt: string;          // ISO date-time
  foodType: string;       // ex: "蟋蟀", "超級蟋蟀", "粉紅鼠"
  amount: string;         // ex: "5 隻", "1 隻"
  notes?: string;
  createdAt: string;
}
```

同理：

- `MedicationCourse`：reptileId, drugName, dosage, ruleType (daily/hourly/weekly), ruleConfig, startDate, endDate, active…  
- `MedicationLog`：reptileId, courseId?, takenAt, drugName, dosage, notes…  
- `ShedLog`：reptileId, date, status, notes…  
- `HabitatLog`：reptileId, loggedAt, temperature, humidity, notes…  
- `UvbLog`：reptileId, lampName, startedAt, expectedReplaceAt, notes…  
- `SubstrateLog`：reptileId, changedAt, substrateType, notes…  
- `TodoRule`：reptileId?, type, scheduleType (fixed/conditional), config json, enabled…  
- `TodoInstance`：reptileId, ruleId?, date, dueAt, status, type, notes…  
- `VisitLog`：reptileId, date, summary, notes…  
- `Settings`：key, value(any)。  

你可以保持「欄位很薄」，後面再 iterative 添加。 [developer.mozilla](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)

### 4. Schema 定義方式（示意：Dexie）

```ts
import Dexie, { Table } from 'dexie';

export class ReptileManagerDb extends Dexie {
  reptiles!: Table<Reptile, string>;
  feed_logs!: Table<FeedLog, string>;
  // ... 其他 stores

  constructor() {
    super('reptileManagerDb');

    this.version(1).stores({
      reptiles: 'id, name, species',
      feed_logs: 'id, reptileId, fedAt, [reptileId+fedAt]',
      weight_logs: 'id, reptileId, date, [reptileId+date]',
      // 其他 store 類似...
      settings: 'key',
    });
  }
}
```

Dexie 讓你用一行字串定義主鍵與 index，後續版本升級再新增 `version(2)` 即可。 [dev](https://dev.to/andyhaskell/using-dexie-js-to-write-slick-indexeddb-code-304o)

***

## 三、Repository Interface 草稿

### 1. 設計原則

- 每種主要實體一個 repository interface。  
- 前端其他層只跟 repository 講話，不碰 IndexedDB 細節。  
- 未來如果要接後端，只要換 repository 實作即可。 [techresolve](https://techresolve.blog/2026/03/09/is-indexeddb-actually-viable-in-2026-or-am-i-wa/)

### 2. ReptileRepository

```ts
export interface ReptileRepository {
  getAll(): Promise<Reptile[]>;
  getById(id: string): Promise<Reptile | undefined>;
  create(input: Omit<Reptile, 'id' | 'createdAt' | 'updatedAt'>): Promise<Reptile>;
  update(id: string, patch: Partial<Reptile>): Promise<Reptile>;
  delete(id: string): Promise<void>;
}
```

### 3. FeedLogRepository

```ts
export interface FeedLogRepository {
  getByReptile(reptileId: string): Promise<FeedLog[]>;
  getLatestByReptile(reptileId: string): Promise<FeedLog | undefined>;
  create(input: Omit<FeedLog, 'id' | 'createdAt'>): Promise<FeedLog>;
  delete(id: string): Promise<void>;
}
```

### 4. WeightLogRepository（重點在曲線）

```ts
export interface WeightLogRepository {
  getByReptile(reptileId: string): Promise<WeightLog[]>;
  getLatestByReptile(reptileId: string): Promise<WeightLog | undefined>;
  create(input: Omit<WeightLog, 'id' | 'createdAt'>): Promise<WeightLog>;
  delete(id: string): Promise<void>;
}
```

### 5. TodoRepositories（規則 / 實例）

```ts
export interface TodoRuleRepository {
  getByReptile(reptileId: string | null): Promise<TodoRule[]>; // null 代表全域規則
  create(input: Omit<TodoRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<TodoRule>;
  update(id: string, patch: Partial<TodoRule>): Promise<TodoRule>;
  delete(id: string): Promise<void>;
}

export interface TodoInstanceRepository {
  getByDate(date: string): Promise<TodoInstance[]>; // 今日待辦
  getByReptile(reptileId: string, date?: string): Promise<TodoInstance[]>;
  upsertMany(items: TodoInstance[]): Promise<void>; // 每次重算今日待辦
  updateStatus(id: string, status: TodoStatus): Promise<void>;
}
```

***

## 四、實作層建議（以 Dexie 為例）

```ts
export class DexieReptileRepository implements ReptileRepository {
  constructor(private db: ReptileManagerDb) {}

  async getAll() {
    return this.db.reptiles.orderBy('name').toArray();
  }

  async getById(id: string) {
    return this.db.reptiles.get(id);
  }

  async create(input: Omit<Reptile, 'id' | 'createdAt' | 'updatedAt'>) {
    const now = new Date().toISOString();
    const reptile: Reptile = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    await this.db.reptiles.add(reptile);
    return reptile;
  }

  async update(id: string, patch: Partial<Reptile>) {
    const existing = await this.getById(id);
    if (!existing) throw new Error('Reptile not found');
    const updated: Reptile = {
      ...existing,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    await this.db.reptiles.put(updated);
    return updated;
  }

  async delete(id: string) {
    await this.db.reptiles.delete(id);
  }
}
```

這一層你可以完全用 TypeScript 寫乾淨，對上層 Component 來說就像 call API 一樣，不需要知道 IndexedDB 細節。 [dexie](https://dexie.org/docs/Tutorial/Design)
