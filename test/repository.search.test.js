import { test, describe } from 'node:test'
import fs from 'fs'
import assert from 'assert'
import Repository from '../lib/repository.js'

let repo
test.beforeEach(() => {
  if (fs.existsSync('./test/data')) {
    fs.rmSync('./test/data', { recursive: true })
  }
  repo = new Repository('./test/data')
})

const video1 = { id: '12345', channelName: 'tester', title: 'The Code', description: 'some description in common' }
const video2 = { id: '67890', channelName: 'programmer', title: 'The Error', description: 'some description' }

describe('search', () => {
  test('searches videos by title', async () => {
    repo.upsertVideos([video1, video2])
    const results = await repo.getVideos({ filter: 'The Error' })
    assert.equal(results.length, 1)
    assert.deepEqual(results, [video2])
  })
  test('searches videos by channel name', async () => {
    repo.upsertVideos([video1, video2])
    const results = await repo.getVideos({ filter: '@tester' })
    assert.equal(results.length, 1)
    assert.deepEqual(results, [video1])
  })
  test('searches videos by description', async () => {
    repo.upsertVideos([video1, video2])
    const results = await repo.getVideos({ filter: 'some description' })
    assert.equal(results.length, 2)
  })
})
