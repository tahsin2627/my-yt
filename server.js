import http from 'http'
import { URL } from 'url'
import { execa } from 'execa'
import fs from 'fs'
import { exec } from 'child_process'

fs.mkdirSync('./data', { recursive: true })
fs.mkdirSync('./data/videos', { recursive: true })

const connections = []

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
    console.log('addChannel', name)
    this.channels.push({name})
    this.saveChannels()
  }
  saveChannels() {
    fs.writeFileSync(this.paths.channels, JSON.stringify(this.channels, null, 2))
  }
  getVideos () { return this.videos }
  getVideo(id) {
    return Object.values(this.videos).flat().find(video => video.id === id) || null
  }
  saveChannelVideos(channelName, videos) {
    console.log('saveChannelVideos', channelName, videos.length)
    this.videos[channelName] = videos
    this.saveVideos()
  }
  saveVideos() {
    fs.writeFileSync(this.paths.videos, JSON.stringify(this.videos, null, 2))
  }
  setVideoTranscript(id, transcript) {
    const video = this.getVideo(id)
    console.log('setVideoTranscript', id, transcript.length)
    if (!video) return
    this.videos[video.channelName] = this.videos[video.channelName].map(v => {
      if (v.id === id) return Object.assign(v, {transcript})
      return v
    })
    this.saveVideos()
  }
  setVideoSummary(id, summary) {
    const video = this.getVideo(id)
    console.log('setVideoSummary', id, summary.length)
    if (!video) return
    this.videos[video.channelName] = this.videos[video.channelName].map(v => {
      if (v.id === id) return Object.assign(v, {summary})
      return v
    })
    this.saveVideos()
  }
  setVideoDownloaded(id) {
    const video = this.getVideo(id)
    console.log('setVideoDownloaded', id)
    if (!video) return
    this.videos[video.channelName] = this.videos[video.channelName].map(v => {
      if (v.id === id) return Object.assign(v, {downloaded: true})
      return v
    })
    this.saveVideos()
  }
}

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


async function updateAndPersistVideos (repo) {
  const channels = repo.getChannels()
  const existingVideos = repo.getVideos()
  for (const channel of channels) {
    console.log('updating videos for', channel.name)
    const videos = await getVideosFor(channel.name)
    const existingChannelVideos = existingVideos[channel.name]
    if (existingChannelVideos) {
      for (const video of videos) {
        const existingVideo = existingChannelVideos.find(v => v.id === video.id)
        if (existingVideo && existingVideo.downloaded) {
          video.downloaded = existingVideo.downloaded
          console.log('setting video as downloaded', video.id)
        }
        // generalize using Object.assign
        Object.assign(video, existingVideo)
      }
    }
    if (videos) {
      repo.saveChannelVideos(channel.name, videos)
      broadcastSSE(JSON.stringify({type: 'channel', name: channel.name, videos}), connections)
    }
  }
  console.log('All videos updated')
}

async function updateAndPersistVideosForChannel(repo, name) {
  const videos = await getVideosFor(name)
  if (videos) {
    repo.saveChannelVideos(name, videos)
  }
  return videos
}

async function downloadVideo(id, repo) {
  try {
    for await (const line of execa`yt-dlp -f mp4 ${id} -o ./data/videos/${id}.mp4`.iterable()) {
      broadcastSSE(JSON.stringify({type: 'download-log-line', line}), connections)
      console.log(line)
    }

    repo.setVideoDownloaded(id)
    console.log('Download completed')
  } catch (error) {
    console.error('Error downloading video:', error)
  }
}
async function summarizeVideo(id, repo) {
  try {
    for await (const line of execa`yt-dlp --skip-download --write-subs --write-auto-subs --sub-lang en --sub-format ttml --convert-subs srt --default-search ytsearch ${id} -o ./data/videos/${id}-sub`.iterable()) {
      broadcastSSE(JSON.stringify({type: 'download-log-line', line}), connections)
      console.log(line)
    }
    /*
    given the transcript at this location ./data/videos/${id}-sub.en.srt with the following format:
1
00:00:07,279 --> 00:00:12,799
<font color="white" size=".72c">it's friday Welcome back in broad terms here</font>

2
00:00:10,519 --> 00:00:14,639
<font color="white" size=".72c">we talk about news we go into more</font>
    remove all timestamp related text, also the font html tag around the actual text, and the number that identifies each part
    preserve new lines
    */
    const transcriptPath = `./data/videos/${id}-sub.en.srt`
    const transcriptContent = fs.readFileSync(transcriptPath, 'utf-8')
    const cleanedTranscript = transcriptContent.replace(/\d+\n\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}\n<font color="white" size=".72c">(.*?)<\/font>/g, '$1\n').replace(/\n+/g, '\n')
    repo.setVideoTranscript(id, cleanedTranscript)
    fs.writeFileSync(`./data/videos/${id}-sub.en.txt`, cleanedTranscript)
    
    const {response} = await fetchAIResponse(`Summarize the following transcript of a YouTube video, avoid talking about the host and avoid describing the context, keep it short, to the point, and fit it in max 10 paragraphs: \n ${cleanedTranscript}`)
    console.log(response)
    repo.setVideoSummary(id, response)

    repo.setVideoDownloaded(id)
    console.log('Download completed')
  } catch (error) {
    console.error('Error downloading video:', error)
  } 
}

async function fetchAIResponse (prompt) {
  const url = 'http://localhost:11434/api/generate';
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      "model": "llama3.2",
      "prompt": prompt,
      "stream": false
    })
  };

  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    // console.log(data);
    return data
  } catch (error) {
    console.error('Error summarizing text:', error);
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
      channelName,
      title: v.richItemRenderer.content.videoRenderer.title?.runs[0].text,
      url: `https://www.youtube.com/watch?v=${v.richItemRenderer.content.videoRenderer.videoId}`, 
      thumbnail: v.richItemRenderer.content.videoRenderer.thumbnail?.thumbnails[0].url,
      description: v.richItemRenderer.content.videoRenderer.descriptionSnippet?.runs[0].text,
      id: v.richItemRenderer.content.videoRenderer.videoId,
      publishedTime: v.richItemRenderer.content.videoRenderer.publishedTimeText?.simpleText,
      viewCount: v.richItemRenderer.content.videoRenderer.viewCountText?.simpleText,
      duration: v.richItemRenderer.content.videoRenderer.lengthText?.simpleText,
    }
  }
}

function handleSSE (res, connections = []) {
  connections.push(res)
  res.on('close', () => {
    connections.splice(connections.findIndex(c => res === c), 1)
  })
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  })
}

function broadcastSSE (data, connections = []) {
  connections.forEach(connection => {
    if (!connection) return
    const id = new Date().toISOString()
    connection.write('id: ' + id + '\n')
    connection.write('data: ' + data + '\n\n')
  })
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
        const videos = await updateAndPersistVideosForChannel(repo, name)
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
        downloadVideo(id, repo)
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

        summarizeVideo(id, repo)
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
