
class VideoElement extends HTMLElement {
  constructor () {
    super()
  }

  connectedCallback () {
    this.video = JSON.parse(this.dataset['data'])
    this.render()
    this.registerEvents()
  }
  disconnectedCallback () {
    this.unregisterEvents()
  }
  static get observedAttributes() {
    return ['data-data'];
  }

  attributeChangedCallback(name, _, newValue) {
    if (name === 'data-data') {
      this.video = JSON.parse(this.dataset['data'])
      this.unregisterEvents()
      this.render()
      this.registerEvents()
    }
  }
  render () {
    if (!this.video) return
    this.classList.add('video')
    this.dataset['videoId'] = this.video.id
    this.innerHTML = `
      ${this.video.downloaded
      ? `<video controls width="280">
          <source src="/videos/${this.video.id}" type="video/mp4" />
          <p>
            Your browser does not support the video tag.
            Download the video instead <a href="/videos/${this.video.id}" target="_blank">here</a>
          </p>
        </video>`
      : `<img loading="lazy" src="${this.video.thumbnail}"/>`}
      <div>
        <span>${new Date(this.video.publishedAt).toISOString().substring(0, 16)}</span> | <span>${this.video.viewCount}</span> | <span>${this.video.duration || 'N/A'}</span><br/>
      </div>
      <h4>${this.video.title}</h4>
      <div class="actions">
        ${this.video.downloaded
          ? ''
          : `<span tabindex="0"  class="action download" data-video-id="${this.video.id}">⬇️ Download</span>`}
        ${!this.video.summary
          ? `<span tabindex="0"  class="action summarize" data-video-id="${this.video.id}">📖 Summarize</span>`
          : `<span tabindex="0"  class="action show-summary" data-video-id="${this.video.id}">📖 Summary</span>`}
      </div>
    `
  }
  registerEvents () {
    handleClick(this.querySelector('.action.download'), this.downloadVideoHandler.bind(this))
    handleClick(this.querySelector('.action.summarize'), this.summarizeVideoHandler.bind(this))
    handleClick(this.querySelector('.action.show-summary'), this.showSummaryHandler.bind(this))
    
    function handleClick ($el, handler) {
      if (!$el) return
      $el.addEventListener('click', handler)
      $el.addEventListener('keydown', (event) => event.key === 'Enter' && handler(event))
    }
  }
  unregisterEvents () {
    handleClick(this.querySelector('.action.download'), this.downloadVideoHandler.bind(this))
    handleClick(this.querySelector('.action.summarize'), this.summarizeVideoHandler.bind(this))
    handleClick(this.querySelector('.action.show-summary'), this.showSummaryHandler.bind(this))

    function handleClick ($el, handler) {
      if (!$el) return
      $el.removeEventListener('click', handler)
      $el.removeEventListener('keydown', (event) => event.key === 'Enter' && handler(event))
    }
  }
  downloadVideoHandler (event) {
    event.preventDefault()
    const downloadStartedText = '⚡️ Download started'
    if (event.target.innerText === downloadStartedText) return console.log('already downloading')
    event.target.innerText = downloadStartedText
    fetch('/download-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: this.video.id }),
    })
    .then(() => console.log('Download started'))
    .catch((error) => console.error('Error starting download:', error))
  }
  summarizeVideoHandler (event) {
    event.preventDefault()
    const summaryStartedText = '⚡️ summary started'
    if (event.target.innerText === summaryStartedText) return console.log('already summarizing')
    event.target.innerText = summaryStartedText
    fetch('/summarize-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: this.video.id }),
    })
    .then(() => console.log('summary started'))
    .catch((error) => console.error('Error starting summary:', error))
  }
  showSummaryHandler (event) {
    event.preventDefault()
    const video = this.video
    if (video) {
      document.querySelector('dialog#summary').showModal()
      document.querySelector('dialog#summary div').innerHTML = `<pre>${video.summary}</pre><details><summary>transcript</summary><pre>${video.transcript}</pre></details>`
    }
  }
}
customElements.define('video-element', VideoElement)


