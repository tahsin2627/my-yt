const MAX_PROMPT_LEN = 10000

export class Generic {
  constructor(system, {
    model,
    host,
    endpoint,
    apiKey,
    temperature,
    max_tokens,
  }) {
    this.system = system
    this.model = model
    this.host = host
    this.endpoint = endpoint
    this.apiKey = apiKey
    this.temperature = temperature
    this.max_tokens = max_tokens
  }

  getHeaders () {
    console.log('this headers called - generic')
    return Object.assign({
      'Content-Type': 'application/json',
    }, this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {})
  }

  getBody (prompt) {
    return JSON.stringify({
      model: this.model,
      temperature: Number(this.temperature),
      messages: [
        { role: "system", content: this.system },
        { role: "user", content: prompt }
      ]
    })
  }

  async summarize(prompt) {
    if (prompt.length > MAX_PROMPT_LEN) prompt = prompt.substring(0, MAX_PROMPT_LEN)

    try {
      const response = await fetch(this.host + this.endpoint, {
        method: 'POST',
        headers: this.getHeaders(),
        body: this.getBody(prompt)
      })

      const data = await response.json()
      if (!response.ok) {
        console.error(data)
        throw new Error(`HTTP error! Status: ${response.status}`)
      }

      let message = data.choices[data.choices.length - 1]?.message?.content || ''
      message = message.replace('<|eot_id|>', '')
      return message
    } catch (error) {
      console.error('Error summarizing text:', error)
      throw error
    }
  }
}
