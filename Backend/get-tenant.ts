import { auth, currentUser } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/Backend/supabase-server'

export async function getOrCreateTenant() {
  const { userId } = await auth()
  if (!userId) throw new Error('Not authenticated')

  const supabase = createServerSupabaseClient()

  const { data: existing, error: selErr } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  if (selErr) throw selErr
  if (existing) return existing

  const user = await currentUser()
  const { data: created, error: insErr } = await supabase
    .from('tenants')
    .insert({
      business_name: 'My business',
      contact_email: user?.primaryEmailAddress?.emailAddress ?? null,
    })
    .select()
    .single()

  if (insErr) {
    if (insErr.code === '23505') {
      const { data } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', userId)
        .single()
      return data
    }
    throw insErr
  }
  return created
}
