import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const {
    OPENAI_API_KEY,
    OPENAI_ASSISTANT_ID
  } = process.env;

  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Mensagem vazia" });
  }

  try {
    // 1. Salva no Supabase
    const { data: saved, error: insertErr } = await supabase
      .from("messages")
      .insert({ user_input: message, status: "pending" })
      .select()
      .single();

    if (insertErr) {
      console.error("Erro ao salvar no Supabase:", insertErr);
      return res.status(500).json({ error: "Erro ao salvar no banco" });
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
    if (!threadData.id) throw new Error("Erro ao criar thread");

    // 3. Envia a mensagem para a thread
    await fetch(`https://api.openai.com/v1/threads/${threadData.id}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "assistants=v1"
      },
      body: JSON.stringify({
        role: "user",
        content: message
      })
    });

    // 4. Cria o run do assistant
    const runRes = await fetch(`https://api.openai.com/v1/threads/${threadData.id}/runs`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "assistants=v1"
      },
      body: JSON.stringify({
        assistant_id: OPENAI_ASSISTANT_ID
      })
    });

    const runData = await runRes.json();
    if (!runData.id) throw new Error("Erro ao iniciar execução");

    // 5. Espera até o status ser "completed"
    let status = "queued";
    while (status !== "completed" && status !== "failed") {
      const checkRes = await fetch(`https://api.openai.com/v1/threads/${threadData.id}/runs/${runData.id}`, {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "OpenAI-Beta": "assistants=v1"
        }
      });
      const statusData = await checkRes.json();
      status = statusData.status;
      if (status !== "completed") await new Promise(r => setTimeout(r, 1000));
    }

    // 6. Busca a resposta
    const msgRes = await fetch(`https://api.openai.com/v1/threads/${threadData.id}/messages`, {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "OpenAI-Beta": "assistants=v1"
      }
    });

    const msgData = await msgRes.json();
    const reply = msgData.data.reverse().find(m => m.role === "assistant");

    const text = reply?.content?.[0]?.text?.value || "[Sem resposta]";

    // 7. Atualiza no Supabase com a resposta
    await supabase
      .from("messages")
      .update({ status: "completed", assistant_reply: text })
      .eq("id", saved.id);

    // 8. Retorna pro frontend
    return res.status(200).json({ reply: text });

  } catch (err) {
    console.error("Erro geral:", err);
    return res.status(500).json({ error: "Erro ao processar assistant" });
  }
}
