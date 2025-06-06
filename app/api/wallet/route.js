import { supabase } from '@/lib/supabase'

export async function POST(request) {
  const body = await request.json()
  const { private_key, user_id } = body

  if (!private_key || !user_id) {
    return Response.json(
      { error: 'private_key dan user_id wajib diisi' },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('wallet')
    .insert([{ private_key, user_id }])
    .select()
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json(data, { status: 201 })
}

export async function GET() {
  const { data, error } = await supabase.from('wallet').select('*');

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify(data), { status: 200 });
}