import fs from 'fs'

export default class Repository {
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
  getVideo(id) {
    return Object.values(this.videos).flat().find(video => video.id === id) || null
  }
  getChannelVideos (name) {
    return this.videos[name]
  }
  saveChannelVideos(channelName, videos) {
    this.videos[channelName] = videos
    this.saveVideos()
  }
  saveVideos() {
    fs.writeFileSync(this.paths.videos, JSON.stringify(this.videos, null, 2))
  }
  setVideoTranscript(id, transcript) {
    const video = this.getVideo(id)
    if (!video) return
    this.videos[video.channelName] = this.videos[video.channelName].map(v => {
      if (v.id === id) return Object.assign(v, {transcript})
      return v
    })
    this.saveVideos()
  }
  setVideoSummary(id, summary) {
    const video = this.getVideo(id)
    if (!video) return
    this.videos[video.channelName] = this.videos[video.channelName].map(v => {
      if (v.id === id) return Object.assign(v, {summary})
      return v
    })
    this.saveVideos()
  }
  setVideoDownloaded(id) {
    const video = this.getVideo(id)
    if (!video) return
    this.videos[video.channelName] = this.videos[video.channelName].map(v => {
      if (v.id === id) return Object.assign(v, {downloaded: true})
      return v
    })
    this.saveVideos()
  }
}