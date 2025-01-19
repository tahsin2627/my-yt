export function cleanTranscript (transcript) {
  return transcript
  .split('\n')
  .map(line => {
    // if line contains single number
    if (/^\d+/.test(line)) return
    // remove from lines the following pattern: 00:00:06,879 --> 00:00:14,080
    line = line.replace(/\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}/g, '')
    // remove all tags from the line
    return line.replace(/<[^>]+>/g, '').trim()
  }).filter(Boolean).join('\n').trim()
}
