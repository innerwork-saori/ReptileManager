import { db } from '../db/schema'

export async function exportAllData(): Promise<void> {
  const [
    reptiles,
    weight_logs,
    feed_logs,
    medication_courses,
    medication_logs,
    shed_logs,
    habitat_logs,
    uvb_logs,
    substrate_logs,
    todo_rules,
    todo_instances,
    visit_logs,
    settings,
  ] = await Promise.all([
    db.reptiles.toArray(),
    db.weight_logs.toArray(),
    db.feed_logs.toArray(),
    db.medication_courses.toArray(),
    db.medication_logs.toArray(),
    db.shed_logs.toArray(),
    db.habitat_logs.toArray(),
    db.uvb_logs.toArray(),
    db.substrate_logs.toArray(),
    db.todo_rules.toArray(),
    db.todo_instances.toArray(),
    db.visit_logs.toArray(),
    db.settings.toArray(),
  ])

  const backup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      reptiles,
      weight_logs,
      feed_logs,
      medication_courses,
      medication_logs,
      shed_logs,
      habitat_logs,
      uvb_logs,
      substrate_logs,
      todo_rules,
      todo_instances,
      visit_logs,
      settings,
    },
  }

  const json = JSON.stringify(backup, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const filename = `reptilemanager_backup_${date}.json`

  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  if (isMobile && navigator.share && navigator.canShare?.({ files: [new File([blob], filename)] })) {
    try {
      await navigator.share({
        title: 'ReptileManager 備份',
        files: [new File([blob], filename, { type: 'application/json' })],
      })
    } catch (e) {
      if (!(e instanceof Error && e.name === 'AbortError')) {
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }
    }
  } else {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  URL.revokeObjectURL(url)
}

const ALL_TABLES = [
  'reptiles', 'weight_logs', 'feed_logs', 'medication_courses',
  'medication_logs', 'shed_logs', 'habitat_logs', 'uvb_logs',
  'substrate_logs', 'todo_rules', 'todo_instances', 'visit_logs', 'settings',
] as const

export async function importAllData(file: File): Promise<void> {
  const text = await file.text()
  let backup: { version?: number; data?: Record<string, unknown[]> }
  try {
    backup = JSON.parse(text) as typeof backup
  } catch {
    throw new Error('invalid_json')
  }
  if (!backup.data || typeof backup.data !== 'object') {
    throw new Error('invalid_format')
  }
  const { data } = backup
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tableRefs = ALL_TABLES.map((t) => (db as any)[t])
  await db.transaction('rw', tableRefs, async () => {
    for (const t of ALL_TABLES) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db as any)[t].clear()
      const rows = data[t]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (rows?.length) await (db as any)[t].bulkAdd(rows)
    }
  })
}

export async function resetAllData(): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tableRefs = ALL_TABLES.map((t) => (db as any)[t])
  await db.transaction('rw', tableRefs, async () => {
    for (const t of ALL_TABLES) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db as any)[t].clear()
    }
  })
}

export async function getDataSummary() {
  const [reptiles, feedLogs, medicationLogs, totalRecords] = await Promise.all([
    db.reptiles.count(),
    db.feed_logs.count(),
    db.medication_logs.count(),
    Promise.all([
      db.weight_logs.count(),
      db.shed_logs.count(),
      db.habitat_logs.count(),
      db.uvb_logs.count(),
      db.substrate_logs.count(),
      db.visit_logs.count(),
    ]).then((counts) => counts.reduce((a, b) => a + b, 0)),
  ])

  return {
    reptiles,
    feedLogs,
    medicationLogs,
    otherRecords: totalRecords,
    total: reptiles + feedLogs + medicationLogs + totalRecords,
  }
}
