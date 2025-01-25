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
      broadcastSSE(JSON.stringify({type: 'channel', name, videos}), connections)
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
    .catch((error) => console.error(error))

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
    .catch((error) => console.error(error))

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
    try {
      const stats = fs.statSync(videoPath)
      //https://stackoverflow.com/questions/4360060/video-streaming-with-html-5-via-node-js/29126190#29126190
      var range = req.headers.range || "";    
      var total = stats.size;
      if (range) {
        var parts = range.replace(/bytes=/, "").split("-");
        var partialstart = parts[0];
        var partialend = parts[1];
  
        var start = parseInt(partialstart, 10);
        var end = partialend > 0 ? parseInt(partialend, 10) : total-1;
  
        var chunksize = (end-start)+1;
        res.writeHead(206, { 
          "Content-Range": "bytes " + start + "-" + end + "/" + total, 
          "Accept-Ranges": "bytes", 
          "Content-Length": chunksize, 
          "Content-Type": 'video/mp4' 
        });
      } else {
        res.writeHead(200, { 
          "Accept-Ranges": "bytes", 
          "Content-Length": stats.size, 
          "Content-Type": 'video/mp4' 
        });
      }    
      fs.createReadStream(videoPath).pipe(res)
    } catch (error) {
      console.error('error reading file ' + videoPath)
      console.error(error)
      res.writeHead(404, { 'Content-Type': 'text/plain' })
      res.end('Video not found')
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