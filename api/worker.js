import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID;

async function runAssistant(threadId, userMessage) {
  // 1. Envia mensagem
  await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v1'
    },
    body: JSON.stringify({ role: 'user', content: userMessage })
  });

  // 2. Roda o assistant
  const runRes = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v1'
    },
    body: JSON.stringify({ assistant_id: OPENAI_ASSISTANT_ID })
  });
  const run = await runRes.json();

  // 3. Espera
  let status;
  do {
    const check = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${run.id}`, {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'OpenAI-Beta': 'assistants=v1'
      }
    }).then(res => res.json());
    status = check.status;
    if (status !== 'completed') await new Promise(r => setTimeout(r, 1000));
  } while (status !== 'completed');

  // 4. Busca a resposta
  const messages = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'OpenAI-Beta': 'assistants=v1'
    }
  }).then(res => res.json());

  const last = messages.data.reverse().find(msg => msg.role === 'assistant');
  return last?.content[0]?.text?.value || '[Sem resposta]';
}

async function processPendingMessages() {
  const { data: pending } = await supabase
    .from('messages')
    .select('*')
    .eq('status', 'pending');

  for (const msg of pending) {
    try {
      const thread = await fetch("https://api.openai.com/v1/threads", {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v1'
        }
      }).then(res => res.json());

      const reply = await runAssistant(thread.id, msg.user_input);

      await supabase.from('messages').update({
        reply,
        status: 'completed'
      }).eq('id', msg.id);
    } catch (e) {
      console.error("Erro ao processar:", e);
      await supabase.from('messages').update({
        reply: '[Erro ao processar]',
        status: 'error'
      }).eq('id', msg.id);
    }
  }
}

await processPendingMessages();
