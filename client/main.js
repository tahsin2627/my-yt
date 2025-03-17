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
  '/': { template: document.getElementById('main-template'), async initialize() {
    console.log('initialize /')

    let $videosContainer = document.querySelector('.main-videos-container')
    if (!$videosContainer) return
    let videos = await fetch('/videos').then(res => res.json())
    console.log('videos.length', videos.length)
    if (videos.length === 0) {
      document.querySelector('empty-state').style.display = ''
      document.querySelector('channels-list').style.display = 'none'
      document.querySelector('video-filters').style.display = 'none'
    } else {
      document.querySelector('empty-state').style.display = 'none'
      document.querySelector('channels-list').style.display = ''
      document.querySelector('video-filters').style.display = ''
    }

    document.getElementById('search').removeAttribute('disabled')
    
    $videosContainer.innerHTML = ''
    const ignoredTerms = store.get(store.ignoreTermsKey)
    const showOriginalThumbnail = store.get(store.showOriginalThumbnailKey)
    
    videos = videos
    .filter(video => video.title.split(' ').every(word => !ignoredTerms.includes(word.toLowerCase().replace(/('s|"|,|:)/,''))))
    .sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt))
    // .filter((_, i) => i < 1000)

    videos.forEach(video => $videosContainer.appendChild(createVideoElement(video, showOriginalThumbnail)))

    const channelsList = videos.reduce((acc, video) => {
      if (!acc.includes(video.channelName)) acc.push(video.channelName)
      return acc
    }, []).join(',')
    document.querySelector('channels-list').dataset['list'] = channelsList

    applyShowThumbnails(store.get(store.showThumbnailsKey))
    applyShowBigPlayer(store.get(store.showBigPlayerKey))
  } },
  '/settings': { template: document.getElementById('settings-template'), async initialize () {
    console.log('initalize /settings')

    document.getElementById('search').setAttribute('disabled', 'disabled')
    
    const $showThumbnails = document.getElementById('show-thumbnails')
    store.get(store.showThumbnailsKey) ? $showThumbnails.setAttribute('checked', 'true') : $showThumbnails.removeAttribute('checked')
    
    $showThumbnails.addEventListener('click', (event) => {
      store.toggle(store.showThumbnailsKey)
      applyShowThumbnails(store.get(store.showThumbnailsKey))
    })

    const $showBigPlayer = document.getElementById('show-big-player')
    store.get(store.showBigPlayerKey) ? $showBigPlayer.setAttribute('checked', 'true') : $showBigPlayer.removeAttribute('checked')
    
    $showBigPlayer.addEventListener('click', (event) => {
      store.toggle(store.showBigPlayerKey)
      applyShowBigPlayer(store.get(store.showBigPlayerKey))
    })

    const $showOriginalThumbnail = document.getElementById('show-original-thumbnail')
    store.get(store.showOriginalThumbnailKey) ? $showOriginalThumbnail.setAttribute('checked', 'true') : $showOriginalThumbnail.removeAttribute('checked')
    
    $showOriginalThumbnail.addEventListener('click', (event) => {
      store.toggle(store.showOriginalThumbnailKey)
    })
  } },
  '/404': { template: document.getElementById('not-found-template'), async initialize () {
    document.getElementById('search').setAttribute('disabled', 'disabled')
  } }
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

function createVideoElement (video, showOriginalThumbnail = false) {
  const $video = document.createElement('video-element')
  $video.dataset['data'] = JSON.stringify(Object.assign(video, showOriginalThumbnail ? {
    thumbnail: video.thumbnail.replace('mq2.jpg', 'mqdefault.jpg')
  } : {}))
  $video.dataset['videoId'] = video.id
  return $video
}

// settings ui
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


// applyIgnoredTerms(store.get(store.ignoreTermsKey))


function applyShowThumbnails(showThumbnails) {
  if (showThumbnails) {
    document.body.classList.remove('hide-thumbnails')
  } else {
    document.body.classList.add('hide-thumbnails')
  }
  const $showThumbnailsCheckbox = document.getElementById('show-thumbnails')
  if ($showThumbnailsCheckbox) $showThumbnailsCheckbox.checked = showThumbnails
}
function applyShowBigPlayer(showBigPlayer) {
  if (showBigPlayer) {
    document.body.classList.add('show-big-player')
  } else {
    document.body.classList.remove('show-big-player')
  }
  const $showBigPlayerCheckbox = document.getElementById('show-big-player')
  if ($showBigPlayerCheckbox) $showBigPlayerCheckbox.checked = showBigPlayer
}