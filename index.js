import os from 'os'
import Repository from './lib/repository.js'
import { createServer } from './lib/server.js'

async function main ({ port = 3000 } = {}) {
  createServer(new Repository())
    .listen(port, () => {
      console.log(`Server running at http://${os.hostname()}:${port} (or http://localhost:${port})`)
    })
}

if (import.meta.url.endsWith('index.js')) {
  main({
    port: +process.env.PORT || 3000
  })
}
