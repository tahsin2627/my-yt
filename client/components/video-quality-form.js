class VideoQualityForm extends HTMLElement {
  constructor () {
    super()
  }
  connectedCallback () {
    this.render()

    window.fetch('/api/video-quality', {
      method: 'GET'
    }).then(response => response.json())
    .then((videoQuality) => {
      console.log('video quality', videoQuality)
      this.querySelector('#video-quality').value = +videoQuality
    })
    .catch(error => console.error('Error:', error))
  }
  disconnectedCallback () {
    this.unregisterEvents()
  }
  registerEvents () {
    if (this.querySelector('#video-quality'))
      this.querySelector('#video-quality').addEventListener('change', this.setVideoQualityHandler.bind(this))
  }
  unregisterEvents () {
    if (this.querySelector('#video-quality'))
      this.querySelector('#video-quality').removeEventListener('change', this.setVideoQualityHandler.bind(this))
  }
  render () {
    this.unregisterEvents()

    this.innerHTML = /*html*/`
      <form>
        <div class="flex space-between">
          <div>
            Video quality
          </div>
          <select name="video-quality" id="video-quality">
            <option value="360">360</option>
            <option value="480">480</option>
            <option value="720">720</option>
            <option value="1080">1080</option>
            <option value="1440">1440</option>
            <option value="2160">2160</option>
          </select>
        </div>
      </form>
    `

    this.registerEvents()
  }

  setVideoQualityHandler (event) {
    event.preventDefault()
    console.log('change video quality', event.target.value)
    window.fetch('/api/video-quality', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: event.target.value
    })
  }
}
customElements.define('video-quality-form', VideoQualityForm)
