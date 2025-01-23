import { execa } from 'execa'
import fs from 'fs'

export async function downloadVideo(id, repo, callback = () => {}) {
  try {
    for await (const line of execa`yt-dlp -f mp4 ${id} -o ./data/videos/${id}.mp4`.iterable()) {
      callback(line)
    }

    repo.setVideoDownloaded(id)
    console.log('Download completed')
  } catch (error) {
    console.error('Error downloading video:', error)
  }
}

export async function getVideoSubtitles (id, callback = () => {}) {
  for await (const line of execa`yt-dlp --skip-download --write-subs --write-auto-subs --sub-lang en --sub-format ttml --convert-subs srt --default-search ytsearch ${id} -o ./data/videos/${id}-sub`.iterable()) {
    callback(line)
  }
  const transcriptPath = `./data/videos/${id}-sub.en.srt`
  const transcript = fs.readFileSync(transcriptPath, 'utf-8')
  // if (process.env.KEEP_SUBTITLES !== 'true') fs.rmSync(transcriptPath)
  return transcript
}

export async function getVideosFor(channelName) {
  try {
    const response = await fetch(`https://www.youtube.com/${channelWithAt(channelName)}/videos`, {
      headers: { 'Accept-Language': 'en' }
    })
    const text = await response.text()
    const match = text.match(/var ytInitialData = (.+?);<\/script>/)
    if (!match || !match[1]) return null

    const json = JSON.parse(match[1].trim())
    const videoTab = json.contents.twoColumnBrowseResultsRenderer.tabs.find(t => t.tabRenderer?.title === 'Videos')
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
      publishedAt: parseRelativeTime(v.richItemRenderer.content.videoRenderer.publishedTimeText?.simpleText),
      viewCount: v.richItemRenderer.content.videoRenderer.viewCountText?.simpleText,
      duration: v.richItemRenderer.content.videoRenderer.lengthText?.simpleText,
    }
  }
}

function parseRelativeTime(relativeTime) {
  const now = new Date();
  let match;
  
  const regexes = [
      { regex: /(\d+)\s+seconds? ago/, unit: 'seconds' },
      { regex: /(\d+)\s+minutes? ago/, unit: 'minutes' },
      { regex: /(\d+)\s+hours? ago/, unit: 'hours' },
      { regex: /(\d+)\s+days? ago/, unit: 'days' },
      { regex: /(\d+)\s+weeks? ago/, unit: 'weeks' },
      { regex: /(\d+)\s+months? ago/, unit: 'months' },
      { regex: /(\d+)\s+years? ago/, unit: 'years' }
  ];

  for (let i = 0; i < regexes.length; i++) {
      match = relativeTime.match(regexes[i].regex);
      if (match) {
          const amount = parseInt(match[1], 10);
          switch (regexes[i].unit) {
              case 'seconds': now.setSeconds(now.getSeconds() - amount); break;
              case 'minutes': now.setMinutes(now.getMinutes() - amount); break;
              case 'hours': now.setHours(now.getHours() - amount); break;
              case 'days': now.setDate(now.getDate() - amount); break;
              case 'weeks': now.setDate(now.getDate() - amount * 7); break;
              case 'months': now.setMonth(now.getMonth() - amount); break;
              case 'years': now.setFullYear(now.getFullYear() - amount); break;
          }
          return now;
      }
  }
  console.error('Invalid relative time format', relativeTime);
  return null
}
