import fs from 'fs'
import spawn from 'nano-spawn'

const subtitlesYTDLPArgs = `--write-subs --write-auto-subs --sub-format vtt --convert-subs srt -k`
const videoYTDLPArgs = quality => `--concurrent-fragments 5 --newline --progress --progress-delta 1 --merge-output-format webm/mp4 -f bestvideo[height<=${quality}]+bestaudio/best[height<=${quality}] --sponsorblock-remove sponsor --embed-metadata`

export function video(id, quality) {
  const cookiesPath = getOptionalCookiesPath()
  let cookiesOption = cookiesPath ? `--cookies ${cookiesPath}` : ''
  const commandArgs = `-o ./data/videos/${id}.%(ext)s ${cookiesOption} ${videoYTDLPArgs(quality)} ${subtitlesYTDLPArgs} -- ${id}`.split(/ +/)
  console.log('running yt-dlp', commandArgs.join(' '))
  return spawn('yt-dlp', commandArgs)
}
export function subtitles(id) {
  const cookiesPath = getOptionalCookiesPath()
  let cookiesOption = cookiesPath ? `--cookies ${cookiesPath}` : ''
  const commandArgs = `-o ./data/videos/${id} --skip-download ${cookiesOption} ${subtitlesYTDLPArgs} -- ${id}`.split(/ +/)
  console.log('running yt-dlp', commandArgs.join(' '))
  return spawn('yt-dlp', commandArgs)
}

function getOptionalCookiesPath() {
  if (fs.existsSync('/app/cookies.txt')) return '/app/cookies.txt'
  if (fs.existsSync('./cookies.txt')) return './cookies.txt'
  return
}