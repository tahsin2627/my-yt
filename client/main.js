import Store from '/lib/store.js'
const store = new Store()
window.store = store
window.createVideoElement = createVideoElement


// app: sse updates and renders
const eventSource = new window.EventSource('/')
let $videosContainer = document.querySelector('.main-videos-container')

eventSource.onmessage = (message) => {
  if (!message || !message.data) return console.error('skipping empty message')
  try {
    const data = JSON.parse(message.data, {})
    console.log('[sse] message', data)

    if (data.type === 'download-log-line' && data.line) {
      const $downloadLog = document.querySelector('.download-log')
      $downloadLog.open = true
      const $downloadLogLines = document.querySelector('.download-log .lines')
      const text = $downloadLogLines.innerText
      let lines = text.split('\n')
      lines = lines.join('\n') + '\n' + data.line
      $downloadLogLines.innerText = lines
      $downloadLogLines.scrollTop = $downloadLogLines.scrollHeight
      return
    }
    
    if (data.type === 'new-videos' && data.videos) {
      $videosContainer = document.querySelector('.main-videos-container')
      if (!$videosContainer) return
      const showOriginalThumbnail = store.get(store.showOriginalThumbnailKey)

      data.videos.forEach(video => {
        const $videoElement = $videosContainer.querySelector('video-element')
        if (!$videoElement) return $videosContainer.appendChild(createVideoElement(video, showOriginalThumbnail))
        $videoElement.parentNode.insertBefore(createVideoElement(video, showOriginalThumbnail), $videoElement.nextSibling)
      })
      return
    }
    if (data.type === 'summary-error' && data.videoId) {
      const $videoElement = document.querySelector(`[data-video-id="${data.videoId}"]`)
      $videoElement && $videoElement.render && $videoElement.render()
      return
    }
    if (data.type === 'summary' && data.videoId && data.summary && data.transcript) {
      ;[...document.querySelectorAll(`[data-video-id="${data.videoId}"]`)].forEach($video => {
        if (!$video.dataset['data']) return
        const videoData = JSON.parse($video.dataset['data'])
        Object.assign(videoData, { summary: data.summary, transcript: data.transcript })
        $video.dataset['data'] = JSON.stringify(videoData)
      })
      return
    }
    if (data.type === 'downloaded' && data.videoId && data.downloaded !== undefined) {
      ;[...document.querySelectorAll(`[data-video-id="${data.videoId}"]`)].forEach($video => {
        if (!$video.dataset['data']) return
        const videoData = JSON.parse($video.dataset['data'])
        videoData.downloaded = data.downloaded
        $video.dataset['data'] = JSON.stringify(videoData)
      })
      return
    }
    if (data.type === 'ignored' && data.videoId && data.ignored !== undefined) {
      ;[...document.querySelectorAll(`[data-video-id="${data.videoId}"]`)].forEach($video => {
        if (!$video.dataset['data']) return
        const videoData = JSON.parse($video.dataset['data'])
        videoData.ignored = data.ignored
        $video.dataset['data'] = JSON.stringify(videoData)
      })
      return
    }
    console.warn('unhandled', data)
  } catch (err) {
    console.error('sse parse error', err)
  }
}



// summary modal
const $summary = document.querySelector('dialog#summary')
const $closeSummary = $summary.querySelector("button")
$closeSummary.addEventListener("click", () => $summary.close())
$summary.addEventListener('close', () => {})


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

function createVideoElement (video, showOriginalThumbnail = false) {
  const $video = document.createElement('video-element')
  $video.dataset['data'] = JSON.stringify(Object.assign(video, showOriginalThumbnail ? {
    thumbnail: video.thumbnail.replace('mq2.jpg', 'mqdefault.jpg')
  } : {}))
  $video.dataset['videoId'] = video.id
  return $video
}
