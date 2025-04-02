const ANTHROPIC_VERSION = '2023-06-01'
const MAX_PROMPT_LEN = 10000
const MAX_TOKENS = 1024

export class Anthropic {
  constructor(system, {
      model,
      host,
      apiKey,
      temperature,
      max_tokens = MAX_TOKENS,
    }) {

    this.system = system
    const auth = apiKey ? { 'x-api-key': apiKey } : {}
    this.headers = Object.assign({
      'Content-Type': 'application/json',
      'anthropic-version': ANTHROPIC_VERSION,
    }, auth)

    this.settings = {
      temperature,
      model,
      host,
      apiKey,
      max_tokens
    }
  }

  async summarize(prompt, { endpoint }) {
    if (prompt.length > MAX_PROMPT_LEN) prompt = prompt.substring(0, MAX_PROMPT_LEN)

    const body = JSON.stringify({
      model: this.settings.model,
      temperature: Number(this.settings.temperature),
      system: this.system,
      max_tokens: this.settings.max_tokens,
      messages: [
        { role: "user", content: prompt }
      ]
    })

    try {
      const response = await fetch(this.settings.host + endpoint, {
        method: 'POST',
        headers: this.headers,
        body
      })

      const data = await response.json()
      if (!response.ok) {
        console.error(data)
        throw new Error(`HTTP error! Status: ${response.status}`)
      }

      const messages = data?.content || []
      let message = messages[messages.length - 1].text || ''

      message = message.replace('<|eot_id|>', '')
      return message
    } catch (error) {
      console.error('Error summarizing text:', error)
      throw error
    }
  }
}
