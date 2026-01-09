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
          content: 'You are a creative social media assistant. Generate one short, engaging caption (under 20 words) based on the user\'s description. No hashtags unless asked. Be fun, witty, or poetic.'
        },
        {
          role: 'user',
          content: prompt.trim()
        }
      ],
      max_tokens: 30, // keeps it short
      temperature: 0.8, // encourages creativity
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