export async function fetchCompletionLMSTUDIO (
  system, 
  prompt,
  {
    model,
    host,
    endpoint,
    apiKey
  } = {
    model: 'meta-llama-3.1-8b-instruct', 
    host: 'http://127.0.0.1:1234',
    endpoint: '/v1/chat/completions',
    apiKey: ''
  }
) {
  if (prompt.length > 10000) prompt = prompt.substring(0, 10000)
  try {
    const response = await fetch(host + endpoint, {
      method: 'POST',
      headers: Object.assign({
        'Content-Type': 'application/json'
      }, apiKey ? {'Authorization': `Bearer ${apiKey}`} : {}),
      body: JSON.stringify({
        model,
        messages: [
          {role: "system", content: system},
          {role: "user", content: prompt}
        ],
        temperature: 0.9,
        max_tokens: -1,
        stream: false
      })
    })
    if (!response.ok) { throw new Error(`HTTP error! Status: ${response.status}`) }
    
    const data = await response.json()
    let message = data.choices[data.choices.length - 1]?.message?.content || ''
    message = message.replace('<|eot_id|>', '')
    return message
  } catch (error) {
    console.error('Error summarizing text:', error.message)
    throw error
  }
}