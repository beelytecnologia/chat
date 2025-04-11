export default async function handler(req, res) {
    const {
      OPENAI_API_KEY,
      OPENAI_ASSISTANT_ID,
      SUPABASE_URL,
      SUPABASE_KEY,
      SUPABASE_SERVICE_ROLE
    } = process.env;
  
    res.status(200).json({
      OPENAI_API_KEY: !!OPENAI_API_KEY,
      OPENAI_ASSISTANT_ID: !!OPENAI_ASSISTANT_ID,
      SUPABASE_URL: !!SUPABASE_URL,
      SUPABASE_KEY: !!SUPABASE_KEY,
      SUPABASE_SERVICE_ROLE: !!SUPABASE_SERVICE_ROLE
    });
  }
  