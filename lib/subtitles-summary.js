import fs from "fs"
import { getVideoSubtitles } from "./youtube.js"
import { fetchCompletionLMSTUDIO } from "./llm.js"

export async function summarizeVideo(id, repo, callback = () => {}) {
  return new Promise(async (resolve, reject) => {
    try {
      const transcript = await getVideoSubtitles(id, callback)
      let cleanedTranscript = cleanTranscript(transcript)
      console.log('cleanedTranscript.length', cleanedTranscript.length)
      repo.setVideoTranscript(id, cleanedTranscript)
      cleanedTranscript = cleanedTranscript.replace('\n', ' ')
      fs.writeFileSync(`./data/videos/${id}.en.txt`, cleanedTranscript)
      
      const userPrompt = `
    Extract the key points from the following video transcript:
    
    ${cleanedTranscript.replace('\n', ' ')}`
      const systemPrompt = "You're a helpful assistant that sumarizes a video transcript in max 10 sentences, extracting the key points"
      const summary = await fetchCompletionLMSTUDIO(systemPrompt, userPrompt)
      repo.setVideoSummary(id, summary)
    
      console.log('Download completed', summary)
      resolve({summary, transcript: cleanedTranscript})
    } catch (error) {
      console.error('Error summarizing video', id)
      reject(error)
    }
  })
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


