export async function fetchCompletionLMSTUDIO (
  system, 
  prompt, 
  model = 'meta-llama-3.1-8b-instruct',
  endpoint = 'http://127.0.0.1:1234/v1/chat/completions'
) {
  if (prompt.length > 10000) prompt = prompt.substring(0, 10000)
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
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