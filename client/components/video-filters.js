class VideoFilters extends HTMLElement {
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
    this.querySelector('#show-downloaded-videos').addEventListener('click', this.handleDownloadedVideos.bind(this))
    this.querySelector('#show-summarized-videos').addEventListener('click', this.handleSummarizedVideos.bind(this))
    this.querySelector('#show-ignored-videos').addEventListener('click', this.handleIgnoredVideos.bind(this))
  }
  deregisterEvents () {
    this.querySelector('#show-downloaded-videos').removeEventListener('click', this.handleDownloadedVideos.bind(this))
    this.querySelector('#show-summarized-videos').removeEventListener('click', this.handleSummarizedVideos.bind(this))
    this.querySelector('#show-ignored-videos').removeEventListener('click', this.handleIgnoredVideos.bind(this))
  }
  render () {
    this.innerHTML = /*html*/`
<div id="filters-container" class="flex space-around p-1">
  <button id="show-downloaded-videos">Downloaded videos</button>
  <button id="show-summarized-videos">Summarized videos</button>
  <button id="show-ignored-videos">Ignored videos</button>
</div>
    `
  }
  handleDownloadedVideos(event) {
    event.target.classList.toggle('active')
    document.body.classList.toggle('show-downloaded-videos')
  }
  handleSummarizedVideos(event) {
    event.target.classList.toggle('active')
    document.body.classList.toggle('show-summarized-videos')
  }
  handleIgnoredVideos(event) {
    event.target.classList.toggle('active')
    document.body.classList.toggle('show-ignored-videos')
  }
}
customElements.define('video-filters', VideoFilters)
