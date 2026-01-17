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
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `
  You are an experienced church communications director.
  You write warm, Christ-centered social media captions that feel welcoming, hopeful, and accessible to both seekers and longtime believers.
  Your writing is concise, natural, and reverent without being preachy.
          `.trim()
        },
        {
          role: "user",
          content: `
  ${prompt.trim()}
  
  STRICT RULES:
  - Generate EXACTLY ONE caption
  - Length must be between 30 and 45 words
  - Use active, inviting language (Join us, Come and experience, Gather with us)
  - Match the requested tone precisely
  - Use subtle biblical allusions only if they sound natural
  - Do NOT use slang or emojis unless platform and tone explicitly allow it
  - Do NOT explain or label the caption
  - Return ONLY the caption text
  
  If you fail any rule, silently rewrite until all rules are satisfied.
          `.trim()
        }
      ],
      max_tokens: 60,
      temperature: 0.8,
      top_p: 1
    });

    const caption = completion.choices[0].message.content.trim();
    res.json({ caption });
  } catch (error) {
    console.error("OpenAI error:", error.message);
    res.status(500).json({ error: "Failed to generate caption. Try again later." });
  }

});

app.listen(PORT, () => {
  console.log(`📡 Caption API running on http://localhost:${PORT}`);
});