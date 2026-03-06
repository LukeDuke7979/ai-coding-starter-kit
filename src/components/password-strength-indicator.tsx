'use client'

interface PasswordStrengthIndicatorProps {
  password: string
}

function getStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: '' }

  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 1) return { score: 1, label: 'Schwach', color: 'bg-red-400' }
  if (score <= 2) return { score: 2, label: 'Maessig', color: 'bg-orange-400' }
  if (score <= 3) return { score: 3, label: 'Gut', color: 'bg-yellow-400' }
  return { score: 4, label: 'Stark', color: 'bg-emerald-500' }
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const { score, label, color } = getStrength(password)

  if (!password) return null

  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
              level <= score ? color : 'bg-muted'
            }`}
          />
        ))}
      </div>
      <p className={`text-xs ${score >= 4 ? 'text-emerald-600' : score >= 3 ? 'text-yellow-600' : 'text-muted-foreground'}`}>
        Passwortsicherheit: {label}
      </p>
    </div>
  )
}
