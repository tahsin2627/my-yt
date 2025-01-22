import fs from "fs"
import { getVideoSubtitles } from "./youtube.js"

export async function summarizeVideo(id, repo, callback = () => {}) {
  try {
    const transcript = await getVideoSubtitles(id, callback)
    let cleanedTranscript = cleanTranscript(transcript)
    console.log('cleanedTranscript.length', cleanedTranscript.length)
    repo.setVideoTranscript(id, cleanedTranscript)
    cleanedTranscript = cleanedTranscript.replace('\n', ' ')
    // if (process.env.KEEP_SUBTITLES === 'true') 
    fs.writeFileSync(`./data/videos/${id}-sub.en.txt`, cleanedTranscript)
    
    const prompt = `
Extract the key points from the following video transcript:

${cleanedTranscript.replace('\n', ' ')}`
    // console.log('prompt', prompt)
    const summary = await fetchAIResponseLMSTUDIO(prompt)
    // console.log('summary', summary)
    repo.setVideoSummary(id, summary)

    console.log('Download completed')
  } catch (error) {
    console.error('Error downloading video:', error)
  } 
}
export function cleanTranscript (transcript) {
  return transcript
  .split('\n')
  .map(line => {
    if (/^\d+/.test(line)) return
    line = line.replace(/\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}/g, '')
    return line.replace(/<[^>]+>/g, '').trim()
  }).filter(Boolean).join('\n').trim()
}


async function fetchAIResponseLMSTUDIO (prompt) {
  if (prompt.length > 10000) prompt = prompt.substring(0, 10000)
  try {
    const response = await fetch('http://0.0.0.0:1234/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        "model": "meta-llama-3-8b-instruct",
        "messages": [
          {"role": "system", "content": "You're a helpful assistant that sumarizes a video transcript in max 10 sentences, extracting the key points"},
          {"role": "user", "content": prompt}
        ],
        "temperature": 0.9,
        // "max_tokens": 2000,
        "stream": false,
        // "stop": "\n"
      })
    })
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`)
    }
    const data = await response.json()
    // console.log(JSON.stringify(data, null, 2)) 
    return data.choices[data.choices.length - 1]?.message?.content || ''
  } catch (error) {
    console.error('Error summarizing text:', error)
    return ''
  }
}