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
    const $showDownloadedVideos = this.querySelector('#show-downloaded-videos')
    const $showSummarizedVideos = this.querySelector('#show-summarized-videos')
    const $showIgnoredVideos = this.querySelector('#show-ignored-videos')
    $showDownloadedVideos.addEventListener('click', this.handleDownloadedVideos.bind(this))
    $showSummarizedVideos.addEventListener('click', this.handleSummarizedVideos.bind(this))
    $showIgnoredVideos.addEventListener('click', this.handleIgnoredVideos.bind(this))
  }
  deregisterEvents () {
    const $showDownloadedVideos = this.querySelector('#show-downloaded-videos')
    const $showSummarizedVideos = this.querySelector('#show-summarized-videos')
    const $showIgnoredVideos = this.querySelector('#show-ignored-videos')
    $showDownloadedVideos.removeEventListener('click', this.handleDownloadedVideos.bind(this))
    $showSummarizedVideos.removeEventListener('click', this.handleSummarizedVideos.bind(this))
    $showIgnoredVideos.removeEventListener('click', this.handleIgnoredVideos.bind(this))
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
