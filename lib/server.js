import http from 'http'
import { URL } from 'url'
import fs from 'fs'
import querystring from 'querystring'
import { summarizeVideo } from './subtitles-summary.js'
import { handleSSE, broadcastSSE } from './sse.js'
import { downloadVideo, extractIdFromUrl, isUnsupportedUrl, isYouTubeUrl } from './youtube.js'
import { updateAndPersistVideos, updateAndPersistVideosForChannel } from './update-videos.js'

export function createServer ({repo, connections = []}) {
  let lastAdded = Date.now()
  runUpdateVideos()
  setInterval(runUpdateVideos, 1000 * 60 * 10)
  function runUpdateVideos() {
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

  const llmSettings = {
    model: process.env.AI_MODEL || 'meta-llama-3.1-8b-instruct',
    host: process.env.AI_HOST ||'http://127.0.0.1:1234',
    endpoint: process.env.AI_ENDPOINT ||'/v1/chat/completions',
    apiKey: process.env.AI_APIKEY || ''
  }

  return http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`)

    /* initialize SSE */
    if (req.headers.accept && req.headers.accept.indexOf('text/event-stream') >= 0) return handleSSE(res, connections)

    /* api */
    if (url.pathname === '/api/channels' && req.method === 'POST') 
      return addChannelHandler(req, res, repo, connections)
    if (url.pathname === '/api/channels' && req.method === 'GET') 
      return getChannelHandler(req, res, repo, connections)
    if (url.pathname === '/api/download-video' && req.method === 'POST') 
      return downloadVideoHandler(req, res, repo, connections)
    if (url.pathname === '/api/summarize-video' && req.method === 'POST') 
      return summarizeVideoHandler(req, res, repo, connections, llmSettings)
    if (url.pathname === '/api/ignore-video' && req.method === 'POST') 
      return ignoreVideoHandler(req, res, repo, connections)
    if (url.pathname === '/api/delete-video' && req.method === 'POST') 
      return deleteVideoHandler(req, res, repo, connections)
    if (url.pathname === '/api/videos' && req.method === 'GET') 
      return allVideosHandler(req, res, repo, connections)
    if (url.pathname === '/api/video-quality' && req.method === 'GET') 
      return getVideoQualityHandler(req, res, repo, connections)
    if (url.pathname === '/api/video-quality' && req.method === 'POST') 
      return setVideoQualityHandler(req, res, repo, connections)
    if (url.pathname === '/api/disk-usage' && req.method === 'GET') 
      return diskUsageHandler(req, res, repo, connections)
    if (url.pathname === '/api/reclaim-disk-space' && req.method === 'POST') 
      return reclaimDiskSpaceHandler(req, res, repo, connections)
    if (url.pathname.match(/\/videos\/.*/) && req.method === 'GET') 
      return watchVideoHandler(req, res)
    if (url.pathname.match(/\/captions\/.*/) && req.method === 'GET') 
      return captionsHandler(req, res)

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
    if (url.pathname === '/components/video-filters.js') 
      return fileHandler('client/components/video-filters.js', 'application/javascript')(req, res)

    return fileHandler('client/index.html', 'text/html')(req, res)
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

  function getQuery (req) {
    return req.url.indexOf('?') >= 0
     ? querystring.parse(req.url.substring(req.url.indexOf('?') + 1)) 
     : {}
  }

  async function addChannelHandler(req, res, repo, connections = []) {
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
      broadcastSSE(JSON.stringify({type: 'new-videos', name, videos}), connections)
      res.writeHead(201, { 'Content-Type': 'text/plain' })
      return res.end('Channel added')
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' })
    return res.end('Channel not found')
  }

  async function getChannelHandler(req, res, repo, connections = []) {
    const channels = repo.getChannels()
    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify(channels))
  }

  async function downloadVideoHandler(req, res, repo, connections = []) {
    const body = await getBody(req)
    let { id, external } = JSON.parse(body)
    
    if (isUnsupportedUrl(id)) {
      console.log('unsupported url', id)
      res.writeHead(400)
      return res.end()
    }
    if (isYouTubeUrl(id)) id = extractIdFromUrl(id)

    downloadVideo(id, repo, (line) => 
      broadcastSSE(JSON.stringify({type: 'download-log-line', line}), connections))
    .then(() => {
      broadcastSSE(JSON.stringify({type: 'downloaded', videoId: id, downloaded: true}), connections)
      if (external) broadcastSSE(JSON.stringify({type: 'new-videos', videos: [repo.getVideo(id)]}), connections)
    })
    .catch((error) => 
      broadcastSSE(JSON.stringify({type: 'download-log-line', line: error.stderr}), connections))

    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('Download started')
  }

  async function summarizeVideoHandler(req, res, repo, connections = [], llmSettings = {}) {
    const body = await getBody(req)
    const { id } = JSON.parse(body)

    summarizeVideo(id, repo, llmSettings, (line) => 
      broadcastSSE(JSON.stringify({type: 'download-log-line', line}), connections))
    .then(({summary, transcript}) => 
      broadcastSSE(JSON.stringify({type: 'summary', summary, transcript, videoId: id}), connections))
    .catch((error) => {
      broadcastSSE(JSON.stringify({type: 'download-log-line', line: error.message}), connections)
      broadcastSSE(JSON.stringify({type: 'summary-error', videoId: id}), connections)
    })

    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('Download started')
  }

  async function ignoreVideoHandler(req, res, repo, connections = []) {
    const body = await getBody(req)
    let { id } = JSON.parse(body)
    const ignored = repo.toggleIgnoreVideo(id)
    broadcastSSE(JSON.stringify({type: 'ignored', videoId: id, ignored}), connections)
    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify(ignored))
  }

  async function deleteVideoHandler(req, res, repo, connections = []) {
    const body = await getBody(req)
    let { id } = JSON.parse(body)
    repo.deleteVideo(id)
    broadcastSSE(JSON.stringify({type: 'downloaded', videoId: id, downloaded: false}), connections)
    res.writeHead(200)
    res.end()
  }
  
  function watchVideoHandler(req, res) {
    const id = req.url.replace('/videos/', '')
    const video = repo.getVideo(id)
    const location = video.location || `./data/videos/${id}.mp4`
    const contentType = video.format ? `video/${video.format}` : "video/mp4"
    if (!fs.existsSync(location)) {
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
    res.setHeader("content-type", contentType)
    // bust cache
    res.setHeader('cache-control', 'public, max-age=0')
    const stat = fs.statSync(location)

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

      const fileStream = fs.createReadStream(location, options)
      fileStream.on("error", error => {
        console.log(`Error reading file ${location}.`)
        console.log(error)
        res.writeHead(500)
        res.end()
      })
      
      fileStream.pipe(res)
    }
  }

  function allVideosHandler(req, res) {
    const videos = repo.getVideos()
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(videos))
  }

  function getVideoQualityHandler(req, res) {
    const videoQuality = repo.getVideoQuality()
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(videoQuality))
  }

  async function setVideoQualityHandler(req, res) {
    const body = await getBody(req)
    const videoQuality = JSON.parse(body)

    const newQuality = repo.setVideoQuality(videoQuality)
    if (!newQuality) {
      res.writeHead(400)
      return res.end()
    }
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(newQuality))
  }

  function diskUsageHandler(req, res) {
    const onlyIgnored = getQuery(req).onlyIgnored === 'true'
    const videos = repo.getVideos()

    const filterFn = onlyIgnored
      ? video => video.downloaded && video.ignored 
      : video => video.downloaded
    
    const diskSpaceUsed = videos.filter(filterFn)
    .reduce((total, video) => {
      try {
        return total + fs.statSync(`./data/videos/${video.id}.mp4`).size / Math.pow(10, 9)
      } catch (err) {
        return total
      }
    }, 0)
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end(diskSpaceUsed.toFixed(3) + 'GB')
  }
  
  async function reclaimDiskSpaceHandler(req, res) {
    const body = await getBody(req)
    const {onlyIgnored} = JSON.parse(body)
    const videos = repo.getVideos()

    const filterFn = onlyIgnored
      ? video => video.downloaded && video.ignored 
      : video => video.downloaded

    videos.filter(filterFn)
    .forEach((video) => {
      try {
        const files = fs.globSync(`./data/videos/${video.id}*`)
        files.forEach(file => fs.unlinkSync(file))
        repo.updateVideo(video.id, {downloaded: false})
      } catch (err) {
        console.error(err.message)
      }
    })
    repo.saveVideos()
    res.writeHead(200)
    res.end()
  }

  function captionsHandler(req, res) {
    // return vtt file of video
    const captionsPath = './data' + req.url.replace('captions', 'videos') + '.en.vtt'
    console.log(captionsPath)
    if (!fs.existsSync(captionsPath)) {
      res.writeHead(404)
      res.end()
    } else {
      const fileStream = fs.createReadStream(captionsPath)
      fileStream.pipe(res)
    }
  }

}
