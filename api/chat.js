export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
  
    const { OPENAI_API_KEY, OPENAI_ASSISTANT_ID } = process.env;
    const { message } = req.body;
  
    try {
      // 1. Criar um thread com a mensagem do usuário
      const threadRes = await fetch("https://api.openai.com/v1/threads", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
          "OpenAI-Beta": "assistants=v2"
        },
        body: JSON.stringify({
          messages: [
            { role: "user", content: message }
          ]
        })
      });
  
      const thread = await threadRes.json();
  
      // 2. Iniciar um run com o assistant
      const runRes = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
          "OpenAI-Beta": "assistants=v2"
        },
        body: JSON.stringify({
          assistant_id: OPENAI_ASSISTANT_ID
        })
      });
  
      const run = await runRes.json();
  
      // 3. Aguardar run finalizar (loop até "completed")
      let status = "queued";
      while (status !== "completed") {
        const statusRes = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`, {
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "OpenAI-Beta": "assistants=v2"
          }
        });
  
        const statusData = await statusRes.json();
        status = statusData.status;
  
        if (status !== "completed") await new Promise(r => setTimeout(r, 1500));
      }
  
      // 4. Buscar mensagens do assistant
      const messagesRes = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "OpenAI-Beta": "assistants=v2"
        }
      });
  
      const messages = await messagesRes.json();
      const lastMessage = messages.data.reverse().find(msg => msg.role === 'assistant');
  
      res.status(200).json({ reply: lastMessage?.content[0]?.text?.value || "[Sem resposta]" });
  
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Erro no assistant" });
    }
  }
  