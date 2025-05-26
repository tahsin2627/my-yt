/* global describe, it */
import { fixture, html, assert } from '@open-wc/testing'

import '../components/sse-connection.js'

describe('sse-connection', () => {
  it('not connected', async () => {
    const el = await fixture(html`
      <sse-connection></sse-connection>
    `)

    assert.equal(el.classList.contains('connected'), false)
  })
  it('connected', async () => {
    window.eventSource = { readyState: 'OPEN' }
    const el = await fixture(html`
      <sse-connection></sse-connection>
    `)

    assert.equal(el.classList.contains('connected'), true)
  })
})
