export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).end();
  
    const {
      OPENAI_API_KEY,
      OPENAI_ASSISTANT_ID,
      SUPABASE_URL,
      SUPABASE_KEY
    } = process.env;
  
    res.status(200).json({
      OPENAI_API_KEY: !!OPENAI_API_KEY,
      OPENAI_ASSISTANT_ID: !!OPENAI_ASSISTANT_ID,
      SUPABASE_URL: !!SUPABASE_URL,
      SUPABASE_KEY: !!SUPABASE_KEY
    });
  }
  