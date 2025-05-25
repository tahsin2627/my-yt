/* global describe, it */
import { fixture, html, assert } from '@open-wc/testing'

import '../components/empty-state.js'

describe('empty-state', () => {
  it('shows empty state message when no channels are present', async () => {
    const el = await fixture(html`
      <empty-state></empty-state>
    `)

    assert.include(el.innerHTML, 'Nothing to show...')
  })
  it('shows empty state message when channels are present', async () => {
    const el = await fixture(html`
      <empty-state data-has-channels="true"></empty-state>
    `)

    assert.include(el.innerHTML, 'All caught up!')
  })
})