class Store {
  showThumbnailsKey = 'showThumbnails'
  lastVideosKey = 'lastVideos'

  constructor() {
    if (!localStorage.getItem(this.showThumbnailsKey)) localStorage.setItem(this.showThumbnailsKey, 'true')
    if (!localStorage.getItem(this.lastVideosKey)) localStorage.setItem(this.lastVideosKey, '{}')
  }

  toggle (key) {
    if (![this.showThumbnailsKey].includes(key)) return console.error('invalid key', key)
    localStorage.setItem(key, localStorage.getItem(key) === 'true' ? 'false' : 'true')
  }
  get(key) {
    if (![this.showThumbnailsKey, this.lastVideosKey].includes(key)) return console.error('invalid key', key)
    return JSON.parse(localStorage.getItem(key))
  }
  set(key, value) {
    if (typeof value === 'string') {
      localStorage.setItem(key, value)
    } else {
      localStorage.setItem(key, JSON.stringify(value))
    }
  }
  // push(key, item) {
  //   if (![this.ignoreVideoKey].includes(key)) return console.error('invalid key', key)
  //   const list = this.get(key)
  //   list.push(item)
  //   this.set(key, list)
  //   return item
  // }
}

// app: sse updates and renders
const eventSource = new window.EventSource('/')
const $videosContainer = document.querySelector('.main-videos-container')

eventSource.onmessage = (message) => {
  if (!message || !message.data) return console.error('skipping empty message')
  try {
    const data = JSON.parse(message.data, {})
    console.log('[sse] message', data)

    if (data.type === 'download-log-line' && data.line) {
      const $downloadLog = document.querySelector('.download-log');
      $downloadLog.open = true;
      const $downloadLogLines = document.querySelector('.download-log .lines');
      const text = $downloadLogLines.innerText
      let lines = text.split('\n')
      lines = lines.join('\n') + '\n' + data.line
      $downloadLogLines.innerText = lines
      $downloadLogLines.scrollTop = $downloadLogLines.scrollHeight;
    }
    
    if (data.type === 'all' && data.videos) {
      $videosContainer.innerHTML = ''
      const allVideos = Object.entries(data.videos).reduce((acc, curr) => acc.concat(curr[1]), [])
      allVideos
      .sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt))
      .forEach(video => {
        $videosContainer.appendChild(createVideoElement(video))
      })

      updateDownloadedVideos(allVideos)
      window.videos = data.videos
    }
    if (data.type === 'summary' && data.videoId && data.summary) {
      const $video = document.querySelector(`[data-video-id="${data.videoId}"]`)
      if ($video) {
        const videoData = JSON.parse($video.dataset['data'])
        videoData.summary = data.summary
        $video.dataset['data'] = JSON.stringify(videoData)
      }
    }
    if (data.type === 'downloaded' && data.videoId) {
      const $video = document.querySelector(`[data-video-id="${data.videoId}"]`)
      if ($video) {
        const videoData = JSON.parse($video.dataset['data'])
        videoData.downloaded = true
        $video.dataset['data'] = JSON.stringify(videoData)
      }
    }
  } catch (err) {
    console.error('sse parse error', err)
  }
}

document.getElementById('add-channel-form').addEventListener('submit', addChannelHandler)
document.getElementById('search').addEventListener('keyup', searchHandler)

function searchHandler (event) {
  event.preventDefault()
  const searchTerm = event.target.value.toLowerCase()
  document.querySelectorAll('.video').forEach(video => {
    const videoData = JSON.parse(video.dataset['data'])
    if (
      videoData.title.toLowerCase().includes(searchTerm)
       || videoData.summary?.toLowerCase().includes(searchTerm)
       || videoData.channelName?.toLowerCase().includes(searchTerm)
      ) {
      video.style.display = ''
    } else {
      video.style.display = 'none'
    }
  })
}

const store = new Store()

