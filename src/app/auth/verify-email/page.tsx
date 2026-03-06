'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { MailCheck, AlertCircle, RefreshCw } from 'lucide-react'
import Link from 'next/link'

import { createClient } from '@/lib/supabase'
import { AuthLayout } from '@/components/auth-layout'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? ''
  const hasError = searchParams.get('error') === 'invalid_link'

  const [resendStatus, setResendStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')

  async function handleResend() {
    if (!email) return
    setResendStatus('loading')

    const supabase = createClient()
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    setResendStatus(error ? 'error' : 'sent')
  }

  if (hasError) {
    return (
      <AuthLayout title="Link ungueltig" description="Dieser Link ist abgelaufen oder wurde bereits verwendet.">
        <div className="flex flex-col items-center gap-4 py-2">
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Bestaetigungslinks sind 24 Stunden gueltig. Fordere unten einen neuen Link an.
          </p>
          {email && (
            <Button onClick={handleResend} disabled={resendStatus === 'loading' || resendStatus === 'sent'} className="w-full">
              {resendStatus === 'loading' && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              {resendStatus === 'sent' ? 'Email gesendet!' : 'Neuen Link anfordern'}
            </Button>
          )}
          {resendStatus === 'sent' && (
            <Alert>
              <AlertDescription>
                Eine neue Bestaetigunsmail wurde an {email} gesendet.
              </AlertDescription>
            </Alert>
          )}
          <Link href="/register" className="text-sm text-muted-foreground hover:underline">
            Zurueck zur Registrierung
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Email bestaetigen" description="Fast geschafft! Pruefe dein Postfach.">
      <div className="flex flex-col items-center gap-4 py-2">
        <div className="rounded-full bg-emerald-100 p-4">
          <MailCheck className="h-8 w-8 text-emerald-600" />
        </div>

        <div className="text-center space-y-1">
          <p className="text-sm text-muted-foreground">
            Wir haben eine Bestaetigunsmail an
          </p>
          {email && (
            <p className="font-medium text-sm">{email}</p>
          )}
          <p className="text-sm text-muted-foreground">
            gesendet. Klicke auf den Link in der Email um deinen Account zu aktivieren.
          </p>
        </div>

        <div className="w-full pt-2 space-y-3">
          {resendStatus === 'sent' ? (
            <Alert>
              <AlertDescription>
                Neue Bestaetigunsmail gesendet. Bitte pruefe deinen Posteingang.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-2">Keine Email erhalten?</p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResend}
                disabled={resendStatus === 'loading' || !email}
              >
                {resendStatus === 'loading' && <RefreshCw className="mr-2 h-3 w-3 animate-spin" />}
                Link erneut senden
              </Button>
            </div>
          )}

          {resendStatus === 'error' && (
            <Alert variant="destructive">
              <AlertDescription>
                Fehler beim Senden. Bitte versuche es spaeter erneut.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <Link href="/login" className="text-sm text-muted-foreground hover:underline mt-2">
          Bereits bestaetigt? Zum Login
        </Link>
      </div>
    </AuthLayout>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<AuthLayout title="Laden..."><div className="h-32" /></AuthLayout>}>
      <VerifyEmailContent />
    </Suspense>
  )
}
