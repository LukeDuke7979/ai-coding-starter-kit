'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import { ArrowLeft, Check, X, MapPin, Clock, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface PollDate {
  id: string
  date: string
}

interface Participant {
  user_id: string
  display_name: string
}

interface ResponseData {
  poll_date_id: string
  user_id: string
  available: boolean
}

interface CreatorProfile {
  user_id: string
  display_name: string
}

interface ResponseGridProps {
  poll: {
    id: string
    title: string
    created_by: string
    location?: string | null
    description?: string | null
    deadline?: string | null
  }
  dates: PollDate[]
  participants: Participant[]
  initialResponses: ResponseData[]
  currentUserId: string
  isCreator: boolean
  creatorProfile: CreatorProfile | null
}

export function ResponseGrid({
  poll,
  dates,
  participants,
  initialResponses,
  currentUserId,
  isCreator,
  creatorProfile,
}: ResponseGridProps) {
  const router = useRouter()

  // "dateId:userId" -> boolean | null (null = no response)
  const [responses, setResponses] = useState<Record<string, boolean | null>>(() => {
    const map: Record<string, boolean | null> = {}
    initialResponses.forEach((r) => {
      map[`${r.poll_date_id}:${r.user_id}`] = r.available
    })
    return map
  })

  const [saving, setSaving] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const isParticipant = participants.some((p) => p.user_id === currentUserId)

  // Ersteller ist Teilnehmer, wenn er in der Teilnehmerliste steht
  const creatorIsParticipant = participants.some((p) => p.user_id === poll.created_by)

  // Geordnete Teilnehmerliste: Ersteller immer oben (ohne Duplikat), dann Rest
  const creatorParticipant = participants.find((p) => p.user_id === poll.created_by)
  const otherParticipants = participants.filter((p) => p.user_id !== poll.created_by)
  const orderedParticipants: Participant[] = [
    ...(creatorParticipant ? [creatorParticipant] : []),
    ...otherParticipants,
  ]

  // Ob die Tabelle angezeigt werden soll: Termine vorhanden UND (Teilnehmer ODER Creator mit Profil)
  const hasTableContent = dates.length > 0 && (orderedParticipants.length > 0 || creatorProfile !== null)

  const isDeadlinePassed =
    poll.deadline !== null &&
    poll.deadline !== undefined &&
    parseISO(poll.deadline) < new Date(new Date().setHours(0, 0, 0, 0))

  // Best-Termin-Highlight: find max Ja-Stimmen per date (nur echte Teilnehmer)
  function getJaCount(dateId: string) {
    return participants.filter((p) => responses[`${dateId}:${p.user_id}`] === true).length
  }

  const jaCounts = dates.map((d) => getJaCount(d.id))
  const maxJaCount = Math.max(0, ...jaCounts)
  const bestDateIds = maxJaCount > 0
    ? new Set(dates.filter((d) => getJaCount(d.id) === maxJaCount).map((d) => d.id))
    : new Set<string>()

  // "Kein gemeinsamer Termin": someone has answered but no JA exists
  const anyResponseExists = Object.values(responses).some((v) => v !== null && v !== undefined)
  const noCommonDate = anyResponseExists && maxJaCount === 0

  async function handleResponse(dateId: string, available: boolean) {
    if (isDeadlinePassed) return

    const key = `${dateId}:${currentUserId}`
    const previous = responses[key]
    const newValue = previous === available ? null : available

    // Optimistic update
    setResponses((prev) => ({ ...prev, [key]: newValue }))
    setSaving(key)

    const supabase = createClient()

    if (newValue === null) {
      const { error } = await supabase
        .from('poll_responses')
        .delete()
        .eq('poll_date_id', dateId)
        .eq('user_id', currentUserId)

      if (error) {
        // Rollback
        setResponses((prev) => ({ ...prev, [key]: previous }))
        toast.error('Antwort konnte nicht gespeichert werden. Bitte versuche es erneut.')
      }
    } else {
      const { error } = await supabase.from('poll_responses').upsert(
        {
          poll_date_id: dateId,
          user_id: currentUserId,
          available: newValue,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'poll_date_id,user_id' }
      )

      if (error) {
        // Rollback
        setResponses((prev) => ({ ...prev, [key]: previous }))
        toast.error('Antwort konnte nicht gespeichert werden. Bitte versuche es erneut.')
      }
    }

    setSaving(null)
  }

  async function handleDelete() {
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('polls').delete().eq('id', poll.id)
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="text-muted-foreground -ml-2 mt-0.5">
            <ArrowLeft size={14} className="mr-1" />
            Zurück
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-xl font-semibold text-gray-900">{poll.title}</h1>
            {isCreator && (
              <div className="flex items-center gap-1 shrink-0">
                <Link href={`/dashboard/polls/${poll.id}/edit`}>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Pencil size={13} />
                    Bearbeiten
                  </Button>
                </Link>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive">
                      <Trash2 size={13} />
                      Löschen
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Umfrage löschen?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Diese Aktion kann nicht rückgängig gemacht werden. Alle Termine, Teilnehmer und Antworten werden dauerhaft gelöscht.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        disabled={deleting}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {deleting ? 'Wird gelöscht...' : 'Löschen'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>

          {/* Poll meta info */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
            {poll.location && (
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin size={13} />
                {poll.location}
              </span>
            )}
            {poll.deadline && (
              <span className={`flex items-center gap-1 text-sm ${isDeadlinePassed ? 'text-destructive' : 'text-amber-600'}`}>
                <Clock size={13} />
                {isDeadlinePassed
                  ? `Abstimmung beendet am ${format(parseISO(poll.deadline), 'd. MMMM yyyy', { locale: de })}`
                  : `Abstimmung bis ${format(parseISO(poll.deadline), 'd. MMMM yyyy', { locale: de })}`}
              </span>
            )}
          </div>

          {poll.description && (
            <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{poll.description}</p>
          )}

          {!isParticipant && !isCreator && (
            <p className="text-xs text-muted-foreground mt-1">
              Du bist kein Teilnehmer dieser Umfrage.
            </p>
          )}
        </div>
      </div>

      {/* Deadline-passed banner */}
      {isDeadlinePassed && (
        <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          Die Abstimmungsfrist ist abgelaufen — Ergebnisse sind lesbar, Antworten können nicht mehr geändert werden.
        </div>
      )}

      {/* No common date hint */}
      {noCommonDate && (
        <div className="mb-4 rounded-lg bg-gray-50 border px-4 py-3 text-sm text-muted-foreground text-center">
          Kein gemeinsamer Termin gefunden — noch keine Übereinstimmung bei den Ja-Stimmen.
        </div>
      )}

      {!hasTableContent ? (
        <div className="bg-white rounded-xl border p-10 text-center text-muted-foreground">
          Diese Umfrage hat noch keine Termine oder Teilnehmer.
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left px-4 py-3 font-medium text-sm text-gray-700 min-w-[150px] sticky left-0 bg-white z-10 border-r border-gray-100">
                  Teilnehmer
                </th>
                {dates.map((d) => {
                  const isBest = bestDateIds.has(d.id)
                  return (
                    <th
                      key={d.id}
                      className={`px-3 py-3 font-medium text-sm min-w-[120px] text-center transition-colors ${
                        isBest
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'bg-gray-50 text-gray-700'
                      }`}
                    >
                      <div className={`text-xs ${isBest ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                        {format(parseISO(d.date), 'EEEE', { locale: de })}
                      </div>
                      <div>{format(parseISO(d.date), 'd. MMM', { locale: de })}</div>
                      {isBest && (
                        <div className="text-xs text-emerald-600 font-semibold mt-0.5">★ Beste</div>
                      )}
                    </th>
                  )
                })}
              </tr>
            </thead>

            <tbody>
              {/* Read-only Creator-Zeile wenn Ersteller kein Teilnehmer ist */}
              {!creatorIsParticipant && creatorProfile && (
                <tr key="creator-readonly" className="bg-white">
                  <td className="px-4 py-3 text-sm font-medium sticky left-0 z-10 border-r border-gray-100 bg-white">
                    {creatorProfile.display_name}
                    {creatorProfile.user_id === currentUserId && (
                      <span className="ml-1.5 text-xs text-emerald-600">(Du)</span>
                    )}
                    <span className="ml-1 text-xs text-amber-500" title="Ersteller">★</span>
                  </td>
                  {dates.map((d) => (
                    <td key={d.id} className="px-2 py-2">
                      <div className="flex justify-center">
                        <span className="text-gray-300 text-sm select-none">—</span>
                      </div>
                    </td>
                  ))}
                </tr>
              )}

              {/* Teilnehmer-Zeilen: Ersteller zuerst (wenn Teilnehmer), dann Rest */}
              {orderedParticipants.map((participant, idx) => {
                const isCurrentUser = participant.user_id === currentUserId
                // Zeilenindex für Alternierung: wenn Creator-readonly-Zeile oben ist, verschiebt sich der Index
                const rowIndex = (!creatorIsParticipant && creatorProfile) ? idx + 1 : idx
                const rowBg = rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'
                return (
                  <tr key={participant.user_id} className={rowBg}>
                    <td className={`px-4 py-3 text-sm font-medium sticky left-0 z-10 border-r border-gray-100 ${rowBg}`}>
                      {participant.display_name}
                      {isCurrentUser && (
                        <span className="ml-1.5 text-xs text-emerald-600">(Du)</span>
                      )}
                      {participant.user_id === poll.created_by && (
                        <span className="ml-1 text-xs text-amber-500" title="Ersteller">★</span>
                      )}
                    </td>

                    {dates.map((d) => {
                      const key = `${d.id}:${participant.user_id}`
                      const response = responses[key]
                      const isSaving = saving === key

                      if (isCurrentUser && isParticipant && !isDeadlinePassed) {
                        return (
                          <td key={d.id} className="px-2 py-2">
                            <div className="flex gap-1.5 justify-center">
                              <button
                                onClick={() => handleResponse(d.id, true)}
                                disabled={isSaving}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
                                  response === true
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                }`}
                              >
                                <Check size={12} />
                                Ja
                              </button>
                              <button
                                onClick={() => handleResponse(d.id, false)}
                                disabled={isSaving}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
                                  response === false
                                    ? 'bg-red-500 text-white'
                                    : 'bg-red-50 text-red-700 hover:bg-red-100'
                                }`}
                              >
                                <X size={12} />
                                Nein
                              </button>
                            </div>
                          </td>
                        )
                      }

                      return (
                        <td key={d.id} className="px-2 py-2">
                          <div className="flex justify-center">
                            {response === true && (
                              <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium">
                                <Check size={12} />
                                Ja
                              </span>
                            )}
                            {response === false && (
                              <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-xs font-medium">
                                <X size={12} />
                                Nein
                              </span>
                            )}
                            {(response === undefined || response === null) && (
                              <span className="text-gray-300 text-sm select-none">—</span>
                            )}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>

            {/* Zusammenfassung */}
            <tfoot>
              <tr className="border-t bg-emerald-50/50">
                <td className="px-4 py-3 text-sm font-semibold text-gray-700 sticky left-0 bg-emerald-50/50 z-10 border-r border-gray-100">
                  Ja-Stimmen
                </td>
                {dates.map((d) => {
                  const count = getJaCount(d.id)
                  const total = participants.length + (!creatorIsParticipant && creatorProfile ? 1 : 0)
                  const isBest = bestDateIds.has(d.id)
                  return (
                    <td key={d.id} className="px-3 py-3 text-center">
                      <span
                        className={`text-sm font-bold ${
                          isBest
                            ? 'text-emerald-600'
                            : count > 0
                            ? 'text-emerald-500'
                            : 'text-gray-400'
                        }`}
                      >
                        {count} / {total}
                      </span>
                    </td>
                  )
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
