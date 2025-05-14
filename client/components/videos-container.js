/* global HTMLElement, customElements */
import Store from '/lib/store.js' /* eslint-disable-line */
const store = new Store()

class VideosContainer extends HTMLElement {
  connectedCallback () {
    this.render()
  }

  static get observedAttributes () {
    return ['data-videos']
  }

  attributeChangedCallback (name, _, newValue) {
    console.log('attributeChangedCallback', name)
    this.render()
  }

  render () {
    const videos = JSON.parse(this.dataset.videos || '[]')
    console.log('videos', videos)

    this.innerHTML = ''

    for (const video of videos) {
      const $video = document.createElement('video-element')
      $video.dataset.data = JSON.stringify(Object.assign(video, store.get(store.showOriginalThumbnailKey)
        ? {
            thumbnail: video.thumbnail.replace('mq2.jpg', 'mqdefault.jpg')
          }
        : {}))
      $video.dataset.videoId = video.id
      this.appendChild($video)
    }
  }
}
customElements.define('videos-container', VideosContainer)
