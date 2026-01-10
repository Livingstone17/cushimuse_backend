// server.js
const express = require('express');
const { OpenAI } = require('openai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;


//  rate-limiting code 
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
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
          content: `
    You are a compassionate and creative church communications assistant.
    
    Your task is to generate ONE short social media caption (maximum 20 words) based on the user's description.
    
    Guidelines:
    - Use warm, inclusive, Christ-centered language.
    - Keep the tone uplifting, hopeful, and reverent.
    - Avoid secular slang or overly casual phrasing.
    - Include a subtle biblical reference only when it fits naturally (e.g., "Psalm 23", no full verse quotes).
    - Platform rules:
      • Instagram or Twitter: you may add 1 emoji and up to 2 relevant hashtags if the tone is joyful.
      • Facebook or LinkedIn: no hashtags, no emojis.
    - Never mention the word "church" unless the user explicitly does.
    - If platform or tone is unclear, default to Instagram with a joyful tone and no hashtags.
    
    Output rules:
    - Return only the caption text.
    - No explanations, no quotes, no extra lines.
    `
        },
        {
          role: 'user',
          content: prompt.trim()
        }
      ],
      max_tokens: 30,
      temperature: 0.7
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