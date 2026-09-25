import { reptileRepo, settingsRepo } from '../db/repos'
import { isDemoMode } from './demoMode'

const WELCOME_SEEN_KEY = 'welcomeSeen'

// First use = the welcome page has not been dismissed and there are no reptiles yet.
// Demo mode always shows it once per demo session (seeding clears settings).
export async function shouldShowWelcome(): Promise<boolean> {
  if (await settingsRepo.get(WELCOME_SEEN_KEY, false)) return false
  if (isDemoMode()) return true
  return (await reptileRepo.getAll()).length === 0
}

export function markWelcomeSeen(): Promise<void> {
  return settingsRepo.set(WELCOME_SEEN_KEY, true)
}
