import { test } from 'node:test'
import assert from 'assert';
import { getVideosFor } from '../lib/youtube.js'

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