// settings modal
const $settings = document.querySelector("dialog#settings")
const $openSettings = document.querySelector("#open-settings")
const $closeSettings = $settings.querySelector("button")
$openSettings.addEventListener("click", () => $settings.showModal())
$closeSettings.addEventListener("click", () => $settings.close())

// video player modal
const $videoPlayer = document.querySelector('dialog#video-player')
const $closeVideoPlayer = $videoPlayer.querySelector("button")
$closeVideoPlayer.addEventListener("click", () => $videoPlayer.close())
$videoPlayer.addEventListener('close', () => $videoPlayer.querySelector('video')?.pause())

// summary modal
const $summary = document.querySelector('dialog#summary')
const $closeSummary = $summary.querySelector("button")
$closeSummary.addEventListener("click", () => $summary.close())
$summary.addEventListener('close', () => {})

// settings ui
const $showThumbnails = document.getElementById('show-thumbnails')
$showThumbnails.addEventListener('click', (event) => {
  store.toggle(store.showThumbnailsKey)
  applyShowThumbnails(store.get(store.showThumbnailsKey))
})

// apply settings                                                                                                                                                          
applyShowThumbnails(store.get(store.showThumbnailsKey))

// observe dialog open/close and prevent body background scroll
observeDialogOpenPreventScroll($settings)
observeDialogOpenPreventScroll($videoPlayer)
observeDialogOpenPreventScroll($summary)


function observeDialogOpenPreventScroll (dialog) {
  new MutationObserver((mutationList, observer) => {
    for (const mutation of mutationList) {
      if (mutation.type === "attributes" && mutation.attributeName === 'open') {
        document.body.classList[mutation.target.open ? 'add' : 'remove']('dialog-opened')
      }
    }
  }).observe(dialog, { attributes: true, childList: true, subtree: true })
}

function applyShowThumbnails(showThumbnails) {
  if (showThumbnails) {
    document.body.classList.remove('hide-thumbnails')
  } else {
    document.body.classList.add('hide-thumbnails')
  }
  document.querySelector('#show-thumbnails').checked = showThumbnails
}

function addChannelHandler(event) {
  event.preventDefault()

  const form = event.target
  const button = form.querySelector('button')
  const input = form.querySelector('input')
  const loader = form.querySelector('.loader')
  freezeForm()
  
  const channelName = document.getElementById('channel-name').value

  if (!channelName) return alert('empty channel name'), unfreezeForm();

  fetch('/channels', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: channelName })
  })
  .then(() => document.getElementById('add-channel-form').reset())
  .catch(error => console.error('Error adding channel:', error))
  .finally(unfreezeForm)

  function freezeForm() {
    input.disabled = true
    button.disabled = true
    loader.classList.add('show')
  }
  function unfreezeForm() {
    input.disabled = false
    button.disabled = false
    loader.classList.remove('show')
  }
}


function channelSectionFor (name, videos) {
  const $channelSection = document.createElement('details')
  $channelSection.dataset['channel'] = name
  $channelSection.classList.add('channel-details')
  $channelSection.innerHTML = `<summary>${name}</summary>`
  $channelSection.appendChild(channelVideosContents(videos))
  return $channelSection
}

function channelVideosContents (videos) {
  if (!videos) return
  const $videosContainer = document.createElement('div')
  $videosContainer.classList.add('videos-container')
  videos
  .sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt))
  .forEach(video => {
    $videosContainer.appendChild(createVideoElement(video))
  })
  return $videosContainer
}

function createVideoElement (video) {
  const $video = document.createElement('video-element')
  $video.dataset['data'] = JSON.stringify(video)
  return $video
}

function updateDownloadedVideos (videos) {
  const $downloadedVideosContainer = document.querySelector('details.downloaded-videos-container')
  const $videosContainer = $downloadedVideosContainer.querySelector('.videos-container')
  videos.filter(v => v.downloaded).forEach(v => {
    const $existing = $downloadedVideosContainer.querySelector(`[data-video-id="${v.id}"]`)
    return $existing 
    ? $existing.replaceWith(createVideoElement(v)) 
    : $videosContainer.appendChild(createVideoElement(v))
  })
}