import fs from 'fs'

export default class Repository {
  constructor() {
    this.channels = []
    this.videos = []
    this.paths = {
      videos: './data/videos.json',
      channels: './data/channels.json',
    }

    if (!fs.existsSync(this.paths.videos)) fs.writeFileSync(this.paths.videos, '[]')
    if (!fs.existsSync(this.paths.channels)) fs.writeFileSync(this.paths.channels, '[]')
  
    try {
      this.videos = JSON.parse(fs.readFileSync(this.paths.videos))
      this.channels = JSON.parse(fs.readFileSync(this.paths.channels))
    } catch (err) {
      console.error(err)
    }
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
    // .filter((_, i) => i < 100)
  }
  getVideo(id) {
    return this.videos.find(v => v.id === id)
  }
  getChannelVideos (name) {
    return this.videos.filter(v => v.channelName === name)
  }
  upsertVideos(videos) {
    videos.forEach(v => {
      const index = this.videos.findIndex(video => video.id === v.id)
      if (index !== -1) {
        this.videos[index] = v
      } else {
        this.videos.push(v)
      }
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
}