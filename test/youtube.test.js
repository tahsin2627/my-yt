import { test } from 'node:test'
import assert from 'assert';
import { getVideosFor, getVideo } from '../lib/youtube.js'

test('gets videos for channel', async () => {
  const videos = await getVideosFor('veritasium')
  const video = videos[0]
  assert.ok(video.channelName)
  assert.ok(video.title)
  assert.ok(video.url)
  assert.ok(video.thumbnail)
  assert.ok(video.description)
  assert.ok(video.id)
  assert.ok(video.publishedTime)
  assert.ok(video.viewCount)
  assert.ok(video.duration)
  assert.ok(videos.length > 0)
})

test('gets single video', async () => {
  // https://www.youtube.com/watch?v=qJZ1Ez28C-A
  const video = await getVideo('qJZ1Ez28C-A')
  assert.equal(video.channelName, 'veritasium')
  assert.equal(video.title, 'Something Strange Happens When You Trust Quantum Mechanics')
  assert.equal(video.url, 'https://www.youtube.com/watch?v=qJZ1Ez28C-A')
  assert.equal(video.thumbnail, 'https://img.youtube.com/vi/qJZ1Ez28C-A/mq2.jpg')
  assert.ok(video.description, '')
  assert.equal(video.id, 'qJZ1Ez28C-A')
  assert.equal(video.publishedTime, '2025-03-05')
  assert.ok(video.viewCount)
  assert.equal(video.duration, '33:36')
})