// api/chat.js
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
  
    const { OPENAI_API_KEY } = process.env;
    const { message } = req.body;
  
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          { role: "system", content: "Você é um assistente útil." },
          { role: "user", content: message }
        ]
      })
    });
  
    const data = await response.json();
    res.json({ reply: data.choices[0]?.message?.content || "[Erro na resposta]" });
  }
  