import { db } from './schema'
import type {
  Reptile,
  WeightLog,
  FeedLog,
  MedicationCourse,
  MedicationLog,
  ShedLog,
  HabitatLog,
  UvbLog,
  SubstrateLog,
  TodoRule,
  TodoInstance,
  TodoStatus,
  VisitLog,
  ClutchLog,
} from './schema'

function uid(): string {
  return crypto.randomUUID()
}

function now(): string {
  return new Date().toISOString()
}

// ─── Reptile ─────────────────────────────────────────────────────────────────

export const reptileRepo = {
  getAll: () => db.reptiles.orderBy('name').toArray(),

  getById: (id: string) => db.reptiles.get(id),

  create: async (input: Omit<Reptile, 'id' | 'createdAt' | 'updatedAt'>): Promise<Reptile> => {
    const t = now()
    const reptile: Reptile = { ...input, id: uid(), createdAt: t, updatedAt: t }
    await db.reptiles.add(reptile)
    return reptile
  },

  update: async (id: string, patch: Partial<Omit<Reptile, 'id' | 'createdAt'>>): Promise<Reptile> => {
    const existing = await db.reptiles.get(id)
    if (!existing) throw new Error('Reptile not found')
    const updated: Reptile = { ...existing, ...patch, updatedAt: now() }
    await db.reptiles.put(updated)
    return updated
  },

  delete: async (id: string): Promise<void> => {
    await db.transaction('rw', [
      db.reptiles, db.feed_logs, db.weight_logs, db.medication_courses,
      db.medication_logs, db.shed_logs, db.habitat_logs, db.uvb_logs,
      db.substrate_logs, db.todo_rules, db.todo_instances, db.visit_logs,
      db.clutch_logs,
    ], async () => {
      await db.reptiles.delete(id)
      await db.feed_logs.where('reptileId').equals(id).delete()
      await db.weight_logs.where('reptileId').equals(id).delete()
      await db.medication_courses.where('reptileId').equals(id).delete()
      await db.medication_logs.where('reptileId').equals(id).delete()
      await db.shed_logs.where('reptileId').equals(id).delete()
      await db.habitat_logs.where('reptileId').equals(id).delete()
      await db.uvb_logs.where('reptileId').equals(id).delete()
      await db.substrate_logs.where('reptileId').equals(id).delete()
      await db.todo_rules.where('reptileId').equals(id).delete()
      await db.todo_instances.where('reptileId').equals(id).delete()
      await db.visit_logs.where('reptileId').equals(id).delete()
      await db.clutch_logs.where('fatherReptileId').equals(id).delete()
      await db.clutch_logs.where('motherReptileId').equals(id).delete()
    })
  },
}

// ─── FeedLog ─────────────────────────────────────────────────────────────────

export const feedLogRepo = {
  getByReptile: (reptileId: string) =>
    db.feed_logs.where('reptileId').equals(reptileId).reverse().sortBy('fedAt'),

  getLatestByReptile: async (reptileId: string): Promise<FeedLog | undefined> => {
    const logs = await db.feed_logs
      .where('[reptileId+fedAt]')
      .between([reptileId, Dexie.minKey], [reptileId, Dexie.maxKey])
      .reverse()
      .limit(1)
      .toArray()
    return logs[0]
  },

  create: async (input: Omit<FeedLog, 'id' | 'createdAt'>): Promise<FeedLog> => {
    const log: FeedLog = { ...input, id: uid(), createdAt: now() }
    await db.feed_logs.add(log)
    return log
  },

  delete: (id: string) => db.feed_logs.delete(id),
}

// ─── WeightLog ───────────────────────────────────────────────────────────────

export const weightLogRepo = {
  getByReptile: (reptileId: string) =>
    db.weight_logs.where('reptileId').equals(reptileId).sortBy('date'),

  getLatestByReptile: async (reptileId: string): Promise<WeightLog | undefined> => {
    const logs = await db.weight_logs
      .where('[reptileId+date]')
      .between([reptileId, Dexie.minKey], [reptileId, Dexie.maxKey])
      .reverse()
      .limit(1)
      .toArray()
    return logs[0]
  },

  create: async (input: Omit<WeightLog, 'id' | 'createdAt'>): Promise<WeightLog> => {
    const log: WeightLog = { ...input, id: uid(), createdAt: now() }
    await db.weight_logs.add(log)
    return log
  },

  delete: (id: string) => db.weight_logs.delete(id),
}

