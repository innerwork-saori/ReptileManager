import i18n from '../i18n'
import { db } from '../db/schema'
import { buildReptileQrPayload } from './qrPayload'
import type {
  Reptile,
  FeedLog,
  WeightLog,
  ShedLog,
  VisitLog,
  HabitatLog,
  UvbLog,
  SubstrateLog,
  MedicationCourse,
  MedicationLog,
  ClutchLog,
} from '../db/schema'

// Sample data for demo mode. All dates are relative to "now" so the demo always looks current.

const SESSION_KEY = 'reptileManager_demoSeeded'
const LANG_KEY = 'demoLanguage'

function currentLang(): string {
  return i18n.language?.startsWith('en') ? 'en' : 'zh-TW'
}

const DAY = 24 * 60 * 60 * 1000

function isoDaysAgo(days: number, hour = 20): string {
  const d = new Date(Date.now() - days * DAY)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

function dateDaysAgo(days: number): string {
  return isoDaysAgo(days, 12).slice(0, 10)
}

let seq = 0
function id(prefix: string): string {
  seq += 1
  return `demo_${prefix}_${seq}`
}

function buildDemoData() {
  seq = 0
  const en = i18n.language?.startsWith('en')
  const food = (key: string) => i18n.t(`feed.foods.${key}`)
  const pick = (zh: string, enText: string) => (en ? enText : zh)
  const created = isoDaysAgo(200)

  const reptile = (
    key: string,
    fields: Omit<Reptile, 'id' | 'qrTargetUrl' | 'createdAt' | 'updatedAt'>,
  ): Reptile => {
    const rid = `demo_reptile_${key}`
    return { ...fields, id: rid, qrTargetUrl: buildReptileQrPayload(rid), createdAt: created, updatedAt: created }
  }

  const mango = reptile('mango', {
    name: pick('小芒果', 'Mango'),
    species: 'Ball python',
    category: 'Ball python',
    breed: 'Banana Pastel',
    sex: 'female',
    birthDate: dateDaysAgo(900),
    enclosureName: 'A-1',
    photoUrl: '/demo/mango.jpg',
    notes: pick('個性溫馴，換季時容易拒食。', 'Docile; tends to refuse food when seasons change.'),
  })
  const butter = reptile('butter', {
    name: pick('奶油', 'Butter'),
    species: 'Ball python',
    category: 'Ball python',
    breed: 'Lucy',
    sex: 'male',
    birthDate: dateDaysAgo(1100),
    enclosureName: 'A-2',
    photoUrl: '/demo/butter.jpg',
  })
  const mochi = reptile('mochi', {
    name: pick('麻糬', 'Mochi'),
    species: 'Leopard gecko',
    category: 'Leopard gecko',
    breed: 'Tremper Albino',
    sex: 'male',
    birthDate: dateDaysAgo(700),
    enclosureName: 'B-1',
  })
  const tofu = reptile('tofu', {
    name: pick('豆腐', 'Tofu'),
    species: 'Leopard gecko',
    category: 'Leopard gecko',
    breed: 'Mack Snow',
    sex: 'female',
    birthDate: dateDaysAgo(650),
    enclosureName: 'B-2',
  })
  const kiwi = reptile('kiwi', {
    name: pick('奇異果', 'Kiwi'),
    species: 'Veiled chameleon',
    category: 'Veiled chameleon',
    breed: 'Normal',
    sex: 'male',
    birthDate: dateDaysAgo(420),
    enclosureName: 'C-1',
    chronicInfo: pick('曾有輕微代謝性骨病，持續補鈣中。', 'Mild MBD history; on calcium supplements.'),
  })
  const reptiles = [mango, butter, mochi, tofu, kiwi]

  const feed = (r: Reptile, daysAgo: number, foodKey: string, amount: string, notes?: string): FeedLog => ({
    id: id('feed'), reptileId: r.id, fedAt: isoDaysAgo(daysAgo), foodType: food(foodKey), amount, notes, createdAt: isoDaysAgo(daysAgo),
  })
  // Mango and Butter are intentionally overdue (>10 days) so the home page reminder is visible.
  const feed_logs: FeedLog[] = [
    feed(mango, 12, 'rat_m', '1', pick('吃得很快', 'Ate quickly')),
    feed(mango, 26, 'rat_m', '1'),
    feed(mango, 40, 'rat_s', '1', pick('拒食一次後補餵', 'Refused once, re-offered')),
    feed(butter, 14, 'rat_s', '1'),
    feed(butter, 28, 'rat_s', '1'),
    feed(mochi, 2, 'dubia', '5'),
    feed(mochi, 5, 'black_cricket', '6'),
    feed(mochi, 9, 'dubia', '4'),
    feed(tofu, 3, 'dubia', '4'),
    feed(tofu, 7, 'white_cricket', '5'),
    feed(kiwi, 1, 'black_cricket', '8'),
    feed(kiwi, 2, 'dubia', '3'),
    feed(kiwi, 4, 'black_cricket', '8'),
  ]

  const weightSeries = (r: Reptile, values: number[]): WeightLog[] =>
    values.map((weight, i) => {
      const daysAgo = (values.length - 1 - i) * 30 + 3
      return { id: id('weight'), reptileId: r.id, date: dateDaysAgo(daysAgo), weight, createdAt: isoDaysAgo(daysAgo) }
    })
  const weight_logs: WeightLog[] = [
    ...weightSeries(mango, [1420, 1465, 1510, 1540, 1590, 1635]),
    ...weightSeries(butter, [980, 1005, 1030, 1020, 1045, 1070]),
    ...weightSeries(mochi, [52, 54, 55, 57, 58, 60]),
    ...weightSeries(tofu, [48, 50, 53, 55, 54, 57]),
    ...weightSeries(kiwi, [98, 104, 110, 108, 117, 124]),
  ]

  const shed = (r: Reptile, daysAgo: number, status: ShedLog['status'], notes?: string): ShedLog => ({
    id: id('shed'), reptileId: r.id, date: dateDaysAgo(daysAgo), status, notes, createdAt: isoDaysAgo(daysAgo),
  })
  const shed_logs: ShedLog[] = [
    shed(mango, 18, 'complete'),
    shed(mango, 60, 'complete'),
    shed(butter, 35, 'complete'),
    shed(mochi, 6, 'complete'),
    shed(tofu, 21, 'partial', pick('腳趾殘皮，已泡溫水處理', 'Retained toe shed, soaked in warm water')),
    shed(kiwi, 10, 'stuck', pick('尾巴卡皮，提高濕度', 'Stuck shed on tail, raised humidity')),
  ]

  const visit_logs: VisitLog[] = [
    {
      id: id('visit'), reptileId: kiwi.id, date: dateDaysAgo(20), createdAt: isoDaysAgo(20),
      summary: pick('例行健檢：骨密度改善中', 'Routine check: bone density improving'),
      notes: pick('維持每日補鈣，一個月後回診', 'Keep daily calcium, follow up in a month'),
    },
  ]

  const courseId = id('course')
  const medication_courses: MedicationCourse[] = [
    {
      id: courseId, reptileId: kiwi.id, drugName: pick('鈣粉 + D3', 'Calcium + D3'), dosage: pick('撒粉於餌料', 'Dust on feeders'),
      ruleType: 'daily', ruleConfig: {}, startDate: dateDaysAgo(20), endDate: dateDaysAgo(-40), active: true,
      createdAt: isoDaysAgo(20), updatedAt: isoDaysAgo(20),
    },
  ]
  const medication_logs: MedicationLog[] = [0, 1, 2, 3].map((daysAgo) => ({
    id: id('med'), reptileId: kiwi.id, courseId, takenAt: isoDaysAgo(daysAgo, 9),
    drugName: medication_courses[0].drugName, dosage: medication_courses[0].dosage, createdAt: isoDaysAgo(daysAgo, 9),
  }))

  const habitat_logs: HabitatLog[] = [kiwi, mango, mochi].flatMap((r, ri) =>
    [0, 1, 2].map((daysAgo) => ({
      id: id('habitat'), reptileId: r.id, loggedAt: isoDaysAgo(daysAgo, 14),
      temperature: [28, 31, 30][ri] + (daysAgo % 2 ? 0.5 : 0), humidity: [65, 60, 40][ri] - daysAgo * 2,
      createdAt: isoDaysAgo(daysAgo, 14),
    })),
  )

  const uvb_logs: UvbLog[] = [
    {
      id: id('uvb'), reptileId: kiwi.id, lampName: 'T5 HO 6%', startedAt: isoDaysAgo(160, 12),
      expectedReplaceAt: isoDaysAgo(-20, 12), createdAt: isoDaysAgo(160),
    },
  ]

  const substrate_logs: SubstrateLog[] = [
    { id: id('substrate'), reptileId: mango.id, changedAt: isoDaysAgo(15, 10), substrateType: pick('椰纖土', 'Coco husk'), createdAt: isoDaysAgo(15) },
    { id: id('substrate'), reptileId: mochi.id, changedAt: isoDaysAgo(30, 10), substrateType: pick('磁磚', 'Tile'), createdAt: isoDaysAgo(30) },
  ]

  // One clutch still incubating (shows milestones) and one hatched clutch (shows hatch rate).
  const clutch_logs: ClutchLog[] = [
    {
      id: id('clutch'), date: dateDaysAgo(25), fatherReptileId: butter.id, motherReptileId: mango.id,
      eggCount: 6, fertileCount: 5, notes: pick('孵化溫度 31.5°C', 'Incubating at 31.5°C'), createdAt: isoDaysAgo(25),
    },
    {
      id: id('clutch'), date: dateDaysAgo(95), fatherReptileId: mochi.id, motherReptileId: tofu.id,
      eggCount: 2, fertileCount: 2, hatchedCount: 2, createdAt: isoDaysAgo(95),
    },
  ]

  return {
    reptiles, feed_logs, weight_logs, shed_logs, visit_logs, medication_courses, medication_logs,
    habitat_logs, uvb_logs, substrate_logs, clutch_logs,
  }
}

export async function seedDemoData(): Promise<void> {
  const data = buildDemoData()
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((table) => table.clear()))
    await db.reptiles.bulkAdd(data.reptiles)
    await db.feed_logs.bulkAdd(data.feed_logs)
    await db.weight_logs.bulkAdd(data.weight_logs)
    await db.shed_logs.bulkAdd(data.shed_logs)
    await db.visit_logs.bulkAdd(data.visit_logs)
    await db.medication_courses.bulkAdd(data.medication_courses)
    await db.medication_logs.bulkAdd(data.medication_logs)
    await db.habitat_logs.bulkAdd(data.habitat_logs)
    await db.uvb_logs.bulkAdd(data.uvb_logs)
    await db.substrate_logs.bulkAdd(data.substrate_logs)
    await db.clutch_logs.bulkAdd(data.clutch_logs)
  })
  await db.settings.put({ key: LANG_KEY, value: currentLang() })
  try {
    sessionStorage.setItem(SESSION_KEY, '1')
  } catch {
    // sessionStorage unavailable; the demo will simply re-seed on the next load
  }
}

// Re-seed once per browser session so every new visitor sees fresh, current-dated sample data,
// while edits made during the visit survive in-app navigation and reloads.
export async function ensureDemoData(): Promise<void> {
  try {
    if (sessionStorage.getItem(SESSION_KEY) === '1' && (await db.reptiles.count()) > 0) return
  } catch {
    // fall through and seed
  }
  await seedDemoData()
}

// Sample names and food labels are generated in the UI language, so regenerate them
// if the visitor switched language on the welcome page before entering the demo.
export async function reseedDemoIfLanguageChanged(): Promise<void> {
  const seeded = (await db.settings.get(LANG_KEY))?.value
  if (seeded !== currentLang()) await seedDemoData()
}
