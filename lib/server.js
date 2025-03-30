import http from 'http'
import { URL } from 'url'
import fs from 'fs'
import { handleSSE, broadcastSSE } from './sse.js'
import { updateAndPersistVideos } from './update-videos.js'
import apiHandler from './router/api.js'
import appHandler from './router/app.js'

export function createServer ({repo, state = {}, connections = [], updateVideos = true} = {}) {
  if (updateVideos) {
    let lastAdded = Date.now()
    runUpdateVideos(repo, connections)
    setInterval(runUpdateVideos, 1000 * 60 * 10, repo, connections)
    function runUpdateVideos(repo, connections) {
      console.log('update videos')
      updateAndPersistVideos(repo, ({name, videos}) => {
        const newVideos = videos.filter(v => v.addedAt > lastAdded)
        lastAdded = Date.now()
        if (newVideos.length > 0) {
          console.log('new videos for channel', name, newVideos.length)
          broadcastSSE(JSON.stringify({type: 'new-videos', name, videos: newVideos}), connections)
        }
      })
    }
  }

  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`)

      if (req.headers.accept && req.headers.accept.indexOf('text/event-stream') >= 0) return handleSSE(res, connections)

      if (url.pathname.startsWith('/api/')) return apiHandler(req, res, repo, connections, state)

      return appHandler(req, res)
    } catch (error) {
      console.error(error)
    } 
  })  
}
