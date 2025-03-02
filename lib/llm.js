// export async function fetchCompletionLMSTUDIO (system, prompt, model = "meta-llama-3-8b-instruct") {
export async function fetchCompletionLMSTUDIO (system, prompt, model = "meta-llama-3.1-8b-instruct") {
  if (prompt.length > 10000) prompt = prompt.substring(0, 10000)
  try {
    const response = await fetch(`http://127.0.0.1:1234/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        "model": model,
        "messages": [
          {"role": "system", "content": system},
          {"role": "user", "content": prompt}
        ],
        "temperature": 0.9,
        "max_tokens": -1,
        "stream": false,
        // "stop": "\n"
      })
    })
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`)
    }
    const data = await response.json()
    let message = data.choices[data.choices.length - 1]?.message?.content || ''
    message = message.replace('<|eot_id|>', '')
    message = message.split('\n').filter((_, i) => i > 0).join('\n')
    return message
  } catch (error) {
    console.error('Error summarizing text:', error.message)
    return ''
  }
}