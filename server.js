import http from 'http'
import { URL } from 'url'
import { execa } from 'execa'
import fs from 'fs'
import { summarizeVideo } from './lib/subtitles-summary.js'
import Repository from './lib/repository.js'
import { handleSSE, broadcastSSE } from './lib/sse.js'
import { downloadVideo, getVideosFor } from './lib/youtube.js'

fs.mkdirSync('./data', { recursive: true })
fs.mkdirSync('./data/videos', { recursive: true })

const connections = []

async function main ({port = 3000} = {}) {
  const repo = new Repository()

  fs.readdirSync('./data/videos').forEach(file => {
    if (!file.endsWith('.mp4')) return
    const videoId = file.replace('.mp4', '')
    repo.setVideoDownloaded(videoId)
  })
  updateAndPersistVideos(repo)

  setInterval(() => updateAndPersistVideos(repo), 1000 * 60 * 5)

  createServer({repo, port})
  .listen(port, () => {
    console.log(`Server running at http://localhost:${port}`)
  })
}

if (import.meta.url.endsWith('server.js')) {
  main()
}

function createServer ({repo, port = 3000}) {
  return http.createServer(async (req, res) => {
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`)
    if (parsedUrl.pathname === '/videos') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(repo.getVideos()))
      return 
    }
    if (parsedUrl.pathname === '/channels' && req.method === 'POST') {
      let body = ''
      req.on('data', chunk => {
        body += chunk.toString()
      })
      req.on('end', async () => {
        let { name } = JSON.parse(body)
        name = name.trim()
        const videos = await updateAndPersistVideosForChannel(name, repo)
        if (Array.isArray(videos)) {
          repo.addChannel(name)
          broadcastSSE(JSON.stringify({type: 'channel', name, videos}), connections)
          res.writeHead(201, { 'Content-Type': 'text/plain' })
          res.end('Channel added')
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain' })
          res.end('Channel not found')
        }
      })
      return
    } 
    if (parsedUrl.pathname === '/download-video' && req.method === 'POST') {
      let body = ''
      req.on('data', chunk => {
        body += chunk.toString()
      })
      req.on('end', () => {
        const { id } = JSON.parse(body)
        const {channelName} = repo.getVideo(id)
        const videos = repo.getVideos()[channelName]
        downloadVideo(id, repo, (line) => {
          broadcastSSE(JSON.stringify({type: 'download-log-line', line}), connections)
        })
        .then(() => {
          broadcastSSE(JSON.stringify({type: 'channel', name: channelName, videos}), connections)
        })
        .catch((error) => {
          console.error(error)
          broadcastSSE(JSON.stringify({type: 'channel', name: channelName, videos}), connections)
        })
        res.writeHead(200, { 'Content-Type': 'text/plain' })
        res.end('Download started')
      })
      return
    }
    if (parsedUrl.pathname === '/summarize-video' && req.method === 'POST') {
      let body = ''
      req.on('data', chunk => {
        body += chunk.toString()
      })
      req.on('end', () => {
        const { id } = JSON.parse(body)
        const {channelName} = repo.getVideo(id)
        const videos = repo.getVideos()[channelName]

        summarizeVideo(id, repo, (line) => {
          broadcastSSE(JSON.stringify({type: 'download-log-line', line}), connections)
        })
        .then(() => {
          broadcastSSE(JSON.stringify({type: 'channel', name: channelName, videos}), connections)
        })
        .catch((error) => {
          console.error(error)
          broadcastSSE(JSON.stringify({type: 'channel', name: channelName, videos}), connections)
        })
        res.writeHead(200, { 'Content-Type': 'text/plain' })
        res.end('Download started')
      })
      return
    }
    if (parsedUrl.pathname.match('\/videos\/.*') && req.method === 'GET') {
      const videoPath = parsedUrl.pathname.replace('/videos/', './data/videos/') + '.mp4'
      console.log({videoPath})
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
      return
    }
    if (req.headers.accept && req.headers.accept.indexOf('text/event-stream') >= 0) {
      handleSSE(res, connections)
      broadcastSSE(JSON.stringify({type: 'all', videos: repo.getVideos()}), [res])
      return 
    }
    const indexHtml = await fs.promises.readFile('index.html', 'utf8')
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(indexHtml)
  })

}

async function updateAndPersistVideos (repo) {
  const channels = repo.getChannels()
  for (const channel of channels) {
    updateAndPersistVideosForChannel(channel.name, repo)
  }
  console.log('All videos updated')
}

async function updateAndPersistVideosForChannel(name, repo) {
  console.log('updating videos for', name)
  const videos = await getVideosFor(name)
  if (videos) {
    videos.map(v => patchVideo(v, repo))
    repo.saveChannelVideos(name, videos)
    broadcastSSE(JSON.stringify({type: 'channel', name, videos}), connections)
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
}