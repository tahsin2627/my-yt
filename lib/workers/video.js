// videoWorker.js
import fs from 'fs'
import { spawn } from 'child_process'
import { parentPort, workerData } from 'worker_threads'

function getOptionalCookiesPath () {
  if (fs.existsSync('/app/cookies.txt')) return '/app/cookies.txt'
  if (fs.existsSync('./cookies.txt')) return './cookies.txt'
}
console.log('worker')
const videoYTDLPArgs = quality => [
  '--concurrent-fragments',
  '10',
  '--newline',
  '--progress',
  '--progress-delta',
  '1',
  '--sponsorblock-remove',
  'all,-filler',
  '--merge-output-format',
  'mp4',
  '-f',
  `bestvideo[height<=${quality}]+bestaudio/best`,
  '--check-formats',
  '--verbose'
]

function video (id, quality) {
  const cookiesPath = getOptionalCookiesPath()
  const cookiesOption = cookiesPath ? ['--cookies', cookiesPath] : []
  return spawn('yt-dlp', [
    '-o',
    `./data/videos/${id}.%(ext)s`,
    ...cookiesOption,
    ...videoYTDLPArgs(quality),
    '--',
    id
  ])
}

const { id, quality } = workerData
let location, format
const process = video(id, quality)

process.stdout.on('data', (data) => {
  const line = data.toString().replace(/\n/, '')
  if (line && line.startsWith('[Merger] Merging formats into')) {
    location = line.substring(line.lastIndexOf(' ') + 1).replace(/"/g, '').replace(/\n/, '')
    format = location.substring(location.lastIndexOf('.') + 1).replace(/\n/, '')
  }
  parentPort.postMessage({ status: 'info', line })
})

// process.stderr.on('data', (line) => {
//   console.error(`stderr: ${line}`)
// })

process.on('close', (code) => {
  parentPort.postMessage({ status: 'done', code, location, format })
})

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('Worker error:', error)
  parentPort.postMessage({ status: 'error', error: error.message })
})
