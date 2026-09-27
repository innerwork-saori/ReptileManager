import i18n from '../i18n'
import { isDemoMode } from './demoMode'
import { isStandalone } from './pwaInstall'

export type FeedbackType = 'suggestion' | 'wish' | 'bug'

export interface FeedbackInput {
  type: FeedbackType
  message: string
  email: string
}

// Netlify Forms: the form named "feedback" is registered from the static public/__forms.html.
// POST to that real file rather than "/", which the SPA rewrite in netlify.toml would catch.
const FORM_NAME = 'feedback'
const FORM_ENDPOINT = '/__forms.html'

export async function submitFeedback(input: FeedbackInput): Promise<void> {
  const body = new URLSearchParams({
    'form-name': FORM_NAME,
    'bot-field': '',
    type: input.type,
    message: input.message.trim(),
    email: input.email.trim(),
    // Context only, no personal or reptile data
    appVersion: __APP_VERSION__,
    language: i18n.language ?? '',
    installed: String(isStandalone()),
    demo: String(isDemoMode()),
  })

  const res = await fetch(FORM_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  if (!res.ok) throw new Error(`feedback_failed_${res.status}`)
}
