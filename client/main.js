import Store from '/lib/store.js'
const store = new Store()
window.store = store



function handleRoute(route = window.location.pathname) {
  console.log('handling route', route)
  if (routes[route]) {
    document.querySelector('main').replaceChildren(routes[route].template.content.cloneNode(true))
    routes[route].initialize && routes[route].initialize()
  } else {
    document.querySelector('main').replaceChildren(routes['/404'].template.content.cloneNode(true))
    routes['/404'].initialize && routes['/404'].initialize()
  }
}

const routes = {
  '/': { template: document.getElementById('main-template'), title: 'My YT', async initialize() {
    console.log('initialize /')


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
    

    let $videosContainer = document.querySelector('.main-videos-container')
    if (!$videosContainer) return
    let videos = await fetch('/videos').then(res => res.json())

    $videosContainer.innerHTML = ''
    const ignoredTerms = window.store.get(window.store.ignoreTermsKey)
    
    videos = videos
    .filter(video => video.title.split(' ').every(word => !ignoredTerms.includes(word.toLowerCase().replace(/('s|"|,|:)/,''))))
    .sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt))
    // .filter((_, i) => i < 1000)

    videos.forEach(video => $videosContainer.appendChild(createVideoElement(video)))

    const channelsList = videos.reduce((acc, video) => {
      if (!acc.includes(video.channelName)) acc.push(video.channelName)
      return acc
    }, []).join(',')
    document.querySelector('channels-list').dataset['list'] = channelsList
  } },
  '/settings': { template: document.getElementById('settings-template'), title: 'My YT - Settings', async initialize () {
    console.log('initalize /settings')
  } },
  '/404': { template: document.getElementById('not-found-template'), title: 'Not Found' }
}

handleRoute()
window.addEventListener('popstate', (event) => {
  console.log('popstate', window.location.pathname)
  handleRoute()
})
document.querySelectorAll('[href="/"],[href="/settings"]').forEach(($el) => {
  $el.addEventListener('click', (event) => {
    event.preventDefault()
    const path = new URL($el.href, window.location.origin).pathname
    console.log('navigating ->', path)
    window.history.pushState({}, '', path)
    var popStateEvent = new PopStateEvent('popstate', {})
    dispatchEvent(popStateEvent)
  })
})

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

      data.videos.forEach(video => {
        const $videoElement = $videosContainer.querySelector('video-element')
        if (!$videoElement) return $videosContainer.appendChild(createVideoElement(video))
        $videoElement.parentNode.insertBefore(createVideoElement(video), $videoElement.nextSibling)
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
    if (data.type === 'downloaded' && data.videoId) {
      ;[...document.querySelectorAll(`[data-video-id="${data.videoId}"]`)].forEach($video => {
        if (!$video.dataset['data']) return
        const videoData = JSON.parse($video.dataset['data'])
        videoData.downloaded = true
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

function createVideoElement (video) {
  const $video = document.createElement('video-element')
  $video.dataset['data'] = JSON.stringify(video)
  $video.dataset['videoId'] = video.id
  return $video
}

// settings ui
// const $showThumbnails = document.getElementById('show-thumbnails')
// $showThumbnails.addEventListener('click', (event) => {
//   event.preventDefault()
//   store.toggle(store.showThumbnailsKey)
//   applyShowThumbnails(store.get(store.showThumbnailsKey))
// })
// const $addIgnoredTerm = document.getElementById('add-ignored-term')
// $addIgnoredTerm.addEventListener('keyup', (event) => {
//   event.preventDefault()
//   if (event.key !== 'Enter') return
//   const ignoredTerm = $addIgnoredTerm.value.trim().toLowerCase()
//   if (ignoredTerm) {
//     store.push(store.ignoreTermsKey, ignoredTerm)
//     $addIgnoredTerm.value = ''
//   }
//   applyIgnoredTerms(store.get(store.ignoreTermsKey))
// })

// function applyIgnoredTerms (ignoredTerms) {
//   const $ignoredTerms = document.getElementById('ignored-terms')
//   if (!$ignoredTerms) return
//   $ignoredTerms.innerHTML = ignoredTerms.map(term => /*html*/`<li class="ignored-term">${term}</li>`).join('')
//   if (ignoredTerms.length === 0) {
//     $ignoredTerms.innerHTML = /*html*/`<li>No ignored terms</li>`
//   }
// }


// applyShowThumbnails(store.get(store.showThumbnailsKey))
// applyIgnoredTerms(store.get(store.ignoreTermsKey))


// function applyShowThumbnails(showThumbnails) {
//   if (showThumbnails) {
//     document.body.classList.remove('hide-thumbnails')
//   } else {
//     document.body.classList.add('hide-thumbnails')
//   }
//   const $showThumbnailsCheckbox = document.getElementById('show-thumbnails')
//   if ($showThumbnailsCheckbox) $showThumbnailsCheckbox.checked = showThumbnails
// }