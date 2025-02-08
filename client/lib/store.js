export default class Store {
  showThumbnailsKey = 'showThumbnails'
  lastVideosKey = 'lastVideos'
  ignoreVideoKey = 'ignoreVideo'
  ignoreTermsKey = 'ignoreTerms'

  constructor() {
    if (!localStorage.getItem(this.showThumbnailsKey)) localStorage.setItem(this.showThumbnailsKey, 'true')
    if (!localStorage.getItem(this.lastVideosKey)) localStorage.setItem(this.lastVideosKey, '{}')
    if (!localStorage.getItem(this.ignoreVideoKey)) localStorage.setItem(this.ignoreVideoKey, '[]')
    if (!localStorage.getItem(this.ignoreTermsKey)) localStorage.setItem(this.ignoreTermsKey, '[]')
  }

  toggle (key) {
    if (![this.showThumbnailsKey].includes(key)) return console.error('invalid key', key)
    localStorage.setItem(key, localStorage.getItem(key) === 'true' ? 'false' : 'true')
  }
  get(key) {
    if (![this.showThumbnailsKey, this.lastVideosKey, this.ignoreVideoKey, this.ignoreTermsKey].includes(key)) return console.error('invalid key', key)
    return JSON.parse(localStorage.getItem(key))
  }
  set(key, value) {
    if (typeof value === 'string') {
      localStorage.setItem(key, value)
    } else {
      localStorage.setItem(key, JSON.stringify(value))
    }
  }
  push(key, item) {
    if (![this.ignoreVideoKey, this.ignoreTermsKey].includes(key)) return console.error('invalid key', key)
    const list = this.get(key)
    list.push(item)
    this.set(key, list)
    return item
  }
  remove(key, item) {
    if (![this.ignoreTermsKey].includes(key)) return console.error('invalid key', key)
    let list = this.get(key)
    list = list.filter(i => i !== item)
    this.set(key, list)
    return item
  }
  includes(key, item) {
    if (![this.ignoreVideoKey, this.ignoreTermsKey].includes(key)) return console.error('invalid key', key)
    const list = this.get(key)
    return list.includes(item)
    
  }
}