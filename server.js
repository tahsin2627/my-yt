import http from 'http'
import { URL } from 'url'
import { execa } from 'execa'
import fs from 'fs'

fs.mkdirSync('./data', { recursive: true })
  
class Repository {
  constructor() {
    this.channels = []
    this.videos = {}
    this.paths = {
      videos: './data/videos.json',
      channels: './data/channels.json',
    }

    if (!fs.existsSync(this.paths.videos)) fs.writeFileSync(this.paths.videos, '{}')
    if (!fs.existsSync(this.paths.channels)) fs.writeFileSync(this.paths.channels, '[]')
  
    try {
      this.videos = JSON.parse(fs.readFileSync(this.paths.videos))
      this.channels = JSON.parse(fs.readFileSync(this.paths.channels))
    } catch (err) {
      console.error(err)
    }
  }

  getChannels () { return this.channels }
  addChannel (name) {
    this.channels.push({name})
    this.saveChannels()
  }
  saveChannels() {
    fs.writeFileSync(this.paths.channels, JSON.stringify(this.channels, null, 2))
  }
  getVideos () { return this.videos }
  saveChannelVideos(channelName, videos) {
    this.videos[channelName] = videos
    this.saveVideos()
  }
  saveVideos() {
    fs.writeFileSync(this.paths.videos, JSON.stringify(this.videos, null, 2))
  }
}

async function main ({port = 3000} = {}) {
  const repo = new Repository()

  await updateAndPersistVideos(repo)

  createServer({repo, port})
  .listen(port, () => {
    console.log(`Server running at http://localhost:${port}`)
  })
}

if (import.meta.url.endsWith('server.js')) {
  main()
}


async function updateAndPersistVideos (repo) {
  const channels = repo.getChannels()
  for (const channel of channels) {
    console.log('updating videos for', channel.name)
    const videos = await getVideosFor(channel.name)
    if (videos) repo.saveChannelVideos(channel.name, videos)
  }
  console.log('All videos updated')
}

async function downloadVideo(url, path) {
  try {
    await execa('yt-dlp', [url, '-o', path])
    console.log('Download completed')
  } catch (error) {
    console.error('Error downloading video:', error)
  }
}


async function getVideosFor(channelName) {
  try {
    const response = await fetch(`https://www.youtube.com/${channelWithAt(channelName)}/videos`)
    const text = await response.text()
    const match = text.match(/var ytInitialData = (.+?);<\/script>/)
    if (!match || !match[1]) return null

    const json = JSON.parse(match[1].trim())
    const videoTab = json.contents.twoColumnBrowseResultsRenderer.tabs.find(t => t.tabRenderer.title === 'Video')
    const videoContents = videoTab.tabRenderer.content.richGridRenderer.contents
    return videoContents.map(toInternalVideo).filter(Boolean)
  } catch (error) {
    console.error('Error fetching latest video:', error)
    return null
  }

  function channelWithAt(channelName = '') {
    return channelName.startsWith('@') ? channelName : '@' + channelName
  } 

  function toInternalVideo(v) {
    if (!v || !v.richItemRenderer) return
    return {
      title: v.richItemRenderer.content.videoRenderer.title?.runs[0].text,
      url: `https://www.youtube.com/watch?v=${v.richItemRenderer.content.videoRenderer.videoId}`, 
      thumbnail: v.richItemRenderer.content.videoRenderer.thumbnail?.thumbnails[0].url,
      description: v.richItemRenderer.content.videoRenderer.descriptionSnippet?.runs[0].text,
      videoId: v.richItemRenderer.content.videoRenderer.videoId,
      publishedTime: v.richItemRenderer.content.videoRenderer.publishedTimeText.simpleText,
      viewCount: v.richItemRenderer.content.videoRenderer.viewCountText.simpleText,
      duration: v.richItemRenderer.content.videoRenderer.lengthText ? v.richItemRenderer.content.videoRenderer.lengthText.simpleText : null,
    }
  }
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
        console.log('adding channel', name)
        repo.addChannel(name)
        await updateAndPersistVideos(repo)
        res.writeHead(201, { 'Content-Type': 'text/plain' })
        res.end('Channel added')
      })
      return
    } 
    if (parsedUrl.pathname === '/download-video' && req.method === 'POST') {
      let body = ''
      req.on('data', chunk => {
        body += chunk.toString()
      })
      req.on('end', () => {
        const { url, path } = JSON.parse(body)
        downloadVideo(url, path).then(() => {
          res.writeHead(200, { 'Content-Type': 'text/plain' })
          res.end('Download started')
        }).catch(error => {
          console.error('Error starting download:', error)
          res.writeHead(500, { 'Content-Type': 'text/plain' })
          res.end('Internal Server Error')
        })
      })
      return
    }
    const indexHtml = await fs.promises.readFile('index.html', 'utf8')
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(indexHtml)
  })
}
