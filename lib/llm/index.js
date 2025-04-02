import { Anthropic } from "./providers/anthropic.js"
import { Generic } from "./providers/generic.js"

export async function summarize(
  system,
  prompt,
  llmSettings,
) {
  try {
    let llm
    if (llmSettings.host.includes('api.anthropic.com')) {
      llm = new Anthropic(system, llmSettings)
    } else {
      llm = new Generic(system, llmSettings)
    }

    return await llm.summarize(prompt, llmSettings)
  } catch (e) {
    console.error('Error summarizing video', e.message)
  }
}
