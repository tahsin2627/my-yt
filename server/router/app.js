import fs from 'fs'
import { URL } from 'url'

export default function apiHandler (req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`)
  // console.log(req.method, url.pathname)
  if (url.pathname === '/main.css') { return fileHandler('client/main.css', 'text/css')(req, res) }
  if (url.pathname === '/normalize.css') { return fileHandler('client/normalize.css', 'text/css')(req, res) }
  if (url.pathname === '/main.js') { return fileHandler('client/main.js', 'application/javascript')(req, res) }
  if (url.pathname === '/lib/store.js') { return fileHandler('client/lib/store.js', 'application/javascript')(req, res) }
  if (url.pathname === '/lib/router.js') { return fileHandler('client/lib/router.js', 'application/javascript')(req, res) }
  if (url.pathname === '/lib/utils.js') { return fileHandler('client/lib/utils.js', 'application/javascript')(req, res) }
  if (url.pathname === '/components/video-element.js') { return fileHandler('client/components/video-element.js', 'application/javascript')(req, res) }
  if (url.pathname === '/components/forms/add-channel-form.js') { return fileHandler('client/components/forms/add-channel-form.js', 'application/javascript')(req, res) }
  if (url.pathname === '/components/forms/manage-channels-form.js') { return fileHandler('client/components/forms/manage-channels-form.js', 'application/javascript')(req, res) }
  if (url.pathname === '/components/forms/video-quality-form.js') { return fileHandler('client/components/forms/video-quality-form.js', 'application/javascript')(req, res) }
  if (url.pathname === '/components/forms/manage-disk-space-form.js') { return fileHandler('client/components/forms/manage-disk-space-form.js', 'application/javascript')(req, res) }
  if (url.pathname === '/components/forms/transcode-videos-form.js') { return fileHandler('client/components/forms/transcode-videos-form.js', 'application/javascript')(req, res) }
  if (url.pathname === '/components/forms/excluded-terms-form.js') { return fileHandler('client/components/forms/excluded-terms-form.js', 'application/javascript')(req, res) }
  if (url.pathname === '/components/videos-container.js') { return fileHandler('client/components/videos-container.js', 'application/javascript')(req, res) }
  if (url.pathname === '/components/sse-connection.js') { return fileHandler('client/components/sse-connection.js', 'application/javascript')(req, res) }
  if (url.pathname === '/components/search-videos.js') { return fileHandler('client/components/search-videos.js', 'application/javascript')(req, res) }
  if (url.pathname === '/components/channels-list.js') { return fileHandler('client/components/channels-list.js', 'application/javascript')(req, res) }
  if (url.pathname === '/components/empty-state.js') { return fileHandler('client/components/empty-state.js', 'application/javascript')(req, res) }
  if (url.pathname === '/manifest.json') { return fileHandler('client/manifest.json', 'text/json')(req, res) }
  if (url.pathname === '/favicon.ico') { return fileHandler('client/favicon.ico', 'image/x-icon')(req, res) }
  if (url.pathname === '/favicon.svg') { return fileHandler('client/favicon.svg', 'image/svg+xml')(req, res) }
  if (url.pathname === '/apple-touch-icon.png') { return fileHandler('client/apple-touch-icon.png', 'image/png')(req, res) }

  return fileHandler('client/index.html', 'text/html')(req, res)
}

function fileHandler (filePath, contentType) {
  return (req, res) => {
    res.writeHead(200, { 'Content-Type': contentType })
    res.end(fs.readFileSync(filePath, 'utf8'))
  }
}
