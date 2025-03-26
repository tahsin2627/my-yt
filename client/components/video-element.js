class VideoElement extends HTMLElement {
  constructor () {
    super()
  }

  connectedCallback () {
    this.video = JSON.parse(this.dataset['data'])
    this.render()
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
      this.render()
    }
  }
  render () {
    if (!this.video) return

    this.unregisterEvents()

    this.classList.add('video')
    this.dataset['videoId'] = this.video.id
    this.dataset['date'] = this.video.publishedAt
    this.dataset['summarized'] = this.video.summary ? "true" : "false"
    this.dataset['downloaded'] = this.video.downloaded ? "true" : "false"
    this.dataset['ignored'] = this.video.ignored ? "true" : "false"

    this.innerHTML = /*html*/`
      ${this.video.downloaded
      ? /*html*/`<div class="play video-placeholder" style="background-image: url(${this.video.thumbnail})"><div class="play-icon"></div></div>`
      : /*html*/`<img title="Download video" class="download" loading="lazy" src="${this.video.thumbnail}"/>`}
      <span class="action ignore" tabindex="0">${this.video.ignored ? 'unignore' : 'ignore'}</span>
      <div class="info">
        <span class="channel-name">${this.video.channelName}</span>
        <br>
        <div class="flex">
          <span>${tryFormatDate(this.video.publishedAt)}</span>
          <span>${this.video.viewCount}</span>
          <span>${this.video.duration || 'N/A'}</span><br/>
        </div>
      </div>
      <h4 class="title">${this.video.title}</h4>
      <div class="actions flex">
        ${this.video.downloaded
          ? /*html*/`<span tabindex="0"  class="action delete" data-video-id="${this.video.id}">🗑️ Delete</span>`
          : /*html*/`<span tabindex="0"  class="action download" data-video-id="${this.video.id}">⬇️ Download</span>`}
        ${!this.video.summary
          ? /*html*/`<span tabindex="0"  class="action summarize" data-video-id="${this.video.id}">📖 Summarize</span>`
          : /*html*/`<span tabindex="0"  class="action show-summary" data-video-id="${this.video.id}">📖 Summary</span>`}
        <a href="https://www.youtube.com/watch?v=${this.video.id}" target="_blank">📺 external</a>
      </div>
    `
    
    this.registerEvents()
  }
  registerEvents () {
    utils.addClickListener(this.querySelector('.action.download'), this.downloadVideoHandler.bind(this))
    utils.addClickListener(this.querySelector('img.download'), this.downloadVideoHandler.bind(this))
    utils.addClickListener(this.querySelector('.action.delete'), this.deleteVideoHandler.bind(this))
    utils.addClickListener(this.querySelector('.action.summarize'), this.summarizeVideoHandler.bind(this))
    utils.addClickListener(this.querySelector('.action.show-summary'), this.showSummaryHandler.bind(this))
    utils.addClickListener(this.querySelector('.action.ignore'), this.toggleIgnoreVideoHandler.bind(this))
    utils.addClickListener(this.querySelector('.channel-name'), this.filterByChannelHandler.bind(this))
    utils.addClickListener(this.querySelector('.play.video-placeholder'), this.watchVideoHandler.bind(this))
  }
  unregisterEvents () {
    utils.removeClickListener(this.querySelector('.action.download'), this.downloadVideoHandler.bind(this))
    utils.removeClickListener(this.querySelector('img.download'), this.downloadVideoHandler.bind(this))
    utils.removeClickListener(this.querySelector('.action.delete'), this.deleteVideoHandler.bind(this))
    utils.removeClickListener(this.querySelector('.action.summarize'), this.summarizeVideoHandler.bind(this))
    utils.removeClickListener(this.querySelector('.action.show-summary'), this.showSummaryHandler.bind(this))
    utils.removeClickListener(this.querySelector('.action.ignore'), this.toggleIgnoreVideoHandler.bind(this))
    utils.removeClickListener(this.querySelector('.channel-name'), this.filterByChannelHandler.bind(this))
    utils.removeClickListener(this.querySelector('.play.video-placeholder'), this.watchVideoHandler.bind(this))
    this.querySelector('video') && this.unregisterVideoEvents(this.querySelector('video'))
  }
  watchVideoHandler (event) {
    event.preventDefault()
    this.querySelector('.play.video-placeholder').outerHTML = /*html*/`<video controls width="400">
      <source src="/videos/${this.video.id}" type="video/${this.video.format}" />
      <track default kind="captions" srclang="en" src="/captions/${this.video.id}" />
      <p>
        Your browser does not support the video tag.
        Download the video instead <a href="/videos/${this.video.id}" target="_blank">here</a>
      </p>
    </video>`

    this.querySelector('video').play()
    this.registerVideoEvents(this.querySelector('video'))
  }
  downloadVideoHandler (event) {
    event.preventDefault()
    
    const downloadStartedText = '⚡️ Download started'
    let $downloadButton = event.target.classList.contains('.action') ? event.target : this.querySelector('.action.download')
    if ($downloadButton.innerText === downloadStartedText) return
    else $downloadButton.innerText = downloadStartedText

    this.classList.add('downloading')

    fetch('/api/download-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: this.video.id }),
    })
    .catch((error) => console.error('Error starting download:', error))
  }
  deleteVideoHandler (event) {
    event.preventDefault()
    if (!confirm('About to delete video files, are you sure?')) return
    fetch('/api/delete-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: this.video.id }),
    })
    .then(() => {
      this.video.downloaded = false
      this.classList.remove('downloading')
      this.classList.remove('big')
      this.querySelector('video') && this.unregisterVideoEvents(this.querySelector('video'))
      this.render()
    })
    .catch((error) => console.error('Error deleting video:', error))  
  }
  summarizeVideoHandler (event) {
    event.preventDefault()
    const summaryStartedText = '⚡️ summary started'
    if (event.target.innerText === summaryStartedText) return
    event.target.innerText = summaryStartedText
    fetch('/api/summarize-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: this.video.id }),
    })
    .catch((error) => console.error('Error starting summary:', error))
  }
  showSummaryHandler (event) {
    event.preventDefault()
    const video = this.video
    if (video) {
      document.querySelector('dialog#summary').showModal()
      document.querySelector('dialog#summary div').innerHTML = /*html*/`
      <pre>${video.summary}</pre>
      <details>
        <summary>transcript</summary>
        <pre>${video.transcript}</pre>
      </details>
      `
    }
  }
  toggleIgnoreVideoHandler (event) {
    event.preventDefault()

    
    fetch('/api/ignore-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: this.video.id }),
    })
    .then(() => this.remove())
    .catch((error) => {
      console.error('Error ignoring video:', error)
      this.classList.remove('hide')
      this.render()
    })
  }
  filterByChannelHandler (event) {
    const $searchInput = document.querySelector('#search')
    const channel = `@${this.video.channelName}`
    $searchInput.value = ($searchInput && $searchInput.value !== channel) ? channel : ''
    $searchInput.dispatchEvent(new Event('keyup'))
  }
  registerVideoEvents (video) {
    video.addEventListener('play', () => {
      this.classList.add('big')
      setTimeout(this.scrollIntoViewWithOffset.bind(this, document.querySelector('body > header').clientHeight, "smooth"), 110)
      this.pauseOtherVideos(video)
    })
  }
  unregisterVideoEvents (video) {
    video.removeEventListener('play', this.pauseOtherVideos.bind(this, video))
  }
  pauseOtherVideos (video) {
    document.querySelectorAll('video').forEach(v => {
      if (v !== video) {
        v.pause()
        v.parentElement.classList.remove('big')
      }
    })
  }

  scrollIntoViewWithOffset (offset, behavior = 'smooth') {
    const top = this.getBoundingClientRect().top - offset - document.body.getBoundingClientRect().top
    scrollTo({ top, behavior })
  }  
}

customElements.define('video-element', VideoElement)

function tryFormatDate(date) {
  try {
    return new Date(date).toISOString().substring(0, 10)
  } catch (err) {
    return 'N/A'
  }
}