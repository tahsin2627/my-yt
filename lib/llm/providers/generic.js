const MAX_PROMPT_LEN = 10000

export class Generic {
  constructor(system, {
    model,
    host,
    endpoint,
    apiKey,
    max_tokens,
  }) {

    this.system = system
    this.headers = Object.assign({
      'Content-Type': 'application/json',
    }, apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {})

    this.settings = {
      model,
      host,
      endpoint,
      apiKey,
      max_tokens
    }
  }

  async summarize(prompt) {
    if (prompt.length > MAX_PROMPT_LEN) prompt = prompt.substring(0, MAX_PROMPT_LEN)

    const body = JSON.stringify({
      model: this.settings.model,
      messages: [
        { role: "system", content: this.system },
        { role: "user", content: prompt }
      ]
    })

    try {
      const response = await fetch(this.settings.host + this.settings.endpoint, {
        method: 'POST',
        headers: this.headers,
        body
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
