class ChannelsList extends HTMLElement {
  constructor () {
    super()
    this.channels = []
  }
  connectedCallback () {
    this.render()
  }
  static get observedAttributes() {
    return ['data-list'];
  }

  attributeChangedCallback(name, _, newValue) {
    if (name === 'data-list') {
      const channels = newValue.split(',').filter(Boolean)
      channels.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
      this.channels = channels
      this.render()
    }
  }
  disconnectedCallback () {
    this.deregisterEvents()
  }
  registerEvents () {
  }
  deregisterEvents () {
  }
  render () {
    if (this.channels.length === 0) {
      this.classList.add('hide')
      return this.innerHTML = ``
    }
    this.classList.remove('hide')
    
    this.$searchInput = document.querySelector('#search')
    this.unregisterEvents()
    this.innerHTML = /*html*/`
    <details class="channels-container">
      <summary>Channels</summary>
      <div>${this.channels.map(channel => /*html*/`<span tabindex=0 data-channel="${channel}" class="channel">${channel}</span>`).join('')}</div>
    </details>
    `
    this.registerEvents()
  }
  registerEvents() {
    const channels = this.querySelectorAll('.channel')
    channels.forEach(channel => window.utils.addClickListener(channel, this.channelClick.bind(this)))
  }
  unregisterEvents() {
    const channels = this.querySelectorAll('.channel')
    channels.forEach(channel => window.utils.removeClickListener(channel, this.channelClick.bind(this)))
  }
  channelClick(event) {
    if (!this.$searchInput) return console.log('missing search field, skipping channel event register')
    const channels = this.querySelectorAll('.channel')
    if (this.$searchInput.value === event.target.innerText) {
      this.$searchInput.value = ''
      event.target.classList.remove('active')
    } else {
      this.$searchInput.value = event.target.innerText
      channels.forEach(c => c.classList.remove('active'))
      event.target.classList.add('active')
    }
    this.$searchInput.dispatchEvent(new Event('keyup'))
    setTimeout(() => document.body.scrollIntoView({ top: 0, behavior: 'smooth' }), 10)
  }
}
customElements.define('channels-list', ChannelsList)
