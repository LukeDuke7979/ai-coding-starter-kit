import { redirect } from 'next/navigation'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import { PlusCircle, Calendar, Users, MapPin, Clock } from 'lucide-react'

import { createClient } from '@/lib/supabase-server'
import { NavBar } from '@/components/nav-bar'
import { UnverifiedEmailBanner } from '@/components/unverified-email-banner'
import { Button } from '@/components/ui/button'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single()

  const displayName = profile?.display_name ?? user.email ?? 'Unbekannt'
  const isEmailVerified = !!user.email_confirmed_at

  const { data: polls } = await supabase
    .from('polls')
    .select('id, title, created_at, created_by, location, deadline, poll_dates(id), poll_participants(user_id)')
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar displayName={displayName} />

      {!isEmailVerified && user.email && (
        <UnverifiedEmailBanner email={user.email} />
      )}

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Meine Umfragen</h1>
          <Link href="/dashboard/polls/new">
            <Button className="flex items-center gap-2">
              <PlusCircle size={16} />
              Neue Umfrage
            </Button>
          </Link>
        </div>

        {!polls || polls.length === 0 ? (
          <div className="text-center py-20">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-gray-600 font-medium mb-1">Noch keine Umfragen</p>
            <p className="text-sm text-muted-foreground mb-6">
              Erstelle deine erste Terminumfrage und finde gemeinsame Termine.
            </p>
            <Link href="/dashboard/polls/new">
              <Button>Erste Umfrage erstellen</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {polls.map((poll) => {
              const dateCount = Array.isArray(poll.poll_dates) ? poll.poll_dates.length : 0
              const participantCount = Array.isArray(poll.poll_participants) ? poll.poll_participants.length : 0
              return (
                <Link key={poll.id} href={`/dashboard/polls/${poll.id}`}>
                  <div className="bg-white rounded-xl border hover:border-emerald-300 hover:shadow-sm transition-all p-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{poll.title}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                        <p className="text-xs text-muted-foreground">
                          {new Date(poll.created_at).toLocaleDateString('de-DE', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </p>
                        {poll.location && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin size={11} />
                            {poll.location}
                          </span>
                        )}
                        {poll.deadline && (
                          <span className="flex items-center gap-1 text-xs text-amber-600">
                            <Clock size={11} />
                            bis {format(parseISO(poll.deadline), 'd. MMM', { locale: de })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {dateCount} Termin{dateCount !== 1 ? 'e' : ''}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users size={14} />
                        {participantCount} Person{participantCount !== 1 ? 'en' : ''}
                      </span>
                      {poll.created_by === user.id && (
                        <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
                          Erstellt
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
