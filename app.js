const express = require('express');
const { OpenAI } = require('openai');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// ✅ 1. Security & CORS first
app.use(cors()); // Allow all origins (restrict in production)

// ✅ 2. Body parsing next
app.use(express.json({ limit: '1mb' })); // Add limit for safety

// ✅ 3. Rate limiting (applies to /caption only)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many caption requests from this IP, please try again later.',
});
app.use('/caption', limiter);

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Parse JSON bodies
app.use(express.json());

// Basic health check
app.get('/', (req, res) => {
  res.send('✅ AI Caption API is live!');
});

// POST /caption — text-only caption generator
app.post('/caption', async (req, res) => {
  const { prompt } = req.body;

  // Validate input
  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
    return res.status(400).json({ error: 'Please provide a non-empty "prompt" string.' });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a gifted church communications director with 10+ years of experience crafting social media content for diverse congregations. Your voice is warm, grace-filled, and deeply rooted in Scripture—yet accessible to seekers and longtime believers alike.
    
    Generate EXACTLY ONE caption that meets ALL of these criteria:
    ✅ LENGTH: 20–25 words (never shorter, never longer)
    ✅ TONE: Match the user’s specified tone (inspirational/welcoming/joyful/etc.) with Christ-centered hope
    ✅ STYLE: 
       - Use active, inviting language (“Join us…” not “We’re having…”)
       - Weave in subtle biblical allusions only when natural (e.g., “like living water” not John 4:14)
       - NEVER use slang (“lit”, “vibes”), emojis, or hashtags UNLESS:
            • Platform is Instagram/Twitter AND tone is "joyful" → add 1 relevant emoji (🙏✨🙌) AND 1–2 hashtags (#FaithFamily #SundayWorship)
    ✅ PLATFORM RULES:
       - Facebook/LinkedIn: pure text, no symbols
       - Instagram/Twitter: emoji + hashtags ONLY if joyful tone
    ✅ OUTPUT: Return ONLY the caption text. No prefixes, no explanations, no quotation marks.`
        },
        {
          role: 'user',
          content: prompt.trim()
        }
      ],
      max_tokens: 40,
      temperature: 0.6,
      top_p: 0.9
    });


    const caption = completion.choices[0].message.content.trim();
    res.json({ caption });
  } catch (error) {
    console.error('OpenAI error:', error.message);
    res.status(500).json({ error: 'Failed to generate caption. Try again later.' });
  }
});

app.listen(PORT, () => {
  console.log(`📡 Caption API running on http://localhost:${PORT}`);
});