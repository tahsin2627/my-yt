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
    this.innerHTML = /*html*/`
      ${this.video.downloaded
      ? /*html*/`<video controls width="280">
          <source src="/videos/${this.video.id}" type="video/mp4" />
          <p>
            Your browser does not support the video tag.
            Download the video instead <a href="/videos/${this.video.id}" target="_blank">here</a>
          </p>
        </video>`
      : /*html*/`<img loading="lazy" src="${this.video.thumbnail}"/>`}
      <div class="info">
        <span class="channel-name">${this.video.channelName}</span>
        <br>
        <span>${new Date(this.video.publishedAt).toISOString().substring(0, 10)}</span> | <span>${this.video.viewCount}</span> | <span>${this.video.duration || 'N/A'}</span><br/>
      </div>
      <h4 class="title">${this.video.title}</h4>
      <div class="actions">
        ${this.video.downloaded
          ? ''
          : /*html*/`<span tabindex="0"  class="action download" data-video-id="${this.video.id}">⬇️ Download</span>`}
        ${!this.video.summary
          ? /*html*/`<span tabindex="0"  class="action summarize" data-video-id="${this.video.id}">📖 Summarize</span>`
          : /*html*/`<span tabindex="0"  class="action show-summary" data-video-id="${this.video.id}">📖 Summary</span>`}
        <a href="https://www.youtube.com/watch?v=${this.video.id}" target="_blank">📺 external</a>
      </div>
    `
  }
  registerEvents () {
    handleClick(this.querySelector('.action.download'), this.downloadVideoHandler.bind(this))
    handleClick(this.querySelector('.action.summarize'), this.summarizeVideoHandler.bind(this))
    handleClick(this.querySelector('.action.show-summary'), this.showSummaryHandler.bind(this))
    handleClick(this.querySelector('.channel-name'), this.filterByChannelHandler.bind(this))
    
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
    handleClick(this.querySelector('.channel-name'), this.filterByChannelHandler.bind(this))

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
      document.querySelector('dialog#summary div').innerHTML = /*html*/`
      <pre>${video.summary}</pre>
      <details>
        <summary>transcript</summary>
        <pre>${video.transcript}</pre>
      </details>
      `
    }
  }
  filterByChannelHandler (event) {
    // find search input, set value to channelname
    const $searchInput = document.querySelector('#search')
    if ($searchInput && $searchInput.value !== this.video.channelName) {
      $searchInput.value = this.video.channelName
      $searchInput.dispatchEvent(new Event('keyup'))
    } else {
      $searchInput.value = ''
      $searchInput.dispatchEvent(new Event('keyup'))
    }
  }
}
customElements.define('video-element', VideoElement)
