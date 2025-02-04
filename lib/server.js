import http from 'http'
import { URL } from 'url'
import fs from 'fs'
import { summarizeVideo } from './subtitles-summary.js'
import { handleSSE, broadcastSSE } from './sse.js'
import { downloadVideo, getVideosFor } from './youtube.js'

export function createServer ({repo, connections = []}) {
  updateAndPersistVideos(repo, ({name, videos}) => {
    broadcastSSE(JSON.stringify({type: 'channel', name, videos}), connections)
  })

  setInterval(() => {
    updateAndPersistVideos(repo, ({name, videos}) => {
      broadcastSSE(JSON.stringify({type: 'channel', name, videos}), connections)
    })
  }, 1000 * 60 * 5)

  return http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`)

    if (req.headers.accept && req.headers.accept.indexOf('text/event-stream') >= 0) {
      handleSSE(res, connections)
      broadcastSSE(JSON.stringify({type: 'all', videos: repo.getVideos()}), [res])
      return 
    }

    if (url.pathname === '/channels' && req.method === 'POST') 
      return addChannelHandler(req, res, repo)
    if (url.pathname === '/download-video' && req.method === 'POST') 
      return downloadVideoHandler(req, res, connections)
    if (url.pathname === '/summarize-video' && req.method === 'POST') 
      return summarizeVideoHandler(req, res, connections)
    if (url.pathname.match('\/videos\/.*') && req.method === 'GET') 
      return watchVideoHandler(req, res)
    if (url.pathname === '/main.css') 
      return fileHandler('client/main.css', 'text/css')(req, res)
    if (url.pathname === '/normalize.css') 
      return fileHandler('client/normalize.css', 'text/css')(req, res)
    if (url.pathname === '/main.js') 
      return fileHandler('client/main.js', 'application/javascript')(req, res)
    if (url.pathname === '/components/video-element.js') 
      return fileHandler('client/components/video-element.js', 'application/javascript')(req, res)
    if (url.pathname === '/components/add-channel-form.js') 
      return fileHandler('client/components/add-channel-form.js', 'application/javascript')(req, res)
    if (url.pathname === '/components/search-videos.js') 
      return fileHandler('client/components/search-videos.js', 'application/javascript')(req, res)
    if (url.pathname === '/components/channels-list.js') 
      return fileHandler('client/components/channels-list.js', 'application/javascript')(req, res)
    if (url.pathname === '/lib/store.js') 
      return fileHandler('client/lib/store.js', 'application/javascript')(req, res)
    if (url.pathname === '/' || url.pathname === '/index.html') 
      return fileHandler('client/index.html', 'text/html')(req, res)
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not found')
  })
  
  function fileHandler (filePath, contentType) {
    return (req, res) => {
      res.writeHead(200, { 'Content-Type': contentType })
      res.end(fs.readFileSync(filePath, 'utf8'))
    }
  }

  async function getBody (req) {
    return new Promise((resolve, reject) => {
      let body = ''
      req.on('data', chunk => {
        body += chunk.toString()
      })
      req.on('end', () => resolve(body))
      req.on('error', reject)
    })
  }

  async function addChannelHandler(req, res, repo) {
    const body = await getBody(req)
    let { name } = JSON.parse(body)
    name = name.trim()
    
    if (repo.channelExists(name)) {
      res.writeHead(409, { 'Content-Type': 'text/plain' })
      return res.end('Channel already added')
    }

    const videos = await updateAndPersistVideosForChannel(name, repo)
    if (Array.isArray(videos)) {
      repo.addChannel(name)
      broadcastSSE(JSON.stringify({type: 'all', videos}), connections)
      res.writeHead(201, { 'Content-Type': 'text/plain' })
      return res.end('Channel added')
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' })
    return res.end('Channel not found')
  }

  async function downloadVideoHandler(req, res, connections = []) {
    const body = await getBody(req)
    const { id } = JSON.parse(body)

    downloadVideo(id, repo, (line) => 
      broadcastSSE(JSON.stringify({type: 'download-log-line', line}), connections))
    .then(() => 
      broadcastSSE(JSON.stringify({type: 'downloaded', videoId: id}), connections))
    .catch((error) => 
      broadcastSSE(JSON.stringify({type: 'download-log-line', line: error.stderr}), connections))

    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('Download started')
  }

  async function summarizeVideoHandler(req, res, connections = []) {
    const body = await getBody(req)
    const { id } = JSON.parse(body)

    summarizeVideo(id, repo, (line) => 
      broadcastSSE(JSON.stringify({type: 'download-log-line', line}), connections))
    .then(({summary, transcript}) => 
      broadcastSSE(JSON.stringify({type: 'summary', summary, transcript, videoId: id}), connections))
    .catch((error) => 
      broadcastSSE(JSON.stringify({type: 'download-log-line', line: error.stderr}), connections))

    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('Download started')
  }

  function watchVideoHandler(req, res) {
    const videoPath = req.url.replace('/videos/', './data/videos/') + '.mp4'
    if (!fs.existsSync(videoPath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' })
      res.end('Video not found')
      return
    }

    /*https://github.com/bootstrapping-microservices/video-streaming-example/blob/master/index.js*/
    const options = {}

    let start
    let end

    const range = req.headers.range
    if (range) {
      const bytesPrefix = "bytes="
      if (range.startsWith(bytesPrefix)) {
        const bytesRange = range.substring(bytesPrefix.length)
        const parts = bytesRange.split("-")
        if (parts.length === 2) {
          const rangeStart = parts[0] && parts[0].trim()
          if (rangeStart && rangeStart.length > 0) {
            options.start = start = parseInt(rangeStart)
          }
          const rangeEnd = parts[1] && parts[1].trim()
          if (rangeEnd && rangeEnd.length > 0) {
            options.end = end = parseInt(rangeEnd)
          }
        }
      }
    }
    res.setHeader("content-type", "video/mp4")
    const stat = fs.statSync(videoPath)

    let contentLength = stat.size

    if (req.method === "HEAD") {
      res.statusCode = 200
      res.setHeader("accept-ranges", "bytes")
      res.setHeader("content-length", contentLength)
      res.end()
    }
    else {        
      let retrievedLength = contentLength;
      if (start !== undefined && end !== undefined) {
        retrievedLength = end - start + 1;
      } else if (start !== undefined) {
        retrievedLength = contentLength - start;
      }

      res.statusCode = start !== undefined || end !== undefined ? 206 : 200

      res.setHeader("content-length", retrievedLength)

      if (range !== undefined) {  
        res.setHeader("content-range", `bytes ${start || 0}-${end || (contentLength-1)}/${contentLength}`)
        res.setHeader("accept-ranges", "bytes")
      }

      const fileStream = fs.createReadStream(videoPath, options)
      fileStream.on("error", error => {
        console.log(`Error reading file ${videoPath}.`)
        console.log(error)
        res.sendStatus(500)
      })
      
      fileStream.pipe(res)
    }
  }
}

async function updateAndPersistVideos (repo, callback = () => {}) {
  const channels = repo.getChannels()
  for (const channel of channels) {
    updateAndPersistVideosForChannel(channel.name, repo, callback)
  }
}

async function updateAndPersistVideosForChannel(name, repo, callback = () => {}) {
  let videos = await getVideosFor(name)
  if (videos) {
    videos = videos.map(v => patchVideo(v, repo))
    repo.saveChannelVideos(name, videos)
    callback({name, videos})
  }
  return videos
}

function patchVideo(video, repo) {
  const existingVideos = repo.getVideos()
  const existingChannelVideos = existingVideos[video.channelName]
  if (existingChannelVideos) {
    const existingVideo = existingChannelVideos.find(v => v.id === video.id)
    Object.assign(video, existingVideo)
  } 
  return video
}