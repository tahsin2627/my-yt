
class EmptyState extends HTMLElement {
  constructor () {
    super()
  }
  connectedCallback () {
    this.render()
    this.registerEvents()
  }
  disconnectedCallback () {
    this.deregisterEvents()
  }
  registerEvents () {
  }
  deregisterEvents () {
  }
  render () {
    /* html for empty app state */
    this.innerHTML = /*html*/`
      <h1>Nothing to show...</h1>
      <p>Add your YouTube subscriptions in the <a href="/settings">Settings</a></p>
      <div class="big-sad-emoji"></div>
    `
  }
}
customElements.define('empty-state', EmptyState)
