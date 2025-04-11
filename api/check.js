import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  const { id } = req.query;
console.log(id)
  const { data, error } = await supabase
    .from('messages')
    .select('reply')
    .eq('id', id)
    .single();

  if (error) return res.status(500).json({ error: "Erro ao buscar resposta" });

  res.status(200).json({ reply: data.reply });
}
