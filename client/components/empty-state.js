class EmptyState extends HTMLElement {
  constructor () {
    super()
  }
  connectedCallback () {
    this.render()
  }
  render () {
    /* html for empty app state */
    this.innerHTML = /*html*/`
      <h1>Nothing to show...</h1>
      <p>Add YouTube channels you want to track in <a href="/settings">/settings</a></p>
      <div class="big-sad-emoji"></div>
    `
  }
}
customElements.define('empty-state', EmptyState)
