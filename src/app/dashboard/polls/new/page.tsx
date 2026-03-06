import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { NavBar } from '@/components/nav-bar'
import { NewPollForm } from './new-poll-form'

export default async function NewPollPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single()

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name')
    .order('display_name')

  const displayName = profile?.display_name ?? user.email ?? 'Unbekannt'

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar displayName={displayName} />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Neue Terminumfrage</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Wähle Termine aus und lade Teilnehmer ein.
          </p>
        </div>
        <NewPollForm currentUserId={user.id} profiles={profiles ?? []} />
      </main>
    </div>
  )
}
