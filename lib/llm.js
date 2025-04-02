import { Anthropic } from "./drivers/anthropic.js"
import { Openai } from "./drivers/openai.js"

export async function fetchCompletionLMSTUDIO(
  system,
  prompt,
  llmSettings,
) {
  try {
    let llm
    if (llmSettings.model.includes('claude')) {
      llm = new Anthropic(system, llmSettings)
    } else {
      llm = new Openai(system, llmSettings)
    }

    return await llm.summarize(prompt, llmSettings)
  } catch (e) {
    console.error('Error summarizing video', e.message)
  }
}
