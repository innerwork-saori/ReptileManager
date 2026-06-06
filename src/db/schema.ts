import Dexie, { type Table } from 'dexie'

export interface Reptile {
  id: string
  name: string
  species: string
  breed: string
  sex?: 'male' | 'female' | 'unknown'
  birthDate?: string
  enclosureName?: string
  photoUrl?: string
  notes?: string
  allergyInfo?: string
  chronicInfo?: string
  qrTargetUrl: string
  createdAt: string
  updatedAt: string
}

export interface WeightLog {
  id: string
  reptileId: string
  date: string
  weight: number
  notes?: string
  createdAt: string
}

export interface FeedLog {
  id: string
  reptileId: string
  fedAt: string
  foodType: string
  amount: string
  notes?: string
  createdAt: string
}

export interface MedicationCourse {
  id: string
  reptileId: string
  drugName: string
  dosage: string
  ruleType: 'daily' | 'hourly' | 'weekly'
  ruleConfig: Record<string, unknown>
  startDate: string
  endDate?: string
  active: boolean
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface MedicationLog {
  id: string
  reptileId: string
  courseId?: string
  takenAt: string
  drugName: string
  dosage: string
  notes?: string
  createdAt: string
}

export interface ShedLog {
  id: string
  reptileId: string
  date: string
  status: 'complete' | 'partial' | 'stuck'
  notes?: string
  createdAt: string
}

export interface HabitatLog {
  id: string
  reptileId: string
  loggedAt: string
  temperature?: number
  humidity?: number
  notes?: string
  createdAt: string
}

export interface UvbLog {
  id: string
  reptileId: string
  lampName: string
  startedAt: string
  expectedReplaceAt?: string
  notes?: string
  createdAt: string
  replacedAt?: string
}

export interface SubstrateLog {
  id: string
  reptileId: string
  changedAt: string
  substrateType: string
  notes?: string
  createdAt: string
}

export type TodoRuleType =
  | 'feeding'
  | 'medication'
  | 'cleaning'
  | 'weight'
  | 'uvb_check'
  | 'substrate'
  | 'shed_check'
  | 'custom'

export type ScheduleType = 'fixed_daily' | 'fixed_weekly' | 'interval_days'

export interface TodoRule {
  id: string
  reptileId: string | null
  type: TodoRuleType
  label: string
  scheduleType: ScheduleType
  config: Record<string, unknown>
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export type TodoStatus = 'pending' | 'done' | 'skipped'

export interface TodoInstance {
  id: string
  reptileId: string | null
  ruleId?: string
  date: string
  dueAt?: string
  status: TodoStatus
  type: TodoRuleType
  label: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface VisitLog {
  id: string
  reptileId: string
  date: string
  summary: string
  notes?: string
  createdAt: string
}

export interface Setting {
  key: string
  value: unknown
}

export class ReptileManagerDb extends Dexie {
  reptiles!: Table<Reptile, string>
  weight_logs!: Table<WeightLog, string>
  feed_logs!: Table<FeedLog, string>
  medication_courses!: Table<MedicationCourse, string>
  medication_logs!: Table<MedicationLog, string>
  shed_logs!: Table<ShedLog, string>
  habitat_logs!: Table<HabitatLog, string>
  uvb_logs!: Table<UvbLog, string>
  substrate_logs!: Table<SubstrateLog, string>
  todo_rules!: Table<TodoRule, string>
  todo_instances!: Table<TodoInstance, string>
  visit_logs!: Table<VisitLog, string>
  settings!: Table<Setting, string>

  constructor() {
    super('reptileManagerDb')

    this.version(1).stores({
      reptiles: 'id, name, species, createdAt',
      weight_logs: 'id, reptileId, date, [reptileId+date]',
      feed_logs: 'id, reptileId, fedAt, [reptileId+fedAt]',
      medication_courses: 'id, reptileId, active, [reptileId+active]',
      medication_logs: 'id, reptileId, takenAt, [reptileId+takenAt]',
      shed_logs: 'id, reptileId, date, [reptileId+date]',
      habitat_logs: 'id, reptileId, loggedAt, [reptileId+loggedAt]',
      uvb_logs: 'id, reptileId, startedAt',
      substrate_logs: 'id, reptileId, changedAt, [reptileId+changedAt]',
      todo_rules: 'id, reptileId, type, enabled',
      todo_instances: 'id, reptileId, date, status, [reptileId+date], [date+status]',
      visit_logs: 'id, reptileId, date, [reptileId+date]',
      settings: 'key',
    })
  }
}

export const db = new ReptileManagerDb()
