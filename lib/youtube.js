import spawn from 'nano-spawn'
import fs from 'fs'

const fetchYoutubeHeaders = {
  'Accept-Language': 'en',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36'
}
const subtitlesYTDLPArgs = `--write-subs --write-auto-subs --sub-format vtt --convert-subs srt -k`
const videoYTDLPArgs = `--concurrent-fragments 5 -f best[ext=mp4] --sponsorblock-remove sponsor`

function getOptionalCookiesPath() {
  if (fs.existsSync('/app/cookies.txt')) return '/app/cookies.txt'
  if (fs.existsSync('./cookies.txt')) return './cookies.txt'
  console.log('cookies not set')
  return
}

export async function downloadVideo(id, repo, callback = () => {}) {
  return new Promise(async (resolve, reject) => {
    if (id.startsWith('https?://')) id = extractIdFromUrl(id)
    try {
      const cookiesPath = getOptionalCookiesPath()
      let cookiesOption = cookiesPath ? `--cookies ${cookiesPath}` : ''
      for await (const line of spawn('yt-dlp', `-o ./data/videos/${id}.mp4 ${cookiesOption} ${videoYTDLPArgs} ${subtitlesYTDLPArgs} -- ${id}`.split(/ +/))) {
        console.log(line)
        callback(line)
      }

      if (!repo.getVideo(id)) {
        const video = await getVideo(id)
        repo.upsertVideos([video])
        callback(`downloaded external video ${id}`)
      }
      
      normalizeSubtitleFiles(id)

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
        for await (const line of spawn('yt-dlp', `-o ./data/videos/${id} --skip-download ${cookiesOption} ${subtitlesYTDLPArgs} -- ${id}`.split(/ +/))) {
          console.log(line)
          callback(line)
        }
      }
      normalizeSubtitleFiles(id)
      const transcript = fs.readFileSync(transcriptPath, 'utf-8')
      resolve(transcript)
    } catch (error) {
      console.error('Error downloading video subtitles:', error.message)
      reject(error)
    }
  })
}

function normalizeSubtitleFiles (id) {
  const files = fs.readdirSync('./data/videos')
  files.forEach(file => {
    if (file.startsWith(id) && file.endsWith('.srt')) {
      if (!file.endsWith('.en.srt')) {
        fs.renameSync(`./data/videos/${file}`, `./data/videos/${id}.en.srt`)
      }
    }
    if (file.startsWith(id) && file.endsWith('.vtt')) {
      if (!file.endsWith('.en.vtt')) {
        fs.renameSync(`./data/videos/${file}`, `./data/videos/${id}.en.vtt`)
      }
    }
  })
}
export async function getVideosFor(channelName) {
  try {
    // console.log('fetching videos for', channelName)
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
      // .filter((_,i) => i < 10)
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

export async function getVideo (id) {
  if (id.startsWith('https?://')) id = extractIdFromUrl(id)
  try {
    const {output} = await spawn('yt-dlp', ['-j', '--', id])
    const json = JSON.parse(output)
    return {
      channelName: json.uploader_id.replace(/^@/, ''),
      title: json.title,
      url: `https://www.youtube.com/watch?v=${id}`, 
      thumbnail: `https://img.youtube.com/vi/${id}/mq2.jpg`,
      description: json.description,
      id,
      publishedTime: json.upload_date.substring(0, 4) + '-' + json.upload_date.substring(4, 6) + '-' + json.upload_date.substring(6, 8),
      publishedAt: new Date(json.timestamp * 1000),
      viewCount: json.view_count,
      duration: json.duration_string,
    }
  } catch (err) {
    console.error(err)
    return null
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

function extractIdFromUrl (url) {
  return url.replace(/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/watch\?v=(.+)$/, '$4')
}