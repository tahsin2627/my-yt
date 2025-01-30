class AddChannelForm extends HTMLElement {
  constructor () {
    super()
  }
  connectedCallback () {
    this.render()
    this.registerEvents()
  }
  disconnectedCallback () {
    this.unregisterEvents()
  }
  registerEvents () {
    this.querySelector('form').addEventListener('submit', this.addChannelHandler.bind(this))
  }
  unregisterEvents () {
    this.querySelector('form').removeEventListener('submit', this.addChannelHandler.bind(this))
  }
  render () {
    this.innerHTML = `
      <form id="add-channel-form">
        <label for="channel-name">Add a new channel</label>
        <input type="text" id="channel-name" placeholder="Channel Name" required>
        <button type="submit">Submit</button>
        <span class="loader"></span>
      </form>
    `
  }

  addChannelHandler (event) {
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
    .then(() => form.reset())
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
}
customElements.define('add-channel-form', AddChannelForm)


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
      updateSummarizedVideos(allVideos)
      updateChannels(Object.entries(data.videos).map(([channelName, _]) => channelName))
      window.videos = data.videos
    }
    if (data.type === 'summary' && data.videoId && data.summary && data.transcript) {
      ;[...document.querySelectorAll(`[data-video-id="${data.videoId}"]`)].forEach($video => {
        const videoData = JSON.parse($video.dataset['data'])
        Object.assign(videoData, { summary: data.summary, transcript: data.transcript })
        $video.dataset['data'] = JSON.stringify(videoData)
        updateSummarizedVideos([data.videoId])
      })
    }
    if (data.type === 'downloaded' && data.videoId) {
      ;[...document.querySelectorAll(`[data-video-id="${data.videoId}"]`)].forEach($video => {
        const videoData = JSON.parse($video.dataset['data'])
        videoData.downloaded = true
        $video.dataset['data'] = JSON.stringify(videoData)
        updateDownloadedVideos([data.videoId])
      })
    }
  } catch (err) {
    console.error('sse parse error', err)
  }
}

class SearchVideos extends HTMLElement {
  constructor () {
    super()
  }
  connectedCallback () {
    this.render()
    this.registerEvents()
  }
  disconnectedCallback () {
    this.deregisterEvents()
  }
  registerEvents () {
    this.querySelector('input').addEventListener('keyup', this.searchHandler.bind(this))
  }
  deregisterEvents () {
    this.querySelector('input').removeEventListener('keyup', this.searchHandler.bind(this))
  }
  render () {
    this.innerHTML = `<input type="text" id="search" placeholder="Search videos" autofocus>`
  }
  searchHandler (event) {
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
}
customElements.define('search-videos', SearchVideos)

const store = new Store()

// settings modal
const $settings = document.querySelector("dialog#settings")
const $openSettings = document.querySelector("#open-settings")
const $closeSettings = $settings.querySelector("button")
$openSettings.addEventListener("click", () => $settings.showModal())
$closeSettings.addEventListener("click", () => $settings.close())

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


function createVideoElement (video) {
  const $video = document.createElement('video-element')
  $video.dataset['data'] = JSON.stringify(video)
  return $video
}

function updateDownloadedVideos (videos = []) {
  const $downloadedVideosContainer = document.querySelector('details.downloaded-videos-container')
  const $videosContainer = $downloadedVideosContainer.querySelector('.videos-container')
  videos.filter(v => v.downloaded).forEach(v => {
    const $existing = $downloadedVideosContainer.querySelector(`[data-video-id="${v.id}"]`)
    return $existing 
    ? $existing.replaceWith(createVideoElement(v)) 
    : $videosContainer.appendChild(createVideoElement(v))
  })
}
function updateSummarizedVideos (videos = []) {
  const $summarizedVideosContainer = document.querySelector('details.summarized-videos-container')
  const $videosContainer = $summarizedVideosContainer.querySelector('.videos-container')
  videos.filter(v => v.summary).forEach(v => {
    const $existing = $summarizedVideosContainer.querySelector(`[data-video-id="${v.id}"]`)
    return $existing 
    ? $existing.replaceWith(createVideoElement(v)) 
    : $videosContainer.appendChild(createVideoElement(v))
  })
}

function updateChannels (channels = []) {
  channels.sort()
  const $channelsContainer = document.querySelector('details.channels-container div')
  channels.forEach(channel => {
    const $existingChannel = $channelsContainer.querySelector(`[data-channel="${channel}"]`)
    if ($existingChannel) {
      $existingChannel.replaceWith(createChannelElement(channel))
    } else {
      $channelsContainer.appendChild(createChannelElement(channel))
    }
  })
}

function createChannelElement (channel = '') {
  const $channel = document.createElement('div')
  $channel.dataset.channel = channel
  $channel.classList.add('channel')
  $channel.innerText = channel
  $channel.addEventListener('click', function (event) {
    
    const $searchInput = document.querySelector('#search')
    if ($searchInput.value === channel) {
      $searchInput.value = ''
      event.target.classList.remove('active')
    } else {
      $searchInput.value = channel
      event.target.parentNode.querySelector('.active')?.classList.remove('active')
      event.target.classList.add('active')
    }
    $searchInput.dispatchEvent(new Event('keyup'))
  })
  return $channel
}