/* global HTMLElement, customElements */
import Store from '../lib/store.js'
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
    const newVideos = JSON.parse(this.dataset.videos || '[]')
    const showOriginalThumbnail = store.get(store.showOriginalThumbnailKey)

    const existingElementsMap = new Map()
    let currentChild = this.firstElementChild
    while (currentChild) {
      if (currentChild.tagName === 'VIDEO-ELEMENT' && currentChild.dataset.videoId) {
        existingElementsMap.set(currentChild.dataset.videoId, currentChild)
      }
      currentChild = currentChild.nextElementSibling
    }

    const newElementOrder = [] // To keep track of the desired order of elements

    // Process new videos: update existing, create new, and determine order
    for (const videoData of newVideos) {
      const videoId = videoData.id
      if (!videoId) {
        console.warn('Video data is missing an ID:', videoData)
        continue
      }

      if (showOriginalThumbnail && videoData.thumbnail && typeof videoData.thumbnail === 'string') {
        videoData.thumbnail = videoData.thumbnail.replace('mq2.jpg', 'mqdefault.jpg')
      }

      let videoElement = existingElementsMap.get(videoId)
      const stringifiedData = JSON.stringify(videoData)

      if (videoElement) {
        // Element exists
        if (videoElement.dataset.data !== stringifiedData) {
          console.log(`Video ${videoId}: Data changed, updating dataset.`)
          videoElement.dataset.data = stringifiedData
        } else {
          // console.log(`Video ${videoId}: Data unchanged.`);
        }
        existingElementsMap.delete(videoId) // Mark as processed/kept
      } else {
        // Element is new, create it
        console.log(`Video ${videoId}: Creating new element.`)
        videoElement = document.createElement('video-element')
        videoElement.dataset.videoId = videoId
        videoElement.dataset.data = stringifiedData
      }
      newElementOrder.push(videoElement)
    }

    // Remove old elements that are no longer in newVideos
    for (const [id, oldElement] of existingElementsMap) {
      console.log(`Video ${id}: Removing old element.`)
      oldElement.remove()
    }

    // Reconcile the DOM children with the newElementOrder
    // This ensures elements are in the correct order and new ones are added,
    // while minimizing direct DOM manipulation for elements already in place.

    let nextExpectedChild = this.firstElementChild
    for (const desiredElement of newElementOrder) {
      if (nextExpectedChild === desiredElement) {
        // Element is already in the correct position
        nextExpectedChild = nextExpectedChild.nextElementSibling
      } else {
        // Element is new, or needs to be moved
        // If desiredElement is already in the DOM (but wrong place), insertBefore will move it.
        // If desiredElement is new, insertBefore will add it.
        this.insertBefore(desiredElement, nextExpectedChild)
      }
    }

    // Remove any extra children at the end if newElementOrder is shorter than current children
    while (this.children.length > newElementOrder.length) {
      console.log('Removing trailing element:', this.lastElementChild.dataset.videoId)
      this.lastElementChild.remove()
    }
  }
}
customElements.define('videos-container', VideosContainer)
