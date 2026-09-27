import { useState } from 'react'
import { CircleCheck, Lightbulb, Bug, Sparkles, Send, Mail } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Layout } from '../components/Layout'
import { InputField } from '../components/FormField'
import { submitFeedback, type FeedbackType } from '../lib/feedback'

const CONTACT_EMAIL = 'reptilemanager@heysaori.com'

const TYPES: { value: FeedbackType; Icon: typeof Lightbulb }[] = [
  { value: 'suggestion', Icon: Lightbulb },
  { value: 'wish', Icon: Sparkles },
  { value: 'bug', Icon: Bug },
]

export function FeedbackPage() {
  const { t } = useTranslation()
  const [type, setType] = useState<FeedbackType>('suggestion')
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [messageError, setMessageError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) {
      setMessageError(t('feedback.messageRequired'))
      return
    }
    setStatus('sending')
    try {
      await submitFeedback({ type, message, email })
      setStatus('sent')
      setMessage('')
      setEmail('')
    } catch {
      // Keep what the user typed so they can retry or copy it into an email
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <Layout title={t('feedback.title')} back>
        <div className="px-4 pt-16 pb-8 max-w-lg mx-auto flex flex-col items-center gap-4 text-center">
          <CircleCheck size={48} className="text-primary" />
          <h2 className="text-lg font-semibold text-on-surface">{t('feedback.sentTitle')}</h2>
          <p className="text-sm text-on-surface-variant">{t('feedback.sentBody')}</p>
          <button
            type="button"
            onClick={() => setStatus('idle')}
            className="mt-2 rounded-xl border border-primary px-4 py-2.5 text-sm font-semibold text-primary"
          >
            {t('feedback.sendAnother')}
          </button>
        </div>
      </Layout>
    )
  }

  const sending = status === 'sending'

  return (
    <Layout title={t('feedback.title')} back>
      <form onSubmit={handleSubmit} className="px-4 pt-4 pb-8 max-w-lg mx-auto space-y-5">
        <p className="text-sm leading-relaxed text-on-surface-variant">{t('feedback.intro')}</p>

        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">
            {t('feedback.typeLabel')}<span className="text-red-500 ml-1">*</span>
          </p>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t('feedback.typeLabel')}>
            {TYPES.map(({ value, Icon }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={type === value}
                onClick={() => setType(value)}
                className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-sm font-semibold transition-colors ${
                  type === value
                    ? 'border-primary bg-primary text-on-primary'
                    : 'border-outline-variant bg-surface-container-lowest text-on-surface-variant'
                }`}
              >
                <Icon size={20} />
                {t(`feedback.types.${value}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="feedback-message" className="block text-sm font-medium text-gray-700">
            {t('feedback.messageLabel')}<span className="text-red-500 ml-1">*</span>
          </label>
          <textarea
            id="feedback-message"
            rows={6}
            value={message}
            onChange={(e) => { setMessage(e.target.value); setMessageError('') }}
            placeholder={t(`feedback.placeholders.${type}`)}
            className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-y ${
              messageError ? 'border-red-400' : 'border-gray-300'
            }`}
          />
          {messageError && <p className="text-xs text-red-500">{messageError}</p>}
        </div>

        <div className="space-y-1">
          <InputField
            label={t('feedback.emailLabel')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            autoComplete="email"
          />
          <p className="text-xs text-on-surface-variant">{t('feedback.emailHint')}</p>
        </div>

        <p className="rounded-lg bg-surface-container p-3 text-xs leading-relaxed text-on-surface-variant">
          {t('feedback.privacy')}
        </p>

        {status === 'error' && (
          <div className="space-y-1 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
            <p>{t('feedback.error')}</p>
            <a href={`mailto:${CONTACT_EMAIL}`} className="inline-flex items-center gap-1.5 font-semibold underline underline-offset-2">
              <Mail size={14} />
              {CONTACT_EMAIL}
            </a>
          </div>
        )}

        <button
          type="submit"
          disabled={sending}
          className="w-full flex items-center justify-center gap-2 bg-primary text-on-primary py-3 rounded-xl font-semibold disabled:opacity-60 active:scale-[0.98] transition-transform"
        >
          <Send size={18} />
          {sending ? t('feedback.sending') : t('feedback.submit')}
        </button>
      </form>
    </Layout>
  )
}
