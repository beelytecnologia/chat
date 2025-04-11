// api/chat.js
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
  
    const { OPENAI_API_KEY, OPENAI_ASSISTANT_ID } = process.env;
    const { message } = req.body;
  
    try {
      const threadRes = await fetch("https://api.openai.com/v1/threads", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
          "OpenAI-Beta": "assistants=v1"
        }
      });
  
      const threadData = await threadRes.json();
  
      const messageRes = await fetch(`https://api.openai.com/v1/threads/${threadData.id}/messages`, {
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
  
      await messageRes.json();
  
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
  
      const run = await runRes.json();
  
      // Espera a execução terminar
      let runStatus;
      do {
        const statusRes = await fetch(`https://api.openai.com/v1/threads/${threadData.id}/runs/${run.id}`, {
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "OpenAI-Beta": "assistants=v1"
          }
        });
        runStatus = await statusRes.json();
        if (runStatus.status !== 'completed') await new Promise(r => setTimeout(r, 1000));
      } while (runStatus.status !== 'completed');
  
      const messagesRes = await fetch(`https://api.openai.com/v1/threads/${threadData.id}/messages`, {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "OpenAI-Beta": "assistants=v1"
        }
      });
  
      const messages = await messagesRes.json();
      const lastMessage = messages.data.reverse().find(msg => msg.role === 'assistant');
  
      res.json({ reply: lastMessage?.content[0]?.text?.value || "[Sem resposta]" });
  
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Erro no assistant" });
    }
  }
  