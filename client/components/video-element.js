function handleClickAddListener ($el, handler) {
  if (!$el) return
  $el.addEventListener('click', handler)
  $el.addEventListener('keydown', (event) => event.key === 'Enter' && handler(event))
}
function handleClickRemoveListener ($el, handler) {
  if (!$el) return
  $el.removeEventListener('click', handler)
  $el.removeEventListener('keydown', (event) => event.key === 'Enter' && handler(event))
}

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
    if (this.video.summary) this.dataset['summarized'] = "true"
    else this.dataset['summarized'] = "false"
    if (this.video.downloaded) this.dataset['downloaded'] = "true"
    else this.dataset['downloaded'] = "false"
    if (this.video.ignored) this.dataset['ignored'] = "true"
    else this.dataset['ignored'] = "false"
    this.innerHTML = /*html*/`
      ${this.video.downloaded
      ? /*html*/`<div class="play-video-placeholder" style="background-image: url(${this.video.thumbnail})"><div class="play-icon"></div></div>`
      : /*html*/`<img loading="lazy" src="${this.video.thumbnail}"/>`}
      <span class="action ignore" tabindex="0">ignore</span>
      <div class="info">
        <span class="channel-name">${this.video.channelName}</span>
        <br>
        <div class="flex">
          <span>${new Date(this.video.publishedAt).toISOString().substring(0, 10)}</span>
          <span>${this.video.viewCount}</span>
          <span>${this.video.duration || 'N/A'}</span><br/>
        </div>
      </div>
      <h4 class="title">${this.video.title}</h4>
      <div class="actions flex">
        ${this.video.downloaded
          ? ''
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
    handleClickAddListener(this.querySelector('.action.download'), this.downloadVideoHandler.bind(this))
    handleClickAddListener(this.querySelector('.action.summarize'), this.summarizeVideoHandler.bind(this))
    handleClickAddListener(this.querySelector('.action.show-summary'), this.showSummaryHandler.bind(this))
    handleClickAddListener(this.querySelector('.action.ignore'), this.toggleIgnoreVideoHandler.bind(this))
    handleClickAddListener(this.querySelector('.channel-name'), this.filterByChannelHandler.bind(this))
    handleClickAddListener(this.querySelector('.play-video-placeholder'), this.watchVideoHandler.bind(this))
    this.querySelector('video') && this.registerVideoEvents(this.querySelector('video'))
  }
  unregisterEvents () {
    handleClickRemoveListener(this.querySelector('.action.download'), this.downloadVideoHandler.bind(this))
    handleClickRemoveListener(this.querySelector('.action.summarize'), this.summarizeVideoHandler.bind(this))
    handleClickRemoveListener(this.querySelector('.action.show-summary'), this.showSummaryHandler.bind(this))
    handleClickRemoveListener(this.querySelector('.action.ignore'), this.toggleIgnoreVideoHandler.bind(this))
    handleClickRemoveListener(this.querySelector('.channel-name'), this.filterByChannelHandler.bind(this))
    this.querySelector('video') && this.unregisterVideoEvents(this.querySelector('video'))
  }
  watchVideoHandler (event) {
    event.preventDefault()
    this.querySelector('.play-video-placeholder').outerHTML = /*html*/`<video controls width="280">
      <source src="/videos/${this.video.id}" type="video/mp4" />
      <p>
        Your browser does not support the video tag.
        Download the video instead <a href="/videos/${this.video.id}" target="_blank">here</a>
      </p>
    </video>`
    this.pauseOtherVideos()
    this.querySelector('video').play()
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

    fetch('/ignore-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: this.video.id }),
    })
    .then(res => res.json())
    .then((ignored) => {
      console.log({ignored})
      this.video.ignored = ignored
      this.render()
    })
    .catch((error) => {
      console.error('Error ignoring summary:', error)
      this.render()
    })
  }
  filterByChannelHandler (event) {
    // find search input, set value to channelname
    const $searchInput = document.querySelector('#search')
    if ($searchInput && $searchInput.value !== this.video.channelName) {
      $searchInput.value = this.video.channelName
    } else {
      $searchInput.value = ''
    }
    $searchInput.dispatchEvent(new Event('keyup'))
  }
  registerVideoEvents (video) {
    video.addEventListener('play', this.pauseOtherVideos.bind(this, video))
  }
  unregisterVideoEvents (video) {
    video.removeEventListener('play', this.pauseOtherVideos.bind(this, video))
  }
  pauseOtherVideos (video) {
    document.querySelectorAll('video').forEach(v => v !== video && !v.paused && v.pause())
  }
}
customElements.define('video-element', VideoElement)
