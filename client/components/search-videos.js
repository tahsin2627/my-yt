
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
    const searchTerm = event.target.value.toLowerCase()
    if (searchTerm.startsWith('https://')) {
      if (event.key !== 'Enter') return
      console.log('Downloading video...')
      event.target.value = ''
      // send request to server to download video
      fetch('/download-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: searchTerm })
      })
      .then(() => alert('Video downloaded successfully'))
      .catch(error => alert('Error downloading video: ' + error.message))
       return
    }
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
