/* global self, caches */
self.addEventListener('activate', event => {
  console.log('Service Worker activating...')
})

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open('my-cache').then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/manifest.json',
        '/normalize.css',
        '/main.css',
        '/favicon.ico',
        '/lib/router.js',
        '/lib/store.js',
        '/lib/utils.js',
        '/components/channels-list.js',
        '/components/empty-state.js',
        '/components/search-videos.js',
        '/components/sse-connection.js',
        '/components/video-element.js',
        '/components/videos-container.js',
        '/components/forms/add-channel-form.js',
        '/components/forms/excluded-terms-form.js',
        '/components/forms/manage-channel-form.js',
        '/components/forms/manage-disk-space-form.js',
        '/components/forms/transcode-videos-form.js',
        '/components/forms/video-quality-form.js'
      ])
    })
  )
})

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request)
    })
  )
})
