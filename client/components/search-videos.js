
class SearchVideos extends HTMLElement {
  constructor () {
    super()
    this.previousSearchTerm = ''
  }
  connectedCallback () {
    this.render()
    this.registerEvents()
  }
  disconnectedCallback () {
    this.unregisterEvents()
  }
  registerEvents () {
    if (this.querySelector('input'))
      this.querySelector('input').addEventListener('keyup', this.searchHandler.bind(this))
  }
  unregisterEvents () {
    if (this.querySelector('input'))
      this.querySelector('input').removeEventListener('keyup', this.searchHandler.bind(this))
  }
  render () {
    this.innerHTML = /*html*/`<input type="search" incremental="incremental" id="search" placeholder="🔍 Search videos or paste video url" autofocus>`
  }
  searchHandler (event) {
    event.preventDefault()
    let searchTerm = event.target.value.trim()
    if (this.previousSearchTerm === searchTerm) return
    this.previousSearchTerm = searchTerm

    const $status = document.querySelector('#filter-results-status')
    $status.innerText = ''

    if (searchTerm.match('https?://')) {
      fetch('/api/download-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: searchTerm, external: true }),
      })
      .then(() => console.log('Download started'))
      .catch((error) => console.error('Error starting download:', error))
      event.target.value = ''
      return
    }

    searchTerm = searchTerm.toLowerCase()
    document.body.classList.add('searching')

    fetch(`/api/videos?filter=${encodeURIComponent(searchTerm)}`)
    .then(res => res.json())
    .then((videos) => {
      const $videosContainer = document.querySelector('.main-videos-container')
      if (!$videosContainer) return
      $videosContainer.innerHTML = ''
      const showOriginalThumbnail = window.store.get(store.showOriginalThumbnailKey)
      videos.forEach(video => 
        $videosContainer.appendChild(window.createVideoElement(video, showOriginalThumbnail))
      )
      if (!searchTerm) {
        $status.innerText = ''
      } else {
        if (videos.length > 0) $status.innerText = `Found ${videos.length} videos`
        else $status.innerText = `No videos found`
      }
    })
    .catch(err => {
      console.error(err)
    })
    .finally(() => {
      document.body.classList.remove('searching')
    })
  }
}
customElements.define('search-videos', SearchVideos)
