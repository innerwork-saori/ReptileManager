import type { LucideIcon } from 'lucide-react'
import {
  ScanLine, MoveHorizontal, QrCode, Egg, CalendarClock, MousePointerClick,
  Camera, Tags, Smartphone, UtensilsCrossed,
} from 'lucide-react'
import { isStandalone } from './pwaInstall'

export interface Tip {
  id: string          // text lives at i18n `tips.items.<id>`
  Icon: LucideIcon
  to?: string         // optional page the "take a look" link opens
  when?: () => boolean
}

const TIPS: Tip[] = [
  { id: 'scan', Icon: ScanLine, to: '/scan' },
  { id: 'swipe', Icon: MoveHorizontal, to: '/reptiles' },
  { id: 'qrExport', Icon: QrCode, to: '/backup' },
  { id: 'breeding', Icon: Egg, to: '/breeding' },
  { id: 'todoInterval', Icon: CalendarClock, to: '/todos' },
  { id: 'quickLog', Icon: MousePointerClick, to: '/reptiles' },
  { id: 'photoBackup', Icon: Camera, to: '/backup' },
  { id: 'categories', Icon: Tags, to: '/categories' },
  { id: 'install', Icon: Smartphone, to: '/backup', when: () => !isStandalone() },
  { id: 'feedAmount', Icon: UtensilsCrossed },
]

export function availableTips(): Tip[] {
  return TIPS.filter((tip) => !tip.when || tip.when())
}

// Uniform random index; when `exclude` is given, never returns it (so "another tip" always changes)
export function randomTipIndex(count: number, exclude?: number): number {
  if (count <= 1) return 0
  if (exclude === undefined) return Math.floor(Math.random() * count)
  const i = Math.floor(Math.random() * (count - 1))
  return i >= exclude ? i + 1 : i
}
