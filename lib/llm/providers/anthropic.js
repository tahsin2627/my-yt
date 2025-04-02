import { Generic } from "./generic.js"

const ANTHROPIC_VERSION = '2023-06-01'
const MAX_PROMPT_LEN = 10000
const MAX_TOKENS = 1024

export class Anthropic extends Generic {
  constructor(system, {
    model,
    host,
    endpoint,
    apiKey,
    temperature,
    max_tokens = MAX_TOKENS,
  } = args) {
    super(system, args)
    this.system = system
    this.model = model
    this.host = host
    this.endpoint = endpoint
    this.apiKey = apiKey
    this.temperature = temperature
    this.max_tokens = max_tokens
  }

  getHeaders () {
    return {
      'Content-Type': 'application/json',
      'anthropic-version': ANTHROPIC_VERSION,
      'x-api-key': this.apiKey
    }
  }

  getBody (prompt) {
    return JSON.stringify({
      model: this.model,
      temperature: Number(this.temperature),
      system: this.system,
      max_tokens: this.max_tokens,
      messages: [
        { role: "user", content: prompt }
      ]
    })
  }

  getMessage (data) {
    const messages = data?.content || []
    const message = messages[messages.length - 1].text || ''
    return message.replace('<|eot_id|>', '')
  }
}
