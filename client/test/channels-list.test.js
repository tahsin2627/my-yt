/* global describe, it */
import { fixture, html } from '@open-wc/testing'
import { expect } from '@esm-bundle/chai'

import '../components/channels-list.js'

describe('channels-list', () => {
  it('no channels shown', async () => {
    const el = await fixture(html`
      <channels-list></channels-list>
    `)

    expect(el.querySelector('[data-channel]')).eq(null)
  })

  it('channels shown', async () => {
    const el = await fixture(html`
      <channels-list data-list='["channel1"]'></channels-list>
    `)
    expect(el.innerHTML).to.contain('channel1')
  })

  it('clicking on channel sets search input value to channel name', async () => {
    const el = await fixture(html`
      <div>
        <channels-list data-list='["channel1"]'></channels-list>
        <input id="search" type="text">
      </div>
    `)
    const search = el.querySelector('#search')
    const channel = el.querySelector('[data-channel="channel1"]')
    channel.click()
    expect(search.value).to.equal('@channel1')
  })
})
