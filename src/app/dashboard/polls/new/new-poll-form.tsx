'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { ArrowLeft, CalendarIcon, X } from 'lucide-react'

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

interface NewPollFormProps {
  currentUserId: string
  profiles: Profile[]
}

export function NewPollForm({ currentUserId, profiles }: NewPollFormProps) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [deadline, setDeadline] = useState<Date | null>(null)
  const [deadlineOpen, setDeadlineOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleUser(userId: string) {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
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
    if (deadline && deadline < new Date(new Date().setHours(0, 0, 0, 0))) {
      setError('Das Enddatum muss in der Zukunft liegen.')
      return
    }

    setIsLoading(true)
    const supabase = createClient()

    // Atomare Erstellung via PostgreSQL-RPC-Funktion (echte DB-Transaktion)
    const { data: pollId, error: rpcError } = await supabase.rpc('create_poll', {
      p_title: title.trim(),
      p_location: location.trim(),
      p_description: description.trim(),
      p_deadline: deadline ? format(deadline, 'yyyy-MM-dd') : null,
      p_dates: selectedDates.map((d) => format(d, 'yyyy-MM-dd')),
      p_user_ids: selectedUserIds,
    })

    if (rpcError || !pollId) {
      setError(`Umfrage konnte nicht erstellt werden: ${rpcError?.message ?? 'Unbekannter Fehler'}`)
      setIsLoading(false)
      return
    }

    router.push(`/dashboard/polls/${pollId}`)
  }

  const sortedSelected = [...selectedDates].sort((a, b) => a.getTime() - b.getTime())

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
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
            {sortedSelected.map((date) => (
              <span
                key={date.toISOString()}
                className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-medium"
              >
                {format(date, 'EEE, d. MMM', { locale: de })}
              </span>
            ))}
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
        <Link href="/dashboard" className="flex-1">
          <Button type="button" variant="outline" className="w-full">
            <ArrowLeft size={14} className="mr-1.5" />
            Abbrechen
          </Button>
        </Link>
        <Button type="submit" className="flex-1" disabled={isLoading}>
          {isLoading ? 'Wird erstellt...' : 'Umfrage erstellen'}
        </Button>
      </div>
    </form>
  )
}
