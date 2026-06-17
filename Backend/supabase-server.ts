import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

export function createServerSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      //This waits for clerk to return the auth then gets the token using JWT so all db queries are SELECT ... FROM ID = clerks id without exposing the id
      async accessToken() {
        return (await auth()).getToken()
      },
    },
  )
}
