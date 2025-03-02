
class Channels extends HTMLElement {
  constructor () {
    super()
  }
  connectedCallback () {
    this.render()
    this.registerEvents()
  }
  static get observedAttributes() {
    return ['data-list'];
  }

  attributeChangedCallback(name, _, newValue) {
    if (name === 'data-list') {
      const channels = newValue.split(',')
      channels.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
      const $channelsContainer = this.querySelector('div')
      channels.forEach(channel => {
        const $existingChannel = $channelsContainer.querySelector(`[data-channel="${channel}"]`)
        if ($existingChannel) {
          $existingChannel.replaceWith(createChannelElement(channel))
        } else {
          $channelsContainer.appendChild(createChannelElement(channel))
        }
      })
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
    this.innerHTML = /*html*/`
    <details class="channels-container">
      <summary>Channels</summary>
      <div></div>
    </details>
    `
  }
}
customElements.define('channels-list', Channels)


function createChannelElement (channel = '') {
  const $channel = document.createElement('span')
  $channel.dataset.channel = channel
  $channel.classList.add('channel')
  $channel.innerText = channel
  $channel.addEventListener('click', function (event) {
    const $searchInput = document.querySelector('#search')
    if ($searchInput.value === channel) {
      $searchInput.value = ''
      event.target.classList.remove('active')
    } else {
      $searchInput.value = channel
      event.target.parentNode.querySelector('.active')?.classList.remove('active')
      event.target.classList.add('active')
    }
    $searchInput.dispatchEvent(new Event('keyup'))
  })
  return $channel
}