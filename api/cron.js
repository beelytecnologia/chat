// api/cron.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID;

async function runAssistant(threadId, userMessage) {
  await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v1'
    },
    body: JSON.stringify({ role: 'user', content: userMessage })
  });

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

  const messages = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'OpenAI-Beta': 'assistants=v1'
    }
  }).then(res => res.json());

  const last = messages.data.reverse().find(msg => msg.role === 'assistant');
  return last?.content[0]?.text?.value || '[Sem resposta]';
}

export default async function handler(req, res) {
  const { data: pendings } = await supabase.from('messages').select('*').eq('status', 'pending');

  for (const msg of pendings) {
    try {
      const thread = await fetch(`https://api.openai.com/v1/threads`, {
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
      await supabase.from('messages').update({
        status: 'error',
        reply: '[Erro ao processar]'
      }).eq('id', msg.id);
    }
  }

  res.status(200).json({ ok: true });
}
