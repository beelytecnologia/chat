export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
  
    const { OPENAI_API_KEY, OPENAI_ASSISTANT_ID } = process.env;
    const { message } = req.body;
  
    try {
      // 1. Cria thread
      const thread = await fetch("https://api.openai.com/v1/threads", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
          "OpenAI-Beta": "assistants=v1"
        }
      }).then(res => res.json());
  
      // 2. Envia mensagem
      await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
          "OpenAI-Beta": "assistants=v1"
        },
        body: JSON.stringify({ role: "user", content: message })
      });
  
      // 3. Roda o assistant
      const run = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
          "OpenAI-Beta": "assistants=v1"
        },
        body: JSON.stringify({ assistant_id: OPENAI_ASSISTANT_ID })
      }).then(res => res.json());
  
      // 4. Espera o processamento (polling)
      let status = null;
      do {
        const check = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`, {
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "OpenAI-Beta": "assistants=v1"
          }
        }).then(res => res.json());
  
        status = check.status;
        if (status !== "completed") await new Promise(r => setTimeout(r, 1000));
      } while (status !== "completed");
  
      // 5. Busca a última mensagem
      const messagesRes = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "OpenAI-Beta": "assistants=v1"
        }
      }).then(res => res.json());
  
      const last = messagesRes.data.reverse().find(msg => msg.role === "assistant");
      res.status(200).json({ reply: last?.content[0]?.text?.value || "[Sem resposta]" });
  
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Erro ao processar assistant." });
    }
  }
  