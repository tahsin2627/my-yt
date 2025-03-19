import { test } from 'node:test'
import fs from 'fs'
import assert from 'assert';
import Repository from '../lib/repository.js'

let repo
test.beforeEach(() => {
  if (fs.existsSync('./test/data')) {
    fs.rmSync('./test/data', { recursive: true })
  }
  repo = new Repository('./test/data')
})

test('empty repo provisions data folder', () => {
  assert.ok(repo)
  assert.equal(repo.paths.videos, './test/data/videos.json')
  assert.equal(repo.paths.channels, './test/data/channels.json')
  assert.equal(repo.getVideos().length, 0)
  assert.ok(fs.existsSync(repo.paths.videos))
  assert.ok(fs.existsSync(repo.paths.channels))
})

test('adds channel', () => {
  repo.addChannel('veritasium')
  assert.equal(repo.getChannels().length, 1)
  assert.equal(repo.channelExists('veritasium'), true)
})

test('gets channels', () => {
  repo.addChannel('veritasium')
  const channels = repo.getChannels()
  assert.equal(channels.length, 1)
  assert.equal(channels[0].name, 'veritasium')
})

test('upserts videos', () => {
  repo.upsertVideos([{id: '12345', channelName: 'tester', title: 'The Code'}, {id: '67890', channelName: 'programmer', title: 'The Error'}])
  assert.equal(repo.getVideos().length, 2)
})

test('gets channel videos', () => {
  repo.upsertVideos([{id: '12345', channelName: 'tester', title: 'The Code'}, {id: '67890', channelName: 'programmer', title: 'The Error'}])
  const videos = repo.getChannelVideos('tester')
  assert.equal(videos.length, 1)
  assert.equal(videos[0].title, 'The Code')
})

test('gets single video by id', () => {
  repo.upsertVideos([{id: '12345', channelName: 'tester', title: 'The Code'}, {id: '67890', channelName: 'programmer', title: 'The Error'}])
  const video = repo.getVideo('12345')
  assert.equal(video.title, 'The Code')
})

test('deletes a video by id and sets downloaded true', () => {
  repo.upsertVideos([{id: '12345', channelName: 'tester', title: 'The Code'}, {id: '67890', channelName: 'programmer', title: 'The Error'}])
  repo.deleteVideo('12345')
  assert.equal(repo.getVideos().length, 2)
  assert.deepEqual(repo.getVideo('12345'), {id: '12345', channelName: 'tester', title: 'The Code', downloaded: false})
})

test('toggles ignore video', () => {
  repo.upsertVideos([{id: '12345', channelName: 'tester', title: 'The Code'}, {id: '67890', channelName: 'programmer', title: 'The Error'}])
  repo.toggleIgnoreVideo('12345')
  assert.equal(repo.getVideo('12345').ignored, true)
})

test('marks video as downloaded', () => {
  repo.upsertVideos([{id: '12345', channelName: 'tester', title: 'The Code'}, {id: '67890', channelName: 'programmer', title: 'The Error'}])
  repo.setVideoDownloaded('12345')
  assert.equal(repo.getVideo('12345').downloaded, true)
})

test('sets video transcript', () => {
  repo.upsertVideos([{id: '12345', channelName: 'tester', title: 'The Code'}, {id: '67890', channelName: 'programmer', title: 'The Error'}])
  repo.setVideoTranscript('12345', 'This is the transcript for The Code')
  assert.equal(repo.getVideo('12345').transcript, 'This is the transcript for The Code')
})

test('sets video summary', () => {
  repo.upsertVideos([{id: '12345', channelName: 'tester', title: 'The Code'}, {id: '67890', channelName: 'programmer', title: 'The Error'}])
  repo.setVideoSummary('12345', 'This is the summary for The Code')
  assert.equal(repo.getVideo('12345').summary, 'This is the summary for The Code')
})

test('patches new video with addedAt', () => {
  const newVideo = {id: '67890', channelName: 'programmer', title: 'The Error'}
  const patchedVideo = repo.patchVideo(newVideo)
  assert.equal(patchedVideo.addedAt, Date.now())
})