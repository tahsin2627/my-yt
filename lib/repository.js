import fs from 'fs'

export default class Repository {
  constructor(basePath = './data') {
    this.channels = []
    this.videos = []
    this.basePath = basePath
    this.paths = {
      videos: `${this.basePath}/videos.json`,
      channels: `${this.basePath}/channels.json`,
    }
    
    fs.mkdirSync(`${this.basePath}/videos`, { recursive: true })
    if (!fs.existsSync(this.paths.videos)) {
      console.log('initializing ', this.paths.videos)
      fs.writeFileSync(this.paths.videos, '[]')
    }
    if (!fs.existsSync(this.paths.channels)) {
      console.log('initializing ', this.paths.channels)
      fs.writeFileSync(this.paths.channels, '[]')
    }
  
    try {
      this.videos = JSON.parse(fs.readFileSync(this.paths.videos))
      console.log('read videos', this.videos.length)
      this.channels = JSON.parse(fs.readFileSync(this.paths.channels))
      console.log('read channels', this.channels.length)
    } catch (err) {
      console.error(err)
    }

    fs.readdirSync(`${this.basePath}/videos`).forEach(file => {
      if (!file.endsWith('.mp4')) return
      const videoId = file.replace('.mp4', '')
      this.setVideoDownloaded(videoId)
    })
  }

  getChannels () { return this.channels }
  channelExists (name) {
    return !!this.channels.find(c => c.name === name)
  }
  addChannel (name) {
    this.channels.push({name})
    this.saveChannels()
  }
  saveChannels() {
    fs.writeFileSync(this.paths.channels, JSON.stringify(this.channels, null, 2))
  }
  getVideos () {
    return this.videos
    .sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt))
    .sort((a, b) => (b.ignored ? -1 : 0) + (a.ignored ? 1 : 0))
    .filter((_, i) => i < 500)
  }
  getVideo(id) {
    return this.videos.find(v => v.id === id)
  }
  getChannelVideos (name) {
    return this.videos.filter(v => v.channelName === name)
  }
  upsertVideos(videos) {
    (Array.isArray(videos) ? videos : [videos])
    .forEach(v => {
      const index = this.videos.findIndex(video => video.id === v.id)
      if (index !== -1) {
        this.videos[index] = v
      } else {
        this.videos.push(v)
      }
    })
    this.saveVideos()
  }
  deleteVideo(id) {
    const files = fs.readdirSync(`${this.basePath}/videos`)
    files.forEach(file => {
      if (file.startsWith(id)) {
        fs.unlinkSync(`${this.basePath}/videos/${file}`)
      }
    })
    this.videos = this.videos.map(v => {
      if (v.id === id) return Object.assign(v, {downloaded: false})
      return v
    })
    this.saveVideos()
  }
  saveVideos() {
    fs.writeFileSync(this.paths.videos, JSON.stringify(this.videos, null, 2))
  }
  toggleIgnoreVideo(id) {
    const index = this.videos.findIndex(v => v.id === id)
    let ignored = false
    if (index !== -1) {
      ignored = this.videos[index].ignored = !this.videos[index].ignored
    }
    this.saveVideos()
    return ignored
  }
  setVideoTranscript(id, transcript = '') {
    this.videos = this.videos.map(v => {
      if (v.id === id) return Object.assign(v, {transcript})
      return v
    })
    this.saveVideos()
  }
  setVideoSummary(id, summary = '') {
    this.videos = this.videos.map(v => {
      if (v.id === id) return Object.assign(v, {summary})
      return v
    })
    this.saveVideos()
  }
  setVideoDownloaded(id, downloaded = true) {
    this.videos = this.videos.map(v => {
      if (v.id === id) return Object.assign(v, {downloaded})
      return v
    })
    this.saveVideos()
  }
  patchVideo(video) {
    const savedVideo = this.getVideo(video.id)
    if (!savedVideo) return Object.assign(video, {addedAt: Date.now()})
    Object.assign(savedVideo, video)
    return savedVideo
  }
}