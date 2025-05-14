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

  _prepareVideoElementData (videoData, showOriginalThumbnail) {
    const dataForChild = { ...videoData }
    if (showOriginalThumbnail && dataForChild.thumbnail && typeof dataForChild.thumbnail === 'string') {
      dataForChild.thumbnail = dataForChild.thumbnail.replace('mq2.jpg', 'mqdefault.jpg')
    }
    return JSON.stringify(dataForChild)
  }

  render () {
    const newVideos = JSON.parse(this.dataset.videos || '[]')
    const showOriginalThumbnail = store && store.get(store.showOriginalThumbnailKey)
    const existingVideoElementsMap = new Map()
    for (const child of this.children) {
      if (child.tagName === 'VIDEO-ELEMENT' && child.dataset.videoId) {
        existingVideoElementsMap.set(child.dataset.videoId, child)
      }
    }
    const fragment = document.createDocumentFragment()
    const newVideoIds = new Set()

    for (const videoData of newVideos) {
      newVideoIds.add(videoData.id)
      let videoElement = existingVideoElementsMap.get(videoData.id)

      const preparedData = this._prepareVideoElementData(videoData, showOriginalThumbnail)

      if (videoElement) {
        if (videoElement.dataset.data !== preparedData) {
          videoElement.dataset.data = preparedData
        }
        existingVideoElementsMap.delete(videoData.id)
      } else {
        videoElement = document.createElement('video-element')
        videoElement.dataset.videoId = videoData.id
        videoElement.dataset.data = preparedData
      }
      fragment.appendChild(videoElement)
    }

    for (const oldVideoElement of existingVideoElementsMap.values()) {
      oldVideoElement.remove()
    }

    this.replaceChildren(fragment)
  }
}
customElements.define('videos-container', VideosContainer)
