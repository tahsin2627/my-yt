import { execa } from 'execa'

export async function downloadVideo(id, repo, callback = () => {}) {
  try {
    for await (const line of execa`yt-dlp -f mp4 ${id} -o ./data/videos/${id}.mp4`.iterable()) {
      callback(line)
      console.log(line)
    }

    repo.setVideoDownloaded(id)
    console.log('Download completed')
  } catch (error) {
    console.error('Error downloading video:', error)
  }
}


export async function getVideosFor(channelName) {
  try {
    const response = await fetch(`https://www.youtube.com/${channelWithAt(channelName)}/videos`)
    const text = await response.text()
    const match = text.match(/var ytInitialData = (.+?);<\/script>/)
    if (!match || !match[1]) return null

    const json = JSON.parse(match[1].trim())
    const videoTab = json.contents.twoColumnBrowseResultsRenderer.tabs.find(t => t.tabRenderer.title === 'Video')
    const videoContents = videoTab.tabRenderer.content.richGridRenderer.contents
    return videoContents.map(toInternalVideo).filter(Boolean)
  } catch (error) {
    console.error('Error fetching latest video:', error)
    return null
  }

  function channelWithAt(channelName = '') {
    return channelName.startsWith('@') ? channelName : '@' + channelName
  } 

  function toInternalVideo(v) {
    if (!v || !v.richItemRenderer) return
    return {
      channelName,
      title: v.richItemRenderer.content.videoRenderer.title?.runs[0].text,
      url: `https://www.youtube.com/watch?v=${v.richItemRenderer.content.videoRenderer.videoId}`, 
      thumbnail: v.richItemRenderer.content.videoRenderer.thumbnail?.thumbnails[0].url,
      description: v.richItemRenderer.content.videoRenderer.descriptionSnippet?.runs[0].text,
      id: v.richItemRenderer.content.videoRenderer.videoId,
      publishedTime: v.richItemRenderer.content.videoRenderer.publishedTimeText?.simpleText,
      viewCount: v.richItemRenderer.content.videoRenderer.viewCountText?.simpleText,
      duration: v.richItemRenderer.content.videoRenderer.lengthText?.simpleText,
    }
  }
}
