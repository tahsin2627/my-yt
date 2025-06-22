import http from 'http'
import { URL } from 'url'
import { handleSSE, broadcastSSE } from './sse.js'
import { updateAndPersistVideos } from '../lib/update-videos.js'
import apiHandler from './router/api.js'
import appHandler from './router/app.js'
import Repository from '../lib/repository.js'
import stateFactory from './state-factory.js'

export function createServer (repo = new Repository()) {
  const connections = []
  const state = stateFactory((updatedState) =>
    broadcastSSE(JSON.stringify({ type: 'state', state: updatedState }), connections))

  let lastAdded = Date.now()
  runUpdateVideos(repo, connections)
  setInterval(runUpdateVideos, 1000 * 60 * 30, repo, connections)
  function runUpdateVideos (repo, connections) {
    console.log('update videos')
    updateAndPersistVideos(repo, (err, data) => {
      if (err) {
        console.error(err)
        return
      }
      const { name, videos } = data
      const newVideos = videos.filter(v => v.addedAt > lastAdded)
      lastAdded = Date.now()
      if (newVideos.length > 0) {
        console.log('new videos for channel', name, newVideos.length)
        broadcastSSE(JSON.stringify({ type: 'new-videos', name, videos: newVideos }), connections)
        broadcastSSE(JSON.stringify({ type: 'download-log-line', line: `new videos for channel ${name} ${newVideos.length}` }), connections)
      } else {
        broadcastSSE(JSON.stringify({ type: 'download-log-line', line: `no new videos for channel ${name}` }), connections)
      }
    })
  }

  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`)

      if (req.headers.accept && req.headers.accept.indexOf('text/event-stream') >= 0) {
        handleSSE(res, connections)
        return broadcastSSE(JSON.stringify({ type: 'state', state }), connections)
      }

      if (url.pathname.startsWith('/api/')) return apiHandler(req, res, repo, connections, state)

      return appHandler(req, res)
    } catch (error) {
      console.error(error)
    }
  })
}
