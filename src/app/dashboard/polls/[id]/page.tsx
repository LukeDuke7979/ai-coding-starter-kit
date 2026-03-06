import { notFound, redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase-server'
import { NavBar } from '@/components/nav-bar'
import { ResponseGrid } from './response-grid'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function PollPage({ params }: PageProps) {
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

  // Umfrage laden
  const { data: poll } = await supabase
    .from('polls')
    .select('id, title, created_by, location, description, deadline')
    .eq('id', id)
    .single()

  if (!poll) notFound()

  // Termine laden
  const { data: dates } = await supabase
    .from('poll_dates')
    .select('id, date')
    .eq('poll_id', id)
    .order('date')

  // Teilnehmer mit Namen laden (FK poll_participants.user_id -> profiles.id)
  const { data: rawParticipants } = await supabase
    .from('poll_participants')
    .select('user_id, profiles(display_name)')
    .eq('poll_id', id)

  const participants = (rawParticipants ?? []).map((p) => ({
    user_id: p.user_id,
    display_name: (p.profiles as unknown as { display_name: string } | null)?.display_name ?? 'Unbekannt',
  }))

  // Antworten laden
  const dateIds = (dates ?? []).map((d) => d.id)
  const { data: responses } = dateIds.length > 0
    ? await supabase
        .from('poll_responses')
        .select('poll_date_id, user_id, available')
        .in('poll_date_id', dateIds)
    : { data: [] }

  // Ersteller-Profil laden (für immer-sichtbare Creator-Zeile)
  const { data: creatorProfileData } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', poll.created_by)
    .single()

  const creatorProfile = creatorProfileData
    ? { user_id: poll.created_by, display_name: creatorProfileData.display_name ?? 'Unbekannt' }
    : null

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar displayName={displayName} />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <ResponseGrid
          poll={poll}
          dates={dates ?? []}
          participants={participants}
          initialResponses={responses ?? []}
          currentUserId={user.id}
          isCreator={poll.created_by === user.id}
          creatorProfile={creatorProfile}
        />
      </main>
    </div>
  )
}