// ─── MedicationCourse ────────────────────────────────────────────────────────

export const medicationCourseRepo = {
  getByReptile: (reptileId: string) =>
    db.medication_courses.where('reptileId').equals(reptileId).toArray(),

  getActiveByReptile: (reptileId: string) =>
    db.medication_courses.where('[reptileId+active]').equals([reptileId, 1]).toArray(),

  getById: (id: string) => db.medication_courses.get(id),

  create: async (input: Omit<MedicationCourse, 'id' | 'createdAt' | 'updatedAt'>): Promise<MedicationCourse> => {
    const t = now()
    const course: MedicationCourse = { ...input, id: uid(), createdAt: t, updatedAt: t }
    await db.medication_courses.add(course)
    return course
  },

  update: async (id: string, patch: Partial<MedicationCourse>): Promise<MedicationCourse> => {
    const existing = await db.medication_courses.get(id)
    if (!existing) throw new Error('Course not found')
    const updated: MedicationCourse = { ...existing, ...patch, updatedAt: now() }
    await db.medication_courses.put(updated)
    return updated
  },

  delete: (id: string) => db.medication_courses.delete(id),
}

// ─── MedicationLog ───────────────────────────────────────────────────────────

export const medicationLogRepo = {
  getByReptile: (reptileId: string) =>
    db.medication_logs.where('reptileId').equals(reptileId).reverse().sortBy('takenAt'),

  create: async (input: Omit<MedicationLog, 'id' | 'createdAt'>): Promise<MedicationLog> => {
    const log: MedicationLog = { ...input, id: uid(), createdAt: now() }
    await db.medication_logs.add(log)
    return log
  },

  delete: (id: string) => db.medication_logs.delete(id),
}

// ─── ShedLog ─────────────────────────────────────────────────────────────────

export const shedLogRepo = {
  getByReptile: (reptileId: string) =>
    db.shed_logs.where('reptileId').equals(reptileId).reverse().sortBy('date'),

  getLatestByReptile: async (reptileId: string): Promise<ShedLog | undefined> => {
    const logs = await db.shed_logs
      .where('[reptileId+date]')
      .between([reptileId, Dexie.minKey], [reptileId, Dexie.maxKey])
      .reverse()
      .limit(1)
      .toArray()
    return logs[0]
  },

  create: async (input: Omit<ShedLog, 'id' | 'createdAt'>): Promise<ShedLog> => {
    const log: ShedLog = { ...input, id: uid(), createdAt: now() }
    await db.shed_logs.add(log)
    return log
  },

  delete: (id: string) => db.shed_logs.delete(id),
}

// ─── HabitatLog ──────────────────────────────────────────────────────────────

export const habitatLogRepo = {
  getByReptile: (reptileId: string) =>
    db.habitat_logs.where('reptileId').equals(reptileId).reverse().sortBy('loggedAt'),

  create: async (input: Omit<HabitatLog, 'id' | 'createdAt'>): Promise<HabitatLog> => {
    const log: HabitatLog = { ...input, id: uid(), createdAt: now() }
    await db.habitat_logs.add(log)
    return log
  },

  delete: (id: string) => db.habitat_logs.delete(id),
}

// ─── UvbLog ──────────────────────────────────────────────────────────────────

export const uvbLogRepo = {
  getByReptile: (reptileId: string) =>
    db.uvb_logs.where('reptileId').equals(reptileId).reverse().sortBy('startedAt'),

  create: async (input: Omit<UvbLog, 'id' | 'createdAt'>): Promise<UvbLog> => {
    const log: UvbLog = { ...input, id: uid(), createdAt: now() }
    await db.uvb_logs.add(log)
    return log
  },

  update: async (id: string, patch: Partial<UvbLog>): Promise<UvbLog> => {
    const existing = await db.uvb_logs.get(id)
    if (!existing) throw new Error('UvbLog not found')
    const updated: UvbLog = { ...existing, ...patch }
    await db.uvb_logs.put(updated)
    return updated
  },

  delete: (id: string) => db.uvb_logs.delete(id),
}

// ─── SubstrateLog ────────────────────────────────────────────────────────────

export const substrateLogRepo = {
  getByReptile: (reptileId: string) =>
    db.substrate_logs.where('reptileId').equals(reptileId).reverse().sortBy('changedAt'),

  create: async (input: Omit<SubstrateLog, 'id' | 'createdAt'>): Promise<SubstrateLog> => {
    const log: SubstrateLog = { ...input, id: uid(), createdAt: now() }
    await db.substrate_logs.add(log)
    return log
  },

  delete: (id: string) => db.substrate_logs.delete(id),
}

