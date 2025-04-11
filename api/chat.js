// api/chat.js
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
  
    const { OPENAI_API_KEY, OPENAI_ASSISTANT_ID } = process.env;
    const { message } = req.body;
  
    try {
      // 1. Cria thread
      const threadRes = await fetch("https://api.openai.com/v1/threads", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
          "OpenAI-Beta": "assistants=v1"
        }
      });
  
      const thread = await threadRes.json();
  
      // 2. Envia mensagem
      await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
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
  
      // 3. Roda assistant
      const runRes = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
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
  
      const run = await runRes.json();
  
      // 4. Espera a resposta
      let runStatus;
      do {
        const statusRes = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`, {
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "OpenAI-Beta": "assistants=v1"
          }
        });
  
        runStatus = await statusRes.json();
        if (runStatus.status !== 'completed') await new Promise(r => setTimeout(r, 1000));
      } while (runStatus.status !== 'completed');
  
      // 5. Busca resposta
      const messagesRes = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "OpenAI-Beta": "assistants=v1"
        }
      });
  
      const messages = await messagesRes.json();
      const lastMessage = messages.data.reverse().find(m => m.role === "assistant");
  
      res.status(200).json({ reply: lastMessage?.content[0]?.text?.value || "[Sem resposta]" });
  
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Erro no assistant" });
    }
  }
  