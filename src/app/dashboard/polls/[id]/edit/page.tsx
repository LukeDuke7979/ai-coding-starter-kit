import { notFound, redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase-server'
import { NavBar } from '@/components/nav-bar'
import { EditPollForm } from './edit-poll-form'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditPollPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single()

  const displayName = profile?.display_name ?? user.email ?? 'Unbekannt'

  // Nur Ersteller darf bearbeiten
  const { data: poll } = await supabase
    .from('polls')
    .select('id, title, location, description, deadline, created_by')
    .eq('id', id)
    .single()

  if (!poll) notFound()
  if (poll.created_by !== user.id) redirect(`/dashboard/polls/${id}`)

  // Bestehende Termine laden
  const { data: dates } = await supabase
    .from('poll_dates')
    .select('id, date')
    .eq('poll_id', id)
    .order('date')

  // Bestehende Teilnehmer laden
  const { data: participants } = await supabase
    .from('poll_participants')
    .select('user_id')
    .eq('poll_id', id)

  // Alle Profile für Teilnehmer-Auswahl
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name')
    .order('display_name')

  // Termine mit Antworten (für Warnung bei Datum-Entfernung)
  const dateIds = (dates ?? []).map((d) => d.id)
  const { data: responses } = dateIds.length > 0
    ? await supabase
        .from('poll_responses')
        .select('poll_date_id')
        .in('poll_date_id', dateIds)
    : { data: [] }

  const datesWithResponses = new Set((responses ?? []).map((r) => r.poll_date_id))

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar displayName={displayName} />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-xl font-semibold text-gray-900 mb-6">Umfrage bearbeiten</h1>
        <EditPollForm
          poll={poll}
          existingDates={dates ?? []}
          existingParticipantIds={(participants ?? []).map((p) => p.user_id)}
          profiles={profiles ?? []}
          datesWithResponses={datesWithResponses}
          currentUserId={user.id}
        />
      </main>
    </div>
  )
}
