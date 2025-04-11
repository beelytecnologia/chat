// api/chat.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Mensagem vazia' });

  const { data, error } = await supabase
    .from('messages')
    .insert({ user_input: message, status: 'pending' })
    .select()
    .single();

  if (error) {
    console.error('Erro ao salvar no Supabase:', error);
    return res.status(500).json({ error: 'Erro ao salvar no Supabase' });
  }

  return res.status(200).json({ id: data.id });
}
