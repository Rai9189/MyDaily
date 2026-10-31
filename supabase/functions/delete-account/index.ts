import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const ATTACHMENT_URL_MARKER = '/object/public/attachments/'

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verifikasi user dari token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // A stolen session alone must not be enough to destroy the account.
    const { password } = await req.json().catch(() => ({}))
    const { error: passwordError } = typeof password === 'string' && user.email
      ? await createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_ANON_KEY')!,
          { auth: { persistSession: false } }
        ).auth.signInWithPassword({ email: user.email, password })
      : { error: new Error('Password required') }

    if (passwordError) {
      return new Response(
        JSON.stringify({ error: 'Incorrect password' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Hapus avatar: path lama avatars/{id}.{ext}, path baru {id}/avatar.{ext}
    const { data: avatars } = await supabaseAdmin.storage.from('avatars').list(user.id)
    await supabaseAdmin.storage.from('avatars').remove([
      ...['jpg', 'jpeg', 'png', 'webp'].map(ext => `avatars/${user.id}.${ext}`),
      ...(avatars ?? []).map(file => `${user.id}/${file.name}`),
    ])

    // Cascade hanya menghapus baris tabel, jadi file lampiran dihapus lebih dulu
    const { data: attachments } = await supabaseAdmin
      .from('attachments')
      .select('url')
      .eq('user_id', user.id)

    const attachmentPaths = (attachments ?? []).flatMap(({ url }) => {
      const idx = url.indexOf(ATTACHMENT_URL_MARKER)
      return idx === -1 ? [] : [decodeURIComponent(url.slice(idx + ATTACHMENT_URL_MARKER.length))]
    })
    if (attachmentPaths.length > 0) {
      await supabaseAdmin.storage.from('attachments').remove(attachmentPaths)
    }

    // Hapus user — cascade delete akan hapus semua data terkait
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)

    if (deleteError) {
      return new Response(
        JSON.stringify({ error: deleteError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
