import http from 'http'
import { URL } from 'url'
import fs from 'fs'
import { handleSSE, broadcastSSE } from './sse.js'
import { updateAndPersistVideos } from './update-videos.js'
import apiHandler from './router/api.js'

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

      /* client */
      if (url.pathname === '/main.css') 
        return fileHandler('client/main.css', 'text/css')(req, res)
      if (url.pathname === '/normalize.css') 
        return fileHandler('client/normalize.css', 'text/css')(req, res)
      if (url.pathname === '/main.js') 
        return fileHandler('client/main.js', 'application/javascript')(req, res)
      if (url.pathname === '/lib/store.js') 
        return fileHandler('client/lib/store.js', 'application/javascript')(req, res)
      if (url.pathname === '/lib/router.js') 
        return fileHandler('client/lib/router.js', 'application/javascript')(req, res)
      if (url.pathname === '/lib/utils.js') 
        return fileHandler('client/lib/utils.js', 'application/javascript')(req, res)
      if (url.pathname === '/components/video-element.js') 
        return fileHandler('client/components/video-element.js', 'application/javascript')(req, res)
      if (url.pathname === '/components/add-channel-form.js') 
        return fileHandler('client/components/add-channel-form.js', 'application/javascript')(req, res)
      if (url.pathname === '/components/manage-channels-form.js') 
        return fileHandler('client/components/manage-channels-form.js', 'application/javascript')(req, res)
      if (url.pathname === '/components/video-quality-form.js') 
        return fileHandler('client/components/video-quality-form.js', 'application/javascript')(req, res)
      if (url.pathname === '/components/manage-disk-space-form.js') 
        return fileHandler('client/components/manage-disk-space-form.js', 'application/javascript')(req, res)
      if (url.pathname === '/components/search-videos.js') 
        return fileHandler('client/components/search-videos.js', 'application/javascript')(req, res)
      if (url.pathname === '/components/channels-list.js') 
        return fileHandler('client/components/channels-list.js', 'application/javascript')(req, res)
      if (url.pathname === '/components/empty-state.js') 
        return fileHandler('client/components/empty-state.js', 'application/javascript')(req, res)

      return fileHandler('client/index.html', 'text/html')(req, res)
    } catch (error) {
      console.error(error)
    } 
  })  
}

function fileHandler (filePath, contentType) {
  return (req, res) => {
    res.writeHead(200, { 'Content-Type': contentType })
    res.end(fs.readFileSync(filePath, 'utf8'))
  }
}



