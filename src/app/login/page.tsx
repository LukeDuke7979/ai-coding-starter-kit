'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { Suspense } from 'react'

import { createClient } from '@/lib/supabase'
import { AuthLayout } from '@/components/auth-layout'
import { GoogleLoginButton } from '@/components/google-login-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

const loginSchema = z.object({
  email: z.string().email('Bitte gib eine gueltige Email-Adresse ein'),
  password: z.string().min(1, 'Bitte gib dein Passwort ein'),
})

type LoginFormValues = z.infer<typeof loginSchema>

function LoginForm() {
  const searchParams = useSearchParams()
  const raw = searchParams.get('redirectTo') ?? '/dashboard'
  const redirectTo = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/dashboard'

  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  async function onSubmit(values: LoginFormValues) {
    setIsLoading(true)
    setServerError(null)

    const supabase = createClient()

    const { data, error } = await supabase.auth.signInWithPassword({
      email: values.email.toLowerCase().trim(),
      password: values.password,
    })

    if (error) {
      if (error.status === 429 || error.message.toLowerCase().includes('rate') || error.message.toLowerCase().includes('too many')) {
        setServerError('Zu viele Fehlversuche. Bitte warte 15 Minuten und versuche es erneut.')
      } else {
        setServerError('Email oder Passwort falsch.')
      }
      setIsLoading(false)
      return
    }

    if (data.session) {
      window.location.href = redirectTo
    } else {
      setServerError('Login fehlgeschlagen. Bitte versuche es erneut.')
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="deine@email.de" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Passwort</FormLabel>
                <Link
                  href="/auth/forgot-password"
                  className="text-xs text-muted-foreground hover:text-primary"
                >
                  Passwort vergessen?
                </Link>
              </div>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Dein Passwort"
                    {...field}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Wird eingeloggt...' : 'Einloggen'}
        </Button>
      </form>
    </Form>
  )
}

export default function LoginPage() {
  return (
    <AuthLayout title="Willkommen zurueck" description="Logge dich ein um fortzufahren.">
      <Suspense fallback={<div className="h-48" />}>
        <LoginForm />
      </Suspense>

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">oder</span>
        </div>
      </div>

      <GoogleLoginButton />

      <p className="text-center text-sm text-muted-foreground mt-4">
        Noch kein Konto?{' '}
        <Link href="/register" className="text-primary font-medium hover:underline">
          Registrieren
        </Link>
      </p>
    </AuthLayout>
  )
}
