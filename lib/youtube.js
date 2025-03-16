import spawn from 'nano-spawn'
import fs from 'fs'

const fetchYoutubeHeaders = {
  'Accept-Language': 'en',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36'
}

function getOptionalCookiesPath() {
  if (fs.existsSync('/app/cookies.txt')) return '/app/cookies.txt'
  if (fs.existsSync('./cookies.txt')) return './cookies.txt'
  console.log('cookies not set')
  return
}

export async function downloadVideo(id, repo, callback = () => {}) {
  return new Promise(async (resolve, reject) => {
    try {
      const cookiesPath = getOptionalCookiesPath()
      let cookiesOption = cookiesPath ? `--cookies ${cookiesPath}` : ''
      for await (const line of spawn('yt-dlp', `${id} ${cookiesOption} -o ./data/videos/${id}.mp4 --concurrent-fragments 5 -f best[ext=mp4]`.split(' '))) {
        console.log(line)
        callback(line)
      }
  
      repo.setVideoDownloaded(id)
      console.log('Download completed')
      resolve(id)
    } catch (error) {
      console.error(error)
      console.error('Error downloading video:', error.message)
      reject(error)
    }
  })
}

export async function getVideoSubtitles (id, callback = () => {}) {
  return new Promise(async (resolve, reject) => {
    try {
      const transcriptPath = `./data/videos/${id}.en.srt`
      const cookies = getOptionalCookiesPath()
      let cookiesOption = ''
      if (cookies) cookiesOption = `--cookies ./cookies.txt`
      console.log({cookiesOption})
      if (!fs.existsSync(transcriptPath)) {
        for await (const line of spawn('yt-dlp', `${id} ${cookiesOption} -o ./data/videos/${id} --skip-download --write-subs --write-auto-subs --sub-lang en --sub-format vtt --convert-subs srt -k`.split(' '))) {
          console.log(line)
          callback(line)
        }
      }
      const transcript = fs.readFileSync(transcriptPath, 'utf-8')
      resolve(transcript)
    } catch (error) {
      console.error('Error downloading video subtitles:', error.message)
      reject(error)
    }
  })
}

export async function getVideosFor(channelName) {
  try {
    console.log('fetching videos for', channelName)
    const response = await fetch(`https://www.youtube.com/${channelWithAt(channelName)}/videos`, {
      headers: fetchYoutubeHeaders
    })
    const text = await response.text()
    const match = text.match(/var ytInitialData = (.+?);<\/script>/)
    if (!match || !match[1]) {
      console.log('no match for', channelName)
      return null
    }

    const json = JSON.parse(match[1].trim())
    const videoTab = json.contents.twoColumnBrowseResultsRenderer.tabs.find(t => t.tabRenderer?.title === 'Videos')
    const videoContents = videoTab.tabRenderer.content.richGridRenderer.contents
    return videoContents
      .map(toInternalVideo)
      .filter(Boolean)
      .filter(v => v.publishedAt > new Date(Date.now() - 31 * 24 * 60 * 60 * 1000))
      .filter((_,i) => i < 10)
  } catch (error) {
    console.error('Error fetching latest video:', error.message)
    return null
  }

  function channelWithAt(channelName = '') {
    return channelName.startsWith('@') ? channelName : '@' + channelName
  } 

  function toInternalVideo(v) {
    if (!v || !v.richItemRenderer) return
    const data = v.richItemRenderer.content.videoRenderer
    return {
      channelName,
      title: data.title?.runs[0].text,
      url: `https://www.youtube.com/watch?v=${data.videoId}`, 
      thumbnail: `https://img.youtube.com/vi/${data.videoId}/mq2.jpg`,
      description: data.descriptionSnippet?.runs[0].text,
      id: data.videoId,
      publishedTime: data.publishedTimeText?.simpleText,
      publishedAt: parseRelativeTime(data.publishedTimeText?.simpleText),
      viewCount: data.viewCountText?.simpleText,
      duration: data.lengthText?.simpleText,
    }
  }
}

function parseRelativeTime(relativeTime) {
  if (!relativeTime) return
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
