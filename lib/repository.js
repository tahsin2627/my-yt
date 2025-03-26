import fs from 'fs'

export default class Repository {
  constructor(basePath = './data') {
    this.channels = []
    this.videos = []
    this.basePath = basePath
    this.paths = {
      videos: `${this.basePath}/videos.json`,
      channels: `${this.basePath}/channels.json`,
      settings: `${this.basePath}/settings.json`
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
    if (!fs.existsSync(this.paths.settings)) {
      console.log('initializing ', this.paths.settings)
      fs.writeFileSync(this.paths.settings, JSON.stringify({"videoQuality":720}, null, 2))
    }
  
    try {
      this.videos = JSON.parse(fs.readFileSync(this.paths.videos))
      console.log('read videos', this.videos.length)
      this.channels = JSON.parse(fs.readFileSync(this.paths.channels))
      console.log('read channels', this.channels.length)
      this.settings = JSON.parse(fs.readFileSync(this.paths.settings))
      console.log('read settings', this.settings)
    } catch (err) {
      console.error(err)
    }

    fs.readdirSync(`${this.basePath}/videos`).forEach(file => {
      const format = file.substring(file.lastIndexOf('.') + 1)
      if (!['mp4', 'webm'].includes(format)) return
      if (file.includes('.uncut.') || file.includes('.f')) return // skip .uncut. and formats
      const videoId = file.replace('.mp4', '').replace('.webm', '')
      const location = `${this.basePath}/videos/${file}`
      this.updateVideo(videoId, {downloaded: true, location, format})
    })
    this.saveVideos()
  }

  getChannels () { return this.channels }
  channelExists (name) {
    return !!this.channels.find(c => c.name === name)
  }
  addChannel (name) {
    this.channels.push({name})
    console.log('added channel', name)
    this.saveChannels()
  }
  deleteChannel (name) {
    this.channels.splice(this.channels.findIndex(c => c.name === name), 1)
    console.log('removed channel', name)
    this.saveChannels()
  }
  saveChannels() {
    fs.writeFileSync(this.paths.channels, JSON.stringify(this.channels, null, 2))
    console.log('saving channels', this.channels.length)
  }
  saveSettings() {
    fs.writeFileSync(this.paths.settings, JSON.stringify(this.settings, null, 2))
    console.log('saving settings', this.settings)
  }
  getVideos (query = {}) {
    const isFiltering = Object.keys(query).length > 0 && query.filter
    let videos = this.videos
    .filter(v => isFiltering ? true : !v.ignored)
    .sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt))

    if (isFiltering) {
      console.log({query})
      const searchTerm = query.filter.toLowerCase()
      videos = videos.filter(v => {
        return v.channelName.toLowerCase().includes(searchTerm)
        || v.title?.toLowerCase().includes(searchTerm) 
        || v.description?.toLowerCase().includes(searchTerm)
      })
    }
    videos = videos.filter((_, i) => i < 100)
    
    return videos
  }
  getVideo(id) {
    return this.videos.find(v => v.id === id)
  }
  getChannelVideos (name) {
    console.log('get channel videos', name)
    return this.videos.filter(v => v.channelName === name)
  }
  upsertVideos(videos) {
    (Array.isArray(videos) ? videos : [videos])
    .forEach(v => {
      const index = this.videos.findIndex(video => video.id === v.id)
      if (index !== -1) {
        this.videos[index] = Object.assign(this.videos[index], v)
      } else {
        this.videos.push(v)
        console.log('upsert video, insert', v.id)
      }
    })
    this.saveVideos()
  }
  updateVideo(id, update) {
    const index = this.videos.findIndex(v => v.id === id)
    if (index !== -1) {
      Object.assign(this.videos[index], update)
      this.saveVideos()
      return this.videos[index]
    } else {
      console.log('cannot update video, video does not exist', id)
    }
  }
  deleteVideo(id) {
    this.videos = this.videos.map(v => {
      if (v.id === id) {
        console.log('deleting video', id)
        return Object.assign(v, {downloaded: false})
      }
      return v
    })
    this.saveVideos()
    
    const files = fs.readdirSync(`${this.basePath}/videos`)
    files.forEach(file => {
      if (file.startsWith(id)) {
        console.log('deleting video file', file)
        fs.unlinkSync(`${this.basePath}/videos/${file}`)
      }
    })
  }
  saveVideos() {
    fs.writeFileSync(this.paths.videos, JSON.stringify(this.videos, null, 2))
  }
  toggleIgnoreVideo(id) {
    const index = this.videos.findIndex(v => v.id === id)
    let ignored = false
    if (index !== -1) {
      ignored = this.videos[index].ignored = !this.videos[index].ignored
      console.log('set video ignored', id, ignored)
    } else {
      console.log('cannot set video ignored, video does not exist', id)
    }
    this.saveVideos()
    return ignored
  }
  setVideoTranscript(id, transcript = '') {
    console.log('set video transcript', id)
    return this.updateVideo(id, {transcript})
  }
  setVideoSummary(id, summary = '') {
    console.log('set video summary', id)
    return this.updateVideo(id, {summary})
  }
  setVideoDownloaded(id, downloaded = true) {
    console.log('set video downloaded', id)
    return this.updateVideo(id, {downloaded})
  }
  patchVideo(video) {
    if (this.getVideo(video.id)) return video
    return Object.assign(video, {addedAt: Date.now()})
  }
  getVideoQuality() {
    return this.settings.videoQuality
  }
  setVideoQuality(videoQuality) {
    if ([360, 480, 720, 1080, 1440, 2160].includes(videoQuality)) {
      this.settings.videoQuality = videoQuality
      this.saveSettings()
    } else {
      console.log('Invalid video quality', videoQuality)
    }
    return this.settings.videoQuality
  }
}