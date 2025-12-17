'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  FolderKanban,
  CalendarCheck,
  FileText,
  Settings,
  LogOut,
  Sparkles,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/projects', label: 'Projects', icon: FolderKanban },
  { href: '/dashboard/check-in', label: 'Check-in', icon: CalendarCheck },
  { href: '/dashboard/content', label: 'Content', icon: FileText },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

interface DashboardNavProps {
  userEmail: string
}

export default function DashboardNav({ userEmail }: DashboardNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.startsWith(href)
  }

  return (
    <nav className="fixed left-0 top-0 h-full w-64 flex flex-col"
         style={{ background: 'var(--bg-secondary)' }}>
      {/* Branding */}
      <div className="p-6 pb-8">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg, var(--accent-coral), var(--accent-amber))' }}>
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="absolute -inset-1 rounded-xl opacity-0 group-hover:opacity-30 blur-md transition-opacity duration-300"
                 style={{ background: 'var(--accent-coral)' }} />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
              Build in Public
            </h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Share your journey
            </p>
          </div>
        </Link>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 px-3">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
                  transition-all duration-200 group relative overflow-hidden
                  ${active
                    ? 'text-white'
                    : 'hover:bg-white/5'
                  }
                `}
                style={{
                  color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  background: active ? 'var(--bg-card)' : 'transparent',
                }}
              >
                {/* Active indicator bar */}
                {active && (
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full"
                    style={{ background: 'var(--accent-coral)' }}
                  />
                )}

                <Icon
                  className={`w-5 h-5 transition-transform duration-200 ${!active && 'group-hover:scale-110'}`}
                  style={{ color: active ? 'var(--accent-coral)' : 'inherit' }}
                />
                <span>{item.label}</span>

                {/* Hover glow effect */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{
                    background: 'radial-gradient(circle at 30% 50%, rgba(255, 107, 107, 0.05), transparent 70%)'
                  }}
                />
              </Link>
            )
          })}
        </div>
      </div>

      {/* User section */}
      <div className="p-4 mx-3 mb-4 rounded-xl" style={{ background: 'var(--bg-elevated)' }}>
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold uppercase"
            style={{
              background: 'linear-gradient(135deg, var(--accent-teal), var(--accent-coral))',
              color: 'white'
            }}
          >
            {userEmail.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="text-sm font-medium truncate"
              style={{ color: 'var(--text-primary)' }}
            >
              {userEmail}
            </p>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: 'var(--bg-card)',
            color: 'var(--text-secondary)',
          }}
        >
          <LogOut className="w-4 h-4" />
          <span>Sign out</span>
        </button>
      </div>
    </nav>
  )
}
