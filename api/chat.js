// /api/chat.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { OPENAI_API_KEY, OPENAI_ASSISTANT_ID } = process.env;
  const { message } = req.body;

  if (!OPENAI_API_KEY || !OPENAI_ASSISTANT_ID || !message) {
    return res.status(400).json({ error: "Variáveis ou mensagem ausente." });
  }

  try {
    // 1. Salva no Supabase com status "pending"
    const { data, error } = await supabase
      .from('messages')
      .insert({ user_input: message, status: 'pending' })
      .select()
      .single();

    if (error) {
      console.error("Erro Supabase:", error);
      return res.status(500).json({ error: "Erro ao salvar no Supabase." });
    }

    // 2. Cria a thread
    const threadRes = await fetch("https://api.openai.com/v1/threads", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "assistants=v1"
      }
    });
    const threadData = await threadRes.json();

    // 3. Atualiza a row com o thread_id
    await supabase
      .from('messages')
      .update({ thread_id: threadData.id })
      .eq('id', data.id);

    // 4. Retorna ID para o frontend fazer polling depois
    res.status(200).json({ id: data.id });

  } catch (e) {
    console.error("Erro geral:", e);
    res.status(500).json({ error: "Erro interno ao processar mensagem." });
  }
}
