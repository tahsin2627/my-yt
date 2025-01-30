
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
