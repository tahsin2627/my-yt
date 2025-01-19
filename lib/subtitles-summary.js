import fs from "fs"
import { getVideoSubtitles } from "./youtube.js"

export async function summarizeVideo(id, repo, callback = () => {}) {
  try {
    const transcript = await getVideoSubtitles(id, callback)
    let cleanedTranscript = cleanTranscript(transcript)
    console.log('cleanedTranscript.length', cleanedTranscript.length)
    repo.setVideoTranscript(id, cleanedTranscript)
    fs.writeFileSync(`./data/videos/${id}-sub.en.txt`, cleanedTranscript)
    
    const prompt = `Summarize the following video transcript, in max 10 sentences, keep it short, don't repeat yourself:\n${cleanedTranscript}`
    console.log('prompt', prompt)
    const summary = await fetchAIResponseLMSTUDIO(prompt)
    console.log('summary', summary)
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
  if (prompt.length > 5000) prompt = prompt.substring(0, 5000)
  try {
    const response = await fetch('http://localhost:1234/v1/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        "model": "llama-3.2-3b-instruct",
        "prompt": prompt,
        "temperature": 0.9,
        "max_tokens": 1000,
        "stream": false,
        // "stop": "\n"
      })
    })
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`)
    }
    const data = await response.json()
    console.log(data) 
    return data.choices[data.choices.length - 1]?.text
  } catch (error) {
    console.error('Error summarizing text:', error)
  }
}

/*
async function fetchAIResponseOLLAMA (prompt) {
  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        "model": "llama3.2",
        "prompt": prompt,
        "stream": false
      })
    })
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`)
    }
    const data = await response.json()
    // console.log(data)
    return data
  } catch (error) {
    console.error('Error summarizing text:', error)
  }
}
*/