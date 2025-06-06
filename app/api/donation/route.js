import { supabase } from '@/lib/supabase'


export async function POST(req) {
  try {
    const body = await req.json();
    const { user_id, name, amount_idr, amount_eth, tx_hash, status } = body;

    const { data, error } = await supabase
      .from('donation')
      .insert([{ user_id, name, amount_idr, amount_eth, tx_hash, status }])
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, data }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, message: err.message }), { status: 500 });
  }
}

export async function GET() {
  const { data, error } = await supabase.from('donation').select('*').order('created_at', { ascending: false });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify(data), { status: 200 });
}