// ─── TodoRule ─────────────────────────────────────────────────────────────────

export const todoRuleRepo = {
  getAll: () => db.todo_rules.toArray(),

  getByReptile: (reptileId: string | null) =>
    db.todo_rules.where('reptileId').equals(reptileId ?? '').toArray(),

  create: async (input: Omit<TodoRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<TodoRule> => {
    const t = now()
    const rule: TodoRule = { ...input, id: uid(), createdAt: t, updatedAt: t }
    await db.todo_rules.add(rule)
    return rule
  },

  update: async (id: string, patch: Partial<TodoRule>): Promise<TodoRule> => {
    const existing = await db.todo_rules.get(id)
    if (!existing) throw new Error('TodoRule not found')
    const updated: TodoRule = { ...existing, ...patch, updatedAt: now() }
    await db.todo_rules.put(updated)
    return updated
  },

  delete: (id: string) => db.todo_rules.delete(id),
}

// ─── TodoInstance ─────────────────────────────────────────────────────────────

export const todoInstanceRepo = {
  getByDate: (date: string) =>
    db.todo_instances.where('date').equals(date).toArray(),

  getByReptileAndDate: (reptileId: string, date: string) =>
    db.todo_instances.where('[reptileId+date]').equals([reptileId, date]).toArray(),

  upsertMany: async (items: TodoInstance[]): Promise<void> => {
    await db.todo_instances.bulkPut(items)
  },

  updateStatus: async (id: string, status: TodoStatus, notes?: string): Promise<void> => {
    await db.todo_instances.update(id, { status, notes, updatedAt: now() })
  },

  create: async (input: Omit<TodoInstance, 'id' | 'createdAt' | 'updatedAt'>): Promise<TodoInstance> => {
    const t = now()
    const instance: TodoInstance = { ...input, id: uid(), createdAt: t, updatedAt: t }
    await db.todo_instances.add(instance)
    return instance
  },

  delete: (id: string) => db.todo_instances.delete(id),
}

// ─── VisitLog ─────────────────────────────────────────────────────────────────

export const visitLogRepo = {
  getByReptile: (reptileId: string) =>
    db.visit_logs.where('reptileId').equals(reptileId).reverse().sortBy('date'),

  create: async (input: Omit<VisitLog, 'id' | 'createdAt'>): Promise<VisitLog> => {
    const log: VisitLog = { ...input, id: uid(), createdAt: now() }
    await db.visit_logs.add(log)
    return log
  },

  delete: (id: string) => db.visit_logs.delete(id),
}

// ─── ClutchLog ───────────────────────────────────────────────────────────────

export const clutchLogRepo = {
  getAll: () => db.clutch_logs.orderBy('date').reverse().toArray(),

  getByReptile: async (reptileId: string): Promise<ClutchLog[]> => {
    const [asFather, asMother] = await Promise.all([
      db.clutch_logs.where('fatherReptileId').equals(reptileId).toArray(),
      db.clutch_logs.where('motherReptileId').equals(reptileId).toArray(),
    ])
    const merged = [...asFather, ...asMother.filter((m) => !asFather.some((f) => f.id === m.id))]
    return merged.sort((a, b) => b.date.localeCompare(a.date))
  },

  create: async (input: Omit<ClutchLog, 'id' | 'createdAt'>): Promise<ClutchLog> => {
    const log: ClutchLog = { ...input, id: uid(), createdAt: now() }
    await db.clutch_logs.add(log)
    return log
  },

  update: async (id: string, patch: Partial<ClutchLog>): Promise<ClutchLog> => {
    const existing = await db.clutch_logs.get(id)
    if (!existing) throw new Error('ClutchLog not found')
    const updated: ClutchLog = { ...existing, ...patch }
    await db.clutch_logs.put(updated)
    return updated
  },

  delete: (id: string) => db.clutch_logs.delete(id),
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export const settingsRepo = {
  get: async <T>(key: string, fallback: T): Promise<T> => {
    const row = await db.settings.get(key)
    return row ? (row.value as T) : fallback
  },

  set: async (key: string, value: unknown): Promise<void> => {
    await db.settings.put({ key, value })
  },
}

import Dexie from 'dexie'
