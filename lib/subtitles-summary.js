/* eslint-disable no-async-promise-executor */
import fs from 'fs'
import { getVideoSubtitles } from './youtube.js'
import * as llm from './llm/index.js'
import retry from './retry-promise.js'

export async function summarizeVideo (id, repo, llmSettings = {}, callback = () => {}) {
  return retry(() => new Promise(async (resolve, reject) => {
    try {
      const transcript = await getVideoSubtitles(id, callback)
      let cleanedTranscript = cleanTranscript(transcript)
      repo.setVideoTranscript(id, cleanedTranscript)
      cleanedTranscript = cleanedTranscript.replace('\n', ' ')
      fs.writeFileSync(`./data/videos/${id}.en.txt`, cleanedTranscript)
      callback(null, 'prompting llm') // eslint-disable-line

      const userPrompt = `
Extract the key points from the following video transcript:

${cleanedTranscript}`.trim()

      const systemPrompt = `Summarize this video given its subtitles into increasing levels of conciseness. 
Begin by summarizing it into a single paragraph, followed by a longer summary that expands on the key points.
Do not describe or mention the video itself. Simply summarize the points it makes. Focus on the overall or underlying takeaway, cause, reason.`
      const summary = await llm.summarize(systemPrompt, userPrompt, llmSettings)
      callback(null, 'received summary') // eslint-disable-line
      repo.setVideoSummary(id, summary)
      resolve({ summary, transcript: cleanedTranscript })
    } catch (error) {
      console.error(`Error summarizing video ${id}: ${error.message}`)
      callback(error, `Error summarizing video ${id}: ${error.message}`)
      reject(error)
    }
  }))
}
export function cleanTranscript (transcript) {
  const lines = []
  for (let line of transcript.split('\n')) {
    line = line.trim()
    if (/^\d+/.test(line)) continue
    if (line.match(/^\d+:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}/)) continue
    if (lines.length === 0 || !lines[lines.length - 1].startsWith(line)) {
      lines.push(line)
    }
  }
  return lines.filter(Boolean).join('\n').trim()
}
