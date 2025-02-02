import Store from '/lib/store.js'
const store = new Store()

// app: sse updates and renders
const eventSource = new window.EventSource('/')
const $videosContainer = document.querySelector('.main-videos-container')

eventSource.onmessage = (message) => {
  if (!message || !message.data) return console.error('skipping empty message')
  try {
    const data = JSON.parse(message.data, {})
    console.log('[sse] message', data)

    if (data.type === 'download-log-line' && data.line) {
      const $downloadLog = document.querySelector('.download-log');
      $downloadLog.open = true;
      const $downloadLogLines = document.querySelector('.download-log .lines');
      const text = $downloadLogLines.innerText
      let lines = text.split('\n')
      lines = lines.join('\n') + '\n' + data.line
      $downloadLogLines.innerText = lines
      $downloadLogLines.scrollTop = $downloadLogLines.scrollHeight;
    }
    
    if (data.type === 'all' && data.videos) {
      $videosContainer.innerHTML = ''
      const allVideos = Object.entries(data.videos).reduce((acc, curr) => acc.concat(curr[1]), [])
      allVideos
      .sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt))
      .forEach(video => {
        $videosContainer.appendChild(createVideoElement(video))
      })

      updateDownloadedVideos(allVideos)
      updateSummarizedVideos(allVideos)
      const channelsList = Object.entries(data.videos).map(([channelName, _]) => channelName)
      document.querySelector('channels-list').dataset['list'] = channelsList
      window.videos = data.videos
    }
    if (data.type === 'summary' && data.videoId && data.summary && data.transcript) {
      ;[...document.querySelectorAll(`[data-video-id="${data.videoId}"]`)].forEach($video => {
        const videoData = JSON.parse($video.dataset['data'])
        Object.assign(videoData, { summary: data.summary, transcript: data.transcript })
        $video.dataset['data'] = JSON.stringify(videoData)
        updateSummarizedVideos([videoData])
      })
    }
    if (data.type === 'downloaded' && data.videoId) {
      ;[...document.querySelectorAll(`[data-video-id="${data.videoId}"]`)].forEach($video => {
        const videoData = JSON.parse($video.dataset['data'])
        videoData.downloaded = true
        $video.dataset['data'] = JSON.stringify(videoData)
        updateDownloadedVideos([videoData])
      })
    }
  } catch (err) {
    console.error('sse parse error', err)
  }
}


// settings modal
const $settings = document.querySelector("dialog#settings")
const $openSettings = document.querySelector("#open-settings")
const $closeSettings = $settings.querySelector("button")
$openSettings.addEventListener("click", () => $settings.showModal())
$closeSettings.addEventListener("click", () => $settings.close())

// summary modal
const $summary = document.querySelector('dialog#summary')
const $closeSummary = $summary.querySelector("button")
$closeSummary.addEventListener("click", () => $summary.close())
$summary.addEventListener('close', () => {})

// settings ui
const $showThumbnails = document.getElementById('show-thumbnails')
$showThumbnails.addEventListener('click', (event) => {
  store.toggle(store.showThumbnailsKey)
  applyShowThumbnails(store.get(store.showThumbnailsKey))
})

// apply settings                                                                                                                                                          
applyShowThumbnails(store.get(store.showThumbnailsKey))

// observe dialog open/close and prevent body background scroll
observeDialogOpenPreventScroll($settings)
observeDialogOpenPreventScroll($summary)


function observeDialogOpenPreventScroll (dialog) {
  new MutationObserver((mutationList, observer) => {
    for (const mutation of mutationList) {
      if (mutation.type === "attributes" && mutation.attributeName === 'open') {
        document.body.classList[mutation.target.open ? 'add' : 'remove']('dialog-opened')
      }
    }
  }).observe(dialog, { attributes: true, childList: true, subtree: true })
}

function applyShowThumbnails(showThumbnails) {
  if (showThumbnails) {
    document.body.classList.remove('hide-thumbnails')
  } else {
    document.body.classList.add('hide-thumbnails')
  }
  document.querySelector('#show-thumbnails').checked = showThumbnails
}

function createVideoElement (video) {
  const $video = document.createElement('video-element')
  $video.dataset['data'] = JSON.stringify(video)
  return $video
}

function updateDownloadedVideos (videos = []) {
  const $downloadedVideosContainer = document.querySelector('details.downloaded-videos-container')
  const $videosContainer = $downloadedVideosContainer.querySelector('.videos-container')
  videos.filter(v => v.downloaded).forEach(v => {
    const $existing = $downloadedVideosContainer.querySelector(`[data-video-id="${v.id}"]`)
    return $existing 
    ? $existing.replaceWith(createVideoElement(v)) 
    : $videosContainer.appendChild(createVideoElement(v))
  })
}
function updateSummarizedVideos (videos = []) {
  const $summarizedVideosContainer = document.querySelector('details.summarized-videos-container')
  const $videosContainer = $summarizedVideosContainer.querySelector('.videos-container')
  videos.filter(v => v.summary).forEach(v => {
    const $existing = $summarizedVideosContainer.querySelector(`[data-video-id="${v.id}"]`)
    return $existing 
    ? $existing.replaceWith(createVideoElement(v)) 
    : $videosContainer.appendChild(createVideoElement(v))
  })
}
