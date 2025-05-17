import { getVideosFor } from './youtube.js'

export async function updateAndPersistVideos (repo, callback = () => {}) {
  const channels = repo.getChannels()
  for (const channel of channels) {
    await updateAndPersistVideosForChannel(channel.name, repo, callback)
  }
}

export async function updateAndPersistVideosForChannel (name, repo, callback = () => {}) {
  let videos = await getVideosFor(name)
  if (Array.isArray(videos)) {
    videos = videos.map(v => repo.patchVideo(v))
    repo.upsertVideos(videos)
    callback(null, { name, videos }) // eslint-disable-line
  } else {
    callback(new Error('No videos found'), null)
  }
  return videos
}
