import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { OPENAI_API_KEY, OPENAI_ASSISTANT_ID } = process.env;
  const { message } = req.body;

  console.log("message:", message);
  console.log("envs:", {
    OPENAI_API_KEY: !!OPENAI_API_KEY,
    OPENAI_ASSISTANT_ID: !!OPENAI_ASSISTANT_ID
  });

  try {
    // 1. Salva no Supabase como pendente
    const { data: insertData, error: insertError } = await supabase
      .from('messages')
      .insert({ user_input: message, status: 'pending' })
      .select()
      .single();

    if (insertError) throw insertError;

    // 2. Cria uma thread no Assistant
    const thread = await fetch("https://api.openai.com/v1/threads", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "assistants=v1"
      }
    }).then(res => res.json());

    // 3. Envia a mensagem do usuário
    await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "assistants=v1"
      },
      body: JSON.stringify({ role: "user", content: message })
    });

    // 4. Cria o "run" do assistant
    const run = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "assistants=v1"
      },
      body: JSON.stringify({ assistant_id: OPENAI_ASSISTANT_ID })
    }).then(res => res.json());

    // 5. Atualiza a mensagem com a thread e run ID
    await supabase.from('messages').update({
      thread_id: thread.id,
      run_id: run.id,
      status: 'processing'
    }).eq('id', insertData.id);

    // Retorna apenas o ID da mensagem para polling no frontend
    res.status(200).json({ id: insertData.id });

  } catch (e) {
    console.error("Erro ao processar assistant:", e);
    res.status(500).json({ error: "Erro ao processar assistant." });
  }
}