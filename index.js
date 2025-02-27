import fs from 'fs'
import os from 'os'
import Repository from './lib/repository.js'
import { createServer } from './lib/server.js'


async function main ({port = 3000, connections = []} = {}) {
  fs.mkdirSync('./data/videos', { recursive: true })
  
  const repo = new Repository()

  fs.readdirSync('./data/videos').forEach(file => {
    if (!file.endsWith('.mp4')) return
    const videoId = file.replace('.mp4', '')
    repo.setVideoDownloaded(videoId)
  })

  createServer({repo, port, connections})
  .listen(port, () => {
    console.log(`Server running at http://${os.hostname()}:${port} (or http://localhost:${port})`)
  })
}

if (import.meta.url.endsWith('index.js')) {
  main()
}