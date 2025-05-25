/* global describe, it */
import { fixture, html } from '@open-wc/testing'
import { expect } from '@esm-bundle/chai'

import '../components/sse-connection.js'

describe('sse-connection', () => {
  it('not connected', async () => {
    const el = await fixture(html`
      <sse-connection></sse-connection>
    `)

    expect(el.classList.contains('connected')).eq(false)
  })
  it('connected', async () => {
    window.eventSource = { readyState: 'OPEN' }
    const el = await fixture(html`
      <sse-connection></sse-connection>
    `)

    expect(el.classList.contains('connected')).eq(true)
  })
})
