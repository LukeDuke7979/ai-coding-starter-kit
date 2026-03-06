'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { MailCheck, ArrowLeft } from 'lucide-react'

import { createClient } from '@/lib/supabase'
import { AuthLayout } from '@/components/auth-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

const forgotPasswordSchema = z.object({
  email: z.string().email('Bitte gib eine gueltige Email-Adresse ein'),
})

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  async function onSubmit(values: ForgotPasswordValues) {
    setIsLoading(true)

    const supabase = createClient()
    // Antwort wird immer gleich gezeigt — verhindert User-Enumeration
    await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    })

    setIsLoading(false)
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <AuthLayout title="Email gesendet" description="Pruefe dein Postfach.">
        <div className="flex flex-col items-center gap-4 py-2">
          <div className="rounded-full bg-emerald-100 p-4">
            <MailCheck className="h-8 w-8 text-emerald-600" />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Wenn ein Account mit dieser Email-Adresse existiert, haben wir dir
            einen Link zum Zuruecksetzen des Passworts gesendet.
          </p>
          <p className="text-xs text-muted-foreground text-center">
            Der Link ist 1 Stunde gueltig. Bitte pruefe auch deinen Spam-Ordner.
          </p>
          <Link href="/login">
            <Button variant="outline" size="sm" className="mt-2">
              <ArrowLeft size={14} className="mr-1.5" />
              Zurueck zum Login
            </Button>
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Passwort zuruecksetzen"
      description="Gib deine Email-Adresse ein. Wir senden dir einen Link."
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Wird gesendet...' : 'Link anfordern'}
          </Button>
        </form>
      </Form>

      <div className="text-center mt-4">
        <Link href="/login" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1">
          <ArrowLeft size={13} />
          Zurueck zum Login
        </Link>
      </div>
    </AuthLayout>
  )
}
