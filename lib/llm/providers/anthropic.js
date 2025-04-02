import { Generic } from "./generic.js"

const ANTHROPIC_VERSION = '2023-06-01'
const MAX_TOKENS = 1024

export class Anthropic extends Generic {
  constructor(system, {
    model,
    host,
    endpoint,
    apiKey,
    temperature,
    maxTokens = MAX_TOKENS,
  } = args) {
    super(system, args)
    this.system = system
    this.model = model
    this.host = host
    this.endpoint = endpoint
    this.apiKey = apiKey
    this.temperature = temperature
    this.maxTokens = maxTokens
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
      maxTokens: this.maxTokens,
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
