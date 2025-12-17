import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardNav from '@/components/dashboard-nav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Noise overlay for texture */}
      <div className="noise-overlay" />

      {/* Sidebar navigation */}
      <DashboardNav userEmail={user.email || 'User'} />

      {/* Main content area */}
      <main className="ml-64 min-h-screen">
        <div className="max-w-5xl mx-auto px-8 py-10">
          {children}
        </div>
      </main>
    </div>
  )
}
