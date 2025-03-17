class AddChannelForm extends HTMLElement {
  constructor () {
    super()
  }
  connectedCallback () {
    this.render()
    this.registerEvents()
  }
  disconnectedCallback () {
    this.unregisterEvents()
  }
  registerEvents () {
    this.querySelector('form').addEventListener('submit', this.addChannelHandler.bind(this))
  }
  unregisterEvents () {
    this.querySelector('form').removeEventListener('submit', this.addChannelHandler.bind(this))
  }
  render () {
    this.innerHTML = /*html*/`
      <form id="add-channel-form">
        <div class="flex space-between">
          <label for="channel-name">Add a new channel</label>
          <input type="text" id="channel-name" placeholder="Channel Name" required>
        </div>
        <span class="loader"></span>
      </form>
    `
  }

  addChannelHandler (event) {
    event.preventDefault()
  
    const form = event.target
    const input = form.querySelector('input')
    const loader = form.querySelector('.loader')
    
    const channelName = document.getElementById('channel-name').value
    if (!channelName) return alert('empty channel name')

    freezeForm()
    
    fetch('/api/channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: channelName })
    })
    .then(() => form.reset())
    .catch(error => console.error('Error adding channel:', error))
    .finally(unfreezeForm)
  
    function freezeForm() {
      input.disabled = true
      loader.classList.add('show')
    }
    function unfreezeForm() {
      input.disabled = false
      loader.classList.remove('show')
    }
  }
}
customElements.define('add-channel-form', AddChannelForm)
