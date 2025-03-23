class ManageDiskSpaceForm extends HTMLElement {
  constructor () {
    super()
  }
  connectedCallback () {
    this.render()
    this.registerEvents()

    const $diskSpaceUsed = document.getElementById('disk-space-used')
    window.fetch('/api/disk-usage')
    .then(response => response.text())
    .then((diskSpaceUsed) => {
      $diskSpaceUsed.innerText = diskSpaceUsed
    })
    .catch(err => console.error(err))
  }
  disconnectedCallback () {
    this.unregisterEvents()
  }
  registerEvents () {
    this.querySelector('#reclaim-disk-space').addEventListener('click', this.reclaimDiskSpace.bind(this))
  }
  unregisterEvents () {
    this.querySelector('#reclaim-disk-space').removeEventListener('click', this.reclaimDiskSpace.bind(this))
  }
  render () {
    this.innerHTML = /*html*/`
      <form>
        <div class="flex space-between">
          <div>
            Delete downloaded videos to reclaim disk space
          </div>
          <div>
            <label for="delete-only-ignored">
              Only ignored videos
            </label>
            <input type="checkbox" id="delete-only-ignored"/>
            <button id="reclaim-disk-space" type="submit">Delete videos</button>
          </div>
        </div>
        <div><small id="disk-usage">Currently <span id="disk-space-used"></span> of disk space used</small></div>
      </form>
    `
  }

  reclaimDiskSpace (event) {
    event.preventDefault()
    if (!confirm('About to delete downloaded videos, are you sure?')) return
    console.log('reclaiming')
    const onlyIgnored = this.querySelector('#delete-only-ignored').checked
    console.log({onlyIgnored})
    const $diskUsage = this.querySelector('#disk-usage')
    window.fetch('/api/reclaim-disk-space', {
      method: 'POST',
      body: JSON.stringify({ onlyIgnored })
    })
    .then(() => {
      $diskUsage.innerText = 'Successfully reclaimed disk space'
    })
    .catch((error) => {
      $diskUsage.innerHTML = `Failed to reclaim disk space: <br><pre>${error.message}</pre>`
    })
  }
}
customElements.define('manage-disk-space-form', ManageDiskSpaceForm)
