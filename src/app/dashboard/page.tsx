import { createClient } from '@/lib/supabase/server'
import { Flame, FileText, TrendingUp, Sparkles } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const displayName = user?.email?.split('@')[0] || 'there'

  const stats = [
    {
      label: 'Current Streak',
      value: '0',
      unit: 'days',
      icon: Flame,
      color: 'var(--accent-coral)',
      description: 'Start your streak today',
    },
    {
      label: 'Content Published',
      value: '0',
      unit: 'posts',
      icon: FileText,
      color: 'var(--accent-teal)',
      description: 'Ready to create',
    },
    {
      label: 'Engagement',
      value: '—',
      unit: '',
      icon: TrendingUp,
      color: 'var(--accent-amber)',
      description: 'Coming soon',
    },
  ]

  return (
    <div className="space-y-10">
      {/* Welcome header */}
      <header className="animate-fade-in-up">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5" style={{ color: 'var(--accent-coral)' }} />
          <span className="text-sm font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Dashboard
          </span>
        </div>
        <h1
          className="text-4xl font-bold tracking-tight mb-3"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
        >
          Welcome back, {displayName}
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Your building in public journey continues. Let&apos;s make today count.
        </p>
      </header>

      {/* Stats grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.label}
              className={`
                group relative p-6 rounded-2xl overflow-hidden
                transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1
                animate-fade-in-up-delay-${index + 1}
              `}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              {/* Gradient accent at top */}
              <div
                className="absolute top-0 left-0 right-0 h-1 opacity-80"
                style={{ background: `linear-gradient(90deg, ${stat.color}, transparent)` }}
              />

              {/* Icon */}
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110"
                style={{ background: `${stat.color}15` }}
              >
                <Icon className="w-6 h-6" style={{ color: stat.color }} />
              </div>

              {/* Value */}
              <div className="flex items-baseline gap-2 mb-1">
                <span
                  className="text-3xl font-bold"
                  style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
                >
                  {stat.value}
                </span>
                {stat.unit && (
                  <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    {stat.unit}
                  </span>
                )}
              </div>

              {/* Label */}
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                {stat.label}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {stat.description}
              </p>

              {/* Hover glow */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{
                  background: `radial-gradient(circle at 50% 0%, ${stat.color}10, transparent 70%)`
                }}
              />
            </div>
          )
        })}
      </section>

      {/* Empty state / Getting started */}
      <section
        className="relative p-8 rounded-2xl overflow-hidden animate-fade-in-up-delay-3"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        {/* Background pattern */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, var(--text-muted) 1px, transparent 0)`,
            backgroundSize: '24px 24px',
          }}
        />

        <div className="relative text-center max-w-md mx-auto py-8">
          <div
            className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center animate-pulse-subtle"
            style={{
              background: 'linear-gradient(135deg, var(--accent-coral)20, var(--accent-amber)20)',
              border: '1px solid var(--border-default)',
            }}
          >
            <Sparkles className="w-8 h-8" style={{ color: 'var(--accent-coral)' }} />
          </div>

          <h2
            className="text-xl font-semibold mb-3"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
          >
            Ready to start building?
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            Configure your settings to personalize your content generation and start sharing your journey with the world.
          </p>

          <a
            href="/dashboard/settings"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-105 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, var(--accent-coral), var(--accent-coral-hover))',
              color: 'white',
              boxShadow: '0 4px 20px rgba(255, 107, 107, 0.3)',
            }}
          >
            Configure Settings
            <Sparkles className="w-4 h-4" />
          </a>
        </div>
      </section>
    </div>
  )
}
