'use client'

import { useState } from 'react'
import { MailWarning, RefreshCw, X } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

interface UnverifiedEmailBannerProps {
  email: string
}

export function UnverifiedEmailBanner({ email }: UnverifiedEmailBannerProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent'>('idle')
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  async function handleResend() {
    setStatus('loading')
    const supabase = createClient()
    await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setStatus('sent')
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200">
      <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-amber-800 text-sm">
          <MailWarning size={16} className="shrink-0" />
          <span>
            Bitte bestaetigen deine Email-Adresse.{' '}
            {status === 'sent' ? (
              <span className="font-medium">Email gesendet!</span>
            ) : (
              <button
                onClick={handleResend}
                disabled={status === 'loading'}
                className="underline font-medium hover:no-underline inline-flex items-center gap-1"
              >
                {status === 'loading' && <RefreshCw size={12} className="animate-spin" />}
                Link erneut senden
              </button>
            )}
          </span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Banner schliessen"
          className="text-amber-600 hover:text-amber-800 shrink-0"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
