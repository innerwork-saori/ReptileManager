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

  if (navigator.share && navigator.canShare?.({ files: [new File([blob], filename)] })) {
    await navigator.share({
      title: 'ReptileManager 備份',
      files: [new File([blob], filename, { type: 'application/json' })],
    })
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
