import {test, describe} from 'node:test'
import fs from 'fs'
import assert from 'assert'
import { createServer } from '../lib/server.js'
import Repository from '../lib/repository.js'


let repo
test.beforeEach(() => {
  if (fs.existsSync('./test/data')) {
    fs.rmSync('./test/data', { recursive: true })
  }
  repo = new Repository('./test/data')
})
test('starts server', async () => {
  const server = createServer({updateVideos: false, repo})
  await new Promise(resolve => server.listen(3001, resolve))
  assert.equal(server.address().port, 3001)
  await new Promise(resolve => server.close(resolve))
})

describe('server', () => {
  let server
  test.beforeEach(async () => {
    server = createServer({updateVideos: false, repo})
    await new Promise(resolve => server.listen(3001, resolve))
  }, {timeout: 1000})
  test.afterEach(async () => {
    await new Promise(resolve => server.close(resolve))
  }, {timeout: 1000})

  test('get channels', {timeout: 5000}, async () => {
    const res = await fetch('http://0.0.0.0:3001/api/channels')
    const data = await res.json()
    assert.equal(res.status, 200)
    assert.deepEqual(data, [])
  })
})