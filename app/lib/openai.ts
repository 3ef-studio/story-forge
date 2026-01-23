// lib/openai.ts
import OpenAI from 'openai'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Exponential backoff retry logic
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error

      // Check if it's a rate limit error
      if (error instanceof OpenAI.RateLimitError) {
        const delay = baseDelay * Math.pow(2, attempt)
        console.log(`Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }

      // Check if it's a temporary API error
      if (error instanceof OpenAI.APIError && error.status && error.status >= 500) {
        const delay = baseDelay * Math.pow(2, attempt)
        console.log(`API error ${error.status}, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }

      // For other errors, throw immediately
      throw error
    }
  }

  throw lastError
}

// Generate JSON completion with retry logic
export async function generateJSONCompletion(
  systemPrompt: string,
  userPrompt: string,
  options: {
    maxTokens?: number
    temperature?: number
  } = {}
): Promise<string> {
  const { maxTokens = 2000, temperature = 0.7 } = options

  return withRetry(async () => {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      max_tokens: maxTokens,
      temperature,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No content in OpenAI response')
    }

    return content
  })
}

export { openai }
