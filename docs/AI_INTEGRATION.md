# 🤖 AI Integration Guide

## Overview

The Gift Discovery service now includes **AI-generated gift explanations** powered by OpenAI's GPT-4o-mini. When enabled, the recommendation API will include personalized explanations for why each product is a great gift match.

## Setup

### 1. Get an OpenAI API Key

1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create an account or sign in
3. Generate a new API key
4. Copy the key (starts with `sk-...`)

### 2. Configure Environment

Add your API key to the `.env` file:

```bash
OPENAI_API_KEY=sk-your-actual-api-key-here
```

> [!IMPORTANT]
> The service works perfectly fine **without** the OpenAI API key. If not provided, recommendations will be returned without AI explanations (graceful degradation).

## How It Works

### AI Explanation Generation

When a user requests recommendations:

1. **Scoring**: Products are scored using the heuristic algorithm
2. **Ranking**: Top N products are selected based on scores
3. **AI Enhancement**: For the top 5 products, OpenAI generates personalized explanations
4. **Response**: Recommendations include both scores and AI explanations

### Example Response (With AI Enabled)

```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "title": "Gaming Keyboard RGB",
      "price": 89.99,
      "score": 40,
      "scoreBreakdown": {
        "interestMatch": 20,
        "budgetOptimization": 5,
        "occasionMatch": 0,
        "learningBoost": 15
      },
      "aiExplanation": "This gaming keyboard is perfect for your tech-savvy friend who loves gaming! With customizable RGB lighting and mechanical switches, it matches their interests perfectly and fits comfortably within your $100 budget. Based on their browsing history showing a preference for electronics, this would make an excellent birthday gift."
    }
  ]
}
```

### Example Response (Without AI)

```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "title": "Gaming Keyboard RGB",
      "price": 89.99,
      "score": 40,
      "scoreBreakdown": {
        "interestMatch": 20,
        "budgetOptimization": 5,
        "occasionMatch": 0,
        "learningBoost": 15
      },
      "aiExplanation": null
    }
  ]
}
```

## Cost Optimization

### Strategies Implemented

1. **Top-N Only**: AI explanations are generated only for the top 5 products
2. **Compact Model**: Uses `gpt-4o-mini` for cost efficiency (~$0.15 per 1M input tokens)
3. **Token Limits**: Explanations are capped at 150 tokens (2-3 sentences)
4. **Graceful Degradation**: If AI fails, recommendations still work
5. **Batch Processing**: Multiple explanations are generated in parallel

### Estimated Costs

Assuming 100-150 tokens per explanation:

- **Per recommendation request**: ~$0.0001 (top 5 products)
- **1,000 requests**: ~$0.10
- **10,000 requests**: ~$1.00

## Testing AI Explanations

### Test with API Key

```bash
# Set your API key
export OPENAI_API_KEY="sk-your-key-here"

# Start the server
npm run dev

# Request recommendations
curl -X POST http://localhost:3000/api/recommendations \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "budget": 100,
    "interests": ["tech", "gaming"],
    "occasion": "birthday"
  }'
```

### Test without API Key

```bash
# Don't set OPENAI_API_KEY in .env

# Start the server
npm run dev

# Request recommendations (will work but aiExplanation will be null)
curl -X POST http://localhost:3000/api/recommendations \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "budget": 100,
    "interests": ["tech", "gaming"]
  }'
```

## Technical Details

### AI Service Architecture

```typescript
// src/services/ai.service.ts
- generateGiftExplanation() // Single product explanation
- generateBatchExplanations() // Multiple products (parallel)
- isAIEnabled() // Check if OpenAI is configured
```

### Prompt Engineering

The AI service constructs prompts that include:
- Product details (title, description, price)
- User preferences (interests, budget, age, occasion)
- Scoring breakdown (why the product scored well)

This context helps the AI generate relevant, personalized explanations.

### Error Handling

- **API Errors**: Caught and logged, service continues without AI
- **Invalid Keys**: Service detects at startup, disables AI gracefully
- **Rate Limits**: Errors are logged, recommendations still returned
- **Network Issues**: Timeouts handled, no impact on core functionality

## Monitoring

### Check AI Status

```bash
# View server logs
npm run dev

# Look for:
# ✅ "AI explanations enabled" (if key is valid)
# ℹ️  "AI explanations disabled" (if no key provided)
```

### Debug AI Errors

```bash
# Check console for:
# "Error generating AI explanation: ..."
```

Common issues:
- Invalid API key
- Insufficient credits
- Rate limit exceeded
- Network connectivity

## Production Recommendations

### Environment Variables

```bash
# Production .env
OPENAI_API_KEY=sk-prod-key-here
NODE_ENV=production
```

### Rate Limiting

Consider implementing additional rate limiting for AI calls:
- Per-user limits
- Daily quotas
- Caching of explanations

### Monitoring

Set up alerts for:
- OpenAI API errors
- High API costs
- Response time increases

### Feature Flags

Consider adding a feature flag to enable/disable AI per user or request:

```typescript
if (params.enableAI && aiService.isAIEnabled()) {
  // Generate explanations
}
```

## Future Enhancements

- [ ] Cache AI explanations to reduce API calls
- [ ] A/B test AI vs. non-AI recommendations
- [ ] User feedback on AI explanation quality
- [ ] Fine-tuned model for gift recommendations
- [ ] Multi-language support

---

**🤖 AI integration is now complete and ready to use!**
