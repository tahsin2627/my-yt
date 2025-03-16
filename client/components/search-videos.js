
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
    this.innerHTML = `<input type="search" id="search" placeholder="Search videos" autofocus>`
  }
  searchHandler (event) {
    event.preventDefault()
    const searchTerm = event.target.value.trim().toLowerCase()
    const $status = document.querySelector('#filter-results-status')
    if (!searchTerm) {
      if ($status) $status.innerText = ''
      return console.log('no search term')
    }
    let filteredCount = 0
    document.querySelectorAll('.video').forEach(video => {
      const videoData = JSON.parse(video.dataset['data'])
      if (
        videoData.title.toLowerCase().includes(searchTerm)
         || videoData.summary?.toLowerCase().includes(searchTerm)
         || videoData.channelName?.toLowerCase().includes(searchTerm)
        ) {
        video.style.display = ''
        filteredCount++
      } else {
        video.style.display = 'none'
      }
    })
    if ($status) {
      if (filteredCount > 0) $status.innerText = `Found ${filteredCount} videos`
      else $status.innerText = `No videos found`
    }
  }
}
customElements.define('search-videos', SearchVideos)
