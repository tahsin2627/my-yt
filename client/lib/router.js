const routes = {
  '/': { template: document.getElementById('main-template'), async initialize() {
    console.log('initialize /')

    document.querySelector('channels-list').classList.remove('hide')

    let $videosContainer = document.querySelector('.main-videos-container')
    let videos = await fetch('/api/videos').then(res => res.json())
    console.log('videos.length', videos.length)
    if (videos.length === 0) {
      document.querySelector('empty-state').style.display = ''
      document.querySelector('video-filters').style.display = 'none'
    } else {
      document.querySelector('empty-state').style.display = 'none'
      document.querySelector('video-filters').style.display = ''
    }

    document.getElementById('search').removeAttribute('disabled')
    document.getElementById('search').classList.remove('hide')
    
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
    }, [])
    document.querySelector('channels-list').dataset['list'] = JSON.stringify(channelsList)

    window.utils.applyShowThumbnails(store.get(store.showThumbnailsKey))
    window.utils.applyShowBigPlayer(store.get(store.showBigPlayerKey))
  } },
  '/settings': { template: document.getElementById('settings-template'), async initialize () {
    console.log('initalize /settings')

    document.querySelector('channels-list').classList.add('hide')

    document.getElementById('search').setAttribute('disabled', 'disabled')
    document.getElementById('search').classList.add('hide')
    
    const $showThumbnails = document.getElementById('show-thumbnails')
    store.get(store.showThumbnailsKey) ? $showThumbnails.setAttribute('checked', 'true') : $showThumbnails.removeAttribute('checked')
    
    $showThumbnails.addEventListener('click', (event) => {
      store.toggle(store.showThumbnailsKey)
      window.utils.applyShowThumbnails(store.get(store.showThumbnailsKey))
    })

    const $showBigPlayer = document.getElementById('show-big-player')
    store.get(store.showBigPlayerKey) ? $showBigPlayer.setAttribute('checked', 'true') : $showBigPlayer.removeAttribute('checked')
    
    $showBigPlayer.addEventListener('click', (event) => {
      store.toggle(store.showBigPlayerKey)
      window.utils.applyShowBigPlayer(store.get(store.showBigPlayerKey))
    })

    const $showOriginalThumbnail = document.getElementById('show-original-thumbnail')
    store.get(store.showOriginalThumbnailKey) ? $showOriginalThumbnail.setAttribute('checked', 'true') : $showOriginalThumbnail.removeAttribute('checked')
    
    $showOriginalThumbnail.addEventListener('click', (event) => {
      store.toggle(store.showOriginalThumbnailKey)
    })
  } },
  '/404': { template: document.getElementById('not-found-template'), async initialize () {
    document.getElementById('search').setAttribute('disabled', 'disabled')
    document.getElementById('search').classList.add('hide')

    document.querySelector('channels-list').classList.add('hide')
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
