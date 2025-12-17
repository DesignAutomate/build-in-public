'use client'

import { useState, useEffect } from 'react'
import {
  Building2,
  MessageSquare,
  Users,
  Bell,
  Save,
  Check,
  AlertCircle,
  Loader2,
  Settings,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface UserSettings {
  business_name: string
  business_description: string
  brand_voice: string
  audience_description: string
  audience_interests: string // stored as comma-separated in UI, converted to array for DB
  notification_email: string
}

const defaultSettings: UserSettings = {
  business_name: '',
  business_description: '',
  brand_voice: '',
  audience_description: '',
  audience_interests: '',
  notification_email: '',
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading settings:', error)
      }

      if (data) {
        // Convert audience_interests array to comma-separated string for display
        const interestsArray = data.audience_interests as string[] | null
        const interestsString = interestsArray ? interestsArray.join(', ') : ''

        setSettings({
          business_name: data.business_name || '',
          business_description: data.business_description || '',
          brand_voice: data.brand_voice || '',
          audience_description: data.audience_description || '',
          audience_interests: interestsString,
          notification_email: data.notification_email || user.email || '',
        })
      } else {
        setSettings(prev => ({
          ...prev,
          notification_email: user.email || '',
        }))
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Convert comma-separated interests to array, trimming whitespace
      const interestsArray = settings.audience_interests
        .split(',')
        .map(interest => interest.trim())
        .filter(interest => interest.length > 0)

      const payload = {
        user_id: user.id,
        business_name: settings.business_name,
        business_description: settings.business_description,
        brand_voice: settings.brand_voice,
        audience_description: settings.audience_description,
        audience_interests: interestsArray,
        notification_email: settings.notification_email,
        updated_at: new Date().toISOString(),
      }

      console.log('Saving settings with payload:', payload)

      const { data, error } = await supabase
        .from('user_settings')
        .upsert(payload, {
          onConflict: 'user_id',
        })
        .select()

      if (error) {
        console.error('Supabase error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        })
        throw error
      }

      console.log('Settings saved successfully:', data)
      setMessage({ type: 'success', text: 'Settings saved successfully!' })
      setTimeout(() => setMessage(null), 4000)
    } catch (error) {
      console.error('Error saving settings:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setMessage({ type: 'error', text: `Failed to save settings: ${errorMessage}` })
    } finally {
      setSaving(false)
    }
  }

  const updateField = (field: keyof UserSettings, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2
            className="w-8 h-8 mx-auto mb-4 animate-spin"
            style={{ color: 'var(--accent-coral)' }}
          />
          <p style={{ color: 'var(--text-muted)' }}>Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-10 max-w-4xl">
      {/* Page header */}
      <header className="animate-fade-in-up">
        <div className="flex items-center gap-2 mb-2">
          <Settings className="w-5 h-5" style={{ color: 'var(--accent-coral)' }} />
          <span
            className="text-sm font-medium uppercase tracking-wider"
            style={{ color: 'var(--text-muted)' }}
          >
            Settings
          </span>
        </div>
        <h1
          className="text-4xl font-bold tracking-tight mb-3"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
        >
          Configure Your Profile
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Personalize your content generation with your business details and brand voice.
        </p>
      </header>

      {/* Toast message */}
      {message && (
        <div
          className={`
            flex items-center gap-3 px-5 py-4 rounded-xl animate-fade-in-up
            ${message.type === 'success' ? 'border-l-4' : 'border-l-4'}
          `}
          style={{
            background: message.type === 'success' ? 'rgba(45, 212, 191, 0.1)' : 'rgba(255, 107, 107, 0.1)',
            borderLeftColor: message.type === 'success' ? 'var(--accent-teal)' : 'var(--accent-coral)',
          }}
        >
          {message.type === 'success' ? (
            <Check className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--accent-teal)' }} />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--accent-coral)' }} />
          )}
          <span
            className="text-sm font-medium"
            style={{ color: message.type === 'success' ? 'var(--accent-teal)' : 'var(--accent-coral)' }}
          >
            {message.text}
          </span>
        </div>
      )}

      {/* Settings sections */}
      <div className="space-y-8">
        {/* Section 1: Your Business */}
        <section
          className="p-8 rounded-2xl animate-fade-in-up-delay-1"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
        >
          <div className="flex items-center gap-3 mb-8">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(255, 107, 107, 0.15)' }}
            >
              <Building2 className="w-6 h-6" style={{ color: 'var(--accent-coral)' }} />
            </div>
            <div>
              <h2
                className="text-xl font-semibold"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
              >
                Your Business
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Tell us about what you&apos;re building
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label
                className="block text-sm font-medium mb-3"
                style={{ color: 'var(--text-secondary)' }}
              >
                Business Name
              </label>
              <input
                type="text"
                value={settings.business_name}
                onChange={(e) => updateField('business_name', e.target.value)}
                placeholder="e.g., Acme Studios"
                className="w-full px-5 py-4 rounded-xl text-base transition-all duration-200 focus:ring-2 focus:ring-[var(--accent-coral)]"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-3"
                style={{ color: 'var(--text-secondary)' }}
              >
                Business Description
              </label>
              <textarea
                value={settings.business_description}
                onChange={(e) => updateField('business_description', e.target.value)}
                placeholder="Describe what your business does, your mission, and what makes it unique..."
                rows={4}
                className="w-full px-5 py-4 rounded-xl text-base resize-y transition-all duration-200 focus:ring-2 focus:ring-[var(--accent-coral)] min-h-[120px]"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>
        </section>

        {/* Section 2: Brand Voice */}
        <section
          className="p-8 rounded-2xl animate-fade-in-up-delay-2"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
        >
          <div className="flex items-center gap-3 mb-8">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(45, 212, 191, 0.15)' }}
            >
              <MessageSquare className="w-6 h-6" style={{ color: 'var(--accent-teal)' }} />
            </div>
            <div>
              <h2
                className="text-xl font-semibold"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
              >
                Brand Voice
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Define how you communicate with your audience
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label
                className="block text-sm font-medium mb-3"
                style={{ color: 'var(--text-secondary)' }}
              >
                Brand Voice
              </label>
              <textarea
                value={settings.brand_voice}
                onChange={(e) => updateField('brand_voice', e.target.value)}
                placeholder="e.g., Professional yet approachable, with a touch of humor. We explain complex topics simply and celebrate wins openly..."
                rows={6}
                className="w-full px-5 py-4 rounded-xl text-base resize-y transition-all duration-200 focus:ring-2 focus:ring-[var(--accent-teal)] min-h-[160px]"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-3"
                style={{ color: 'var(--text-secondary)' }}
              >
                Audience Description
              </label>
              <textarea
                value={settings.audience_description}
                onChange={(e) => updateField('audience_description', e.target.value)}
                placeholder="e.g., Indie hackers, startup founders, and developers who want to grow their audience while building products..."
                rows={6}
                className="w-full px-5 py-4 rounded-xl text-base resize-y transition-all duration-200 focus:ring-2 focus:ring-[var(--accent-teal)] min-h-[160px]"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>
        </section>

        {/* Section 3: Audience Interests */}
        <section
          className="p-8 rounded-2xl animate-fade-in-up-delay-3"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
        >
          <div className="flex items-center gap-3 mb-8">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(245, 158, 11, 0.15)' }}
            >
              <Users className="w-6 h-6" style={{ color: 'var(--accent-amber)' }} />
            </div>
            <div>
              <h2
                className="text-xl font-semibold"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
              >
                Audience Interests
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Topics your audience cares about
              </p>
            </div>
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-3"
              style={{ color: 'var(--text-secondary)' }}
            >
              Interests (comma-separated)
            </label>
            <textarea
              value={settings.audience_interests}
              onChange={(e) => updateField('audience_interests', e.target.value)}
              placeholder="e.g., SaaS, product development, growth hacking, remote work, AI tools, indie hacking, bootstrapping"
              rows={4}
              className="w-full px-5 py-4 rounded-xl text-base resize-y transition-all duration-200 focus:ring-2 focus:ring-[var(--accent-amber)] min-h-[120px]"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
              }}
            />
            <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>
              These help generate relevant content ideas for your audience. Separate each interest with a comma.
            </p>
          </div>
        </section>

        {/* Section 4: Notifications */}
        <section
          className="p-8 rounded-2xl animate-fade-in-up-delay-3"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
        >
          <div className="flex items-center gap-3 mb-8">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(255, 107, 107, 0.15)' }}
            >
              <Bell className="w-6 h-6" style={{ color: 'var(--accent-coral)' }} />
            </div>
            <div>
              <h2
                className="text-xl font-semibold"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
              >
                Notifications
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                How we&apos;ll keep you updated
              </p>
            </div>
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-3"
              style={{ color: 'var(--text-secondary)' }}
            >
              Email Address
            </label>
            <input
              type="email"
              value={settings.notification_email}
              onChange={(e) => updateField('notification_email', e.target.value)}
              placeholder="your@email.com"
              className="w-full px-5 py-4 rounded-xl text-base transition-all duration-200 focus:ring-2 focus:ring-[var(--accent-coral)]"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
        </section>
      </div>

      {/* Save button */}
      <div className="flex justify-end pt-6 pb-8">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-3 px-8 py-4 rounded-xl text-base font-semibold transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          style={{
            background: 'linear-gradient(135deg, var(--accent-coral), var(--accent-coral-hover))',
            color: 'white',
            boxShadow: '0 4px 20px rgba(255, 107, 107, 0.3)',
          }}
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Save Settings
            </>
          )}
        </button>
      </div>
    </div>
  )
}
