'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import { ArrowLeft, CalendarIcon, X, AlertTriangle } from 'lucide-react'

import { createClient } from '@/lib/supabase'
import { Calendar } from '@/components/ui/calendar'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface Profile {
  id: string
  display_name: string
}

interface ExistingDate {
  id: string
  date: string
}

interface EditPollFormProps {
  poll: {
    id: string
    title: string
    location?: string | null
    description?: string | null
    deadline?: string | null
  }
  existingDates: ExistingDate[]
  existingParticipantIds: string[]
  profiles: Profile[]
  datesWithResponses: Set<string>
  currentUserId: string
}

export function EditPollForm({
  poll,
  existingDates,
  existingParticipantIds,
  profiles,
  datesWithResponses,
  currentUserId,
}: EditPollFormProps) {
  const router = useRouter()

  const [title, setTitle] = useState(poll.title)
  const [location, setLocation] = useState(poll.location ?? '')
  const [description, setDescription] = useState(poll.description ?? '')
  const initialDeadline = poll.deadline ?? null
  const [deadline, setDeadline] = useState<Date | null>(
    poll.deadline ? parseISO(poll.deadline) : null
  )
  const [deadlineOpen, setDeadlineOpen] = useState(false)

  // Selected dates as Date objects (initialized from existing)
  const [selectedDates, setSelectedDates] = useState<Date[]>(() =>
    existingDates.map((d) => {
      // Parse as local date to avoid timezone shift
      const [year, month, day] = d.date.split('-').map(Number)
      return new Date(year, month - 1, day)
    })
  )

  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(existingParticipantIds)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleUser(userId: string) {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  // Check if a selected date (by local date string) is being removed and has responses
  function willRemoveDateWithResponses(): boolean {
    const selectedDateStrings = new Set(selectedDates.map((d) => format(d, 'yyyy-MM-dd')))
    return existingDates.some(
      (ed) => !selectedDateStrings.has(ed.date) && datesWithResponses.has(ed.id)
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (title.trim().length < 2) {
      setError('Titel muss mindestens 2 Zeichen lang sein.')
      return
    }
    if (selectedDates.length === 0) {
      setError('Bitte wähle mindestens einen Termin aus.')
      return
    }
    if (selectedUserIds.length === 0) {
      setError('Bitte wähle mindestens einen Teilnehmer aus.')
      return
    }
    const deadlineChanged = deadline
      ? format(deadline, 'yyyy-MM-dd') !== initialDeadline
      : initialDeadline !== null
    if (deadlineChanged && deadline && deadline < new Date(new Date().setHours(0, 0, 0, 0))) {
      setError('Das Enddatum muss in der Zukunft liegen.')
      return
    }

    setIsLoading(true)
    const supabase = createClient()

    // 1. Poll-Stammdaten aktualisieren
    const { error: pollError } = await supabase
      .from('polls')
      .update({
        title: title.trim(),
        location: location.trim() || null,
        description: description.trim() || null,
        deadline: deadline ? format(deadline, 'yyyy-MM-dd') : null,
      })
      .eq('id', poll.id)

    if (pollError) {
      setError('Umfrage konnte nicht aktualisiert werden.')
      setIsLoading(false)
      return
    }

    // 2. Termine: Diff berechnen
    const newDateStrings = selectedDates.map((d) => format(d, 'yyyy-MM-dd'))
    const existingDateStrings = existingDates.map((d) => d.date)

    const toAdd = newDateStrings.filter((s) => !existingDateStrings.includes(s))
    const toRemoveIds = existingDates
      .filter((ed) => !newDateStrings.includes(ed.date))
      .map((ed) => ed.id)

    if (toAdd.length > 0) {
      const { error: addDatesError } = await supabase.from('poll_dates').insert(
        toAdd.map((date) => ({ poll_id: poll.id, date }))
      )
      if (addDatesError) {
        setError('Neue Termine konnten nicht gespeichert werden.')
        setIsLoading(false)
        return
      }
    }

    if (toRemoveIds.length > 0) {
      const { error: removeDatesError } = await supabase
        .from('poll_dates')
        .delete()
        .in('id', toRemoveIds)
      if (removeDatesError) {
        setError('Termine konnten nicht entfernt werden.')
        setIsLoading(false)
        return
      }
    }

    // 3. Teilnehmer: Diff berechnen
    const toAddUsers = selectedUserIds.filter((id) => !existingParticipantIds.includes(id))
    const toRemoveUsers = existingParticipantIds.filter((id) => !selectedUserIds.includes(id))

    if (toAddUsers.length > 0) {
      const { error: addUsersError } = await supabase.from('poll_participants').insert(
        toAddUsers.map((userId) => ({ poll_id: poll.id, user_id: userId }))
      )
      if (addUsersError) {
        setError('Neue Teilnehmer konnten nicht gespeichert werden.')
        setIsLoading(false)
        return
      }
    }

    if (toRemoveUsers.length > 0) {
      const { error: removeUsersError } = await supabase
        .from('poll_participants')
        .delete()
        .eq('poll_id', poll.id)
        .in('user_id', toRemoveUsers)
      if (removeUsersError) {
        setError('Teilnehmer konnten nicht entfernt werden.')
        setIsLoading(false)
        return
      }
    }

    router.push(`/dashboard/polls/${poll.id}`)
    router.refresh()
  }

  const sortedSelected = [...selectedDates].sort((a, b) => a.getTime() - b.getTime())
  const hasResponseWarning = willRemoveDateWithResponses()

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {hasResponseWarning && (
        <Alert>
          <AlertTriangle size={14} className="mr-2 inline-block" />
          <AlertDescription>
            Du entfernst Termine, für die bereits Antworten abgegeben wurden. Diese Antworten werden unwiderruflich gelöscht.
          </AlertDescription>
        </Alert>
      )}

      {/* Titel + Ort + Beschreibung */}
      <div className="bg-white rounded-xl border p-4 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="title">Titel <span className="text-destructive">*</span></Label>
            <span className="text-xs text-muted-foreground">{title.length}/100</span>
          </div>
          <Input
            id="title"
            placeholder="z.B. Team-Meeting März"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Ort <span className="text-xs text-muted-foreground">(optional)</span></Label>
          <Input
            id="location"
            placeholder="z.B. Konferenzraum A oder Zoom"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            maxLength={100}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Beschreibung <span className="text-xs text-muted-foreground">(optional)</span></Label>
          <Textarea
            id="description"
            placeholder="z.B. Bitte Laptop mitbringen. Agenda wird vorab geteilt."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            rows={3}
          />
          <p className="text-xs text-muted-foreground text-right">{description.length}/500</p>
        </div>
      </div>

      {/* Termine */}
      <div className="bg-white rounded-xl border p-4">
        <Label className="mb-3 block">
          Termine auswählen <span className="text-destructive">*</span>
          {selectedDates.length > 0 && (
            <span className="text-muted-foreground font-normal ml-2">
              ({selectedDates.length} ausgewählt)
            </span>
          )}
        </Label>
        <Calendar
          mode="multiple"
          selected={selectedDates}
          onSelect={(dates) => setSelectedDates(dates ?? [])}
          disabled={{ before: new Date() }}
          locale={de}
          className="rounded-md mx-auto"
        />
        {sortedSelected.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {sortedSelected.map((date) => {
              const dateStr = format(date, 'yyyy-MM-dd')
              const existing = existingDates.find((ed) => ed.date === dateStr)
              const hasResponses = existing ? datesWithResponses.has(existing.id) : false
              return (
                <span
                  key={date.toISOString()}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    hasResponses
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-emerald-50 text-emerald-700'
                  }`}
                >
                  {format(date, 'EEE, d. MMM', { locale: de })}
                  {hasResponses && ' ⚠'}
                </span>
              )
            })}
          </div>
        )}
      </div>

      {/* Teilnehmer */}
      <div className="bg-white rounded-xl border p-4">
        <Label className="mb-3 block">
          Teilnehmer auswählen <span className="text-destructive">*</span>
          {selectedUserIds.length > 0 && (
            <span className="text-muted-foreground font-normal ml-2">
              ({selectedUserIds.length} ausgewählt)
            </span>
          )}
        </Label>
        {profiles.length === 0 ? (
          <p className="text-sm text-muted-foreground">Keine Benutzer gefunden.</p>
        ) : (
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {profiles.map((profile) => (
              <label
                key={profile.id}
                className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                <Checkbox
                  checked={selectedUserIds.includes(profile.id)}
                  onCheckedChange={() => toggleUser(profile.id)}
                />
                <span className="text-sm font-medium">
                  {profile.display_name}
                  {profile.id === currentUserId && (
                    <span className="ml-1.5 text-xs text-muted-foreground">(Du)</span>
                  )}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Enddatum (optional) */}
      <div className="bg-white rounded-xl border p-4">
        <Label className="mb-3 block">
          Abstimmungs-Enddatum{' '}
          <span className="text-xs text-muted-foreground">(optional)</span>
        </Label>
        <div className="flex items-center gap-2">
          <Popover open={deadlineOpen} onOpenChange={setDeadlineOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[200px] justify-start text-left font-normal">
                <CalendarIcon size={14} className="mr-2 text-muted-foreground" />
                {deadline ? format(deadline, 'd. MMMM yyyy', { locale: de }) : 'Datum wählen'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={deadline ?? undefined}
                onSelect={(date) => {
                  setDeadline(date ?? null)
                  setDeadlineOpen(false)
                }}
                disabled={{ before: new Date() }}
                locale={de}
              />
            </PopoverContent>
          </Popover>
          {deadline && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setDeadline(null)}
              className="text-muted-foreground"
            >
              <X size={14} className="mr-1" />
              Entfernen
            </Button>
          )}
        </div>
        {deadline && (
          <p className="text-xs text-muted-foreground mt-2">
            Abstimmung ist bis einschliesslich{' '}
            <span className="font-medium text-foreground">
              {format(deadline, 'd. MMMM yyyy', { locale: de })}
            </span>{' '}
            möglich.
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <Link href={`/dashboard/polls/${poll.id}`} className="flex-1">
          <Button type="button" variant="outline" className="w-full">
            <ArrowLeft size={14} className="mr-1.5" />
            Abbrechen
          </Button>
        </Link>
        <Button type="submit" className="flex-1" disabled={isLoading}>
          {isLoading ? 'Wird gespeichert...' : 'Änderungen speichern'}
        </Button>
      </div>
    </form>
  )
}
