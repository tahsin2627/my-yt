import Store from '/lib/store.js'
const store = new Store()
window.store = store

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
      const ignoredTerms = window.store.get(window.store.ignoreTermsKey)
      
      const allVideos = data.videos
      .filter(video => video.title.split(' ').every(word => !ignoredTerms.includes(word.toLowerCase().replace(/('s|"|,|:)/,''))))
      .sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt))
      .filter((_, i) => i < 300)

      allVideos.forEach(video => $videosContainer.appendChild(createVideoElement(video)))

      const channelsList = data.videos.reduce((acc, video) => {
        if (!acc.includes(video.channelName)) acc.push(video.channelName)
        return acc
      }, []).join(',')
      document.querySelector('channels-list').dataset['list'] = channelsList
    }
    if (data.type === 'new-videos' && data.videos) {
      console.warn('new-videos', data)
      data.videos.forEach(video => {
        const $videoElement = $videosContainer.querySelector('video-element')
        if (!$videoElement) {
          $videosContainer.appendChild(createVideoElement(video))
          return
        }
        $videoElement.parentNode.insertBefore(createVideoElement(video), $videoElement.nextSibling)
      })
    }
    if (data.type === 'summary-error' && data.videoId) {
      const $videoElement = document.querySelector(`[data-video-id="${data.videoId}"]`)
      $videoElement && $videoElement.render && $videoElement.render()
    }
    if (data.type === 'summary' && data.videoId && data.summary && data.transcript) {
      ;[...document.querySelectorAll(`[data-video-id="${data.videoId}"]`)].forEach($video => {
        if (!$video.dataset['data']) return
        const videoData = JSON.parse($video.dataset['data'])
        Object.assign(videoData, { summary: data.summary, transcript: data.transcript })
        $video.dataset['data'] = JSON.stringify(videoData)
      })
    }
    if (data.type === 'downloaded' && data.videoId) {
      ;[...document.querySelectorAll(`[data-video-id="${data.videoId}"]`)].forEach($video => {
        if (!$video.dataset['data']) return
        const videoData = JSON.parse($video.dataset['data'])
        videoData.downloaded = true
        $video.dataset['data'] = JSON.stringify(videoData)
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
  event.preventDefault()
  store.toggle(store.showThumbnailsKey)
  applyShowThumbnails(store.get(store.showThumbnailsKey))
})
const $addIgnoredTerm = document.getElementById('add-ignored-term')
$addIgnoredTerm.addEventListener('keyup', (event) => {
  event.preventDefault()
  if (event.key !== 'Enter') return
  const ignoredTerm = $addIgnoredTerm.value.trim().toLowerCase()
  if (ignoredTerm) {
    store.push(store.ignoreTermsKey, ignoredTerm)
    $addIgnoredTerm.value = ''
  }
  applyIgnoredTerms(store.get(store.ignoreTermsKey))
})

function applyIgnoredTerms (ignoredTerms) {
  const $ignoredTerms = document.getElementById('ignored-terms')
  $ignoredTerms.innerHTML = ignoredTerms.map(term => /*html*/`<li class="ignored-term">${term}</li>`).join('')
  if (ignoredTerms.length === 0) {
    $ignoredTerms.innerHTML = /*html*/`<li>No ignored terms</li>`
  }
}

const $showDownloadedVideos = document.getElementById('show-downloaded-videos')
handleClick($showDownloadedVideos, (event) => {
  event.target.classList.toggle('active')
  document.body.classList.toggle('show-downloaded-videos')
})
const $showSummarizedVideos = document.getElementById('show-summarized-videos')
handleClick($showSummarizedVideos, (event) => {
  event.target.classList.toggle('active')
  document.body.classList.toggle('show-summarized-videos')
})
const $showIgnoredVideos = document.getElementById('show-ignored-videos')
handleClick($showIgnoredVideos, (event) => {
  event.target.classList.toggle('active')
  document.body.classList.toggle('show-ignored-videos')
})

// apply settings                                                                                                                                                          
applyShowThumbnails(store.get(store.showThumbnailsKey))
applyIgnoredTerms(store.get(store.ignoreTermsKey))

// observe dialog open/close and prevent body background scroll
observeDialogOpenPreventScroll($settings)
observeDialogOpenPreventScroll($summary)

function handleClick ($el, handler) {
  if (!$el) return
  $el.addEventListener('click', handler)
  $el.addEventListener('keydown', (event) => event.key === 'Enter' && handler(event))
}

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
  $video.dataset['videoId'] = video.id
  return $video
}

window.createVideoElement = createVideoElement
