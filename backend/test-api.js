require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');

console.log('API Key loaded:', process.env.ANTHROPIC_API_KEY ? 'YES' : 'NO');
console.log('API Key starts with:', process.env.ANTHROPIC_API_KEY?.substring(0, 20));

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function test() {
  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 100,
      messages: [{
        role: 'user',
        content: 'Say hello in one word'
      }]
    });
    console.log('✅ Claude API works!');
    console.log('Response:', message.content[0].text);
  } catch (error) {
    console.error('❌ Claude API error:', error.message);
  }
}

test();
