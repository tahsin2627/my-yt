/* global HTMLElement, customElements */
class SSEConnection extends HTMLElement {
  connectedCallback () {
    this.render(window.eventSource && window.eventSource.readyState === 'OPEN')
  }

  static get observedAttributes () {
    return ['connected']
  }

  attributeChangedCallback (name, _, newValue) {
    this.render(window.eventSource && window.eventSource.readyState === 'OPEN')
  }

  render (connected = false) {
    if (connected) this.classList.add('connected')
    else this.classList.remove('connected')
    this.innerHTML = /* html */''
  }
}
customElements.define('sse-connection', SSEConnection)
