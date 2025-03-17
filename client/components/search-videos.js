
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
    this.querySelector('input').addEventListener('search', this.searchHandler.bind(this))
  }
  deregisterEvents () {
    this.querySelector('input').removeEventListener('search', this.searchHandler.bind(this))
  }
  render () {
    this.innerHTML = /*html*/`<input type="search" incremental="incremental" id="search" placeholder="Search videos" autofocus>`
  }
  searchHandler (event) {
    event.preventDefault()
    const searchTerm = event.target.value.trim().toLowerCase()
    const $status = document.querySelector('#filter-results-status')
    const $videos = document.querySelectorAll('.video')
    if (!searchTerm) {
      if ($status) $status.innerText = ''
      $videos.forEach($video => $video.style.display = '')
      document.body.classList.remove('searching')
      return console.log('no search term')
    }
    document.body.classList.add('searching')
    let filteredCount = 0
    $videos.forEach($video => {
      const videoData = JSON.parse($video.dataset['data'])
      if (
        videoData.title.toLowerCase().includes(searchTerm)
         || videoData.summary?.toLowerCase().includes(searchTerm)
         || videoData.channelName?.toLowerCase().includes(searchTerm)
        ) {
        $video.style.display = ''
        filteredCount++
      } else {
        $video.style.display = 'none'
      }
    })
    if ($status) {
      if (filteredCount > 0) $status.innerText = `Found ${filteredCount} videos`
      else $status.innerText = `No videos found`
    }
  }
}
customElements.define('search-videos', SearchVideos)
