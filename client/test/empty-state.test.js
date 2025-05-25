/* global describe, it */
import { fixture, html } from '@open-wc/testing'
import { expect } from '@esm-bundle/chai'

import '../components/empty-state.js'

describe('my-test', () => {
  it('shows empty state message when no channels are present', async () => {
    const el = await fixture(html`
      <empty-state></empty-state>
    `)

    expect(el.innerHTML).to.contain('Nothing to show...')
  })
  it('shows empty state message when channels are present', async () => {
    const el = await fixture(html`
      <empty-state data-has-channels="true"></empty-state>
    `)
    expect(el.innerHTML).to.contain('All caught up!')
  })
})
