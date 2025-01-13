import http from 'http';
import { URL } from 'url';
import { execa } from 'execa';
import fs from 'fs';

let channels = await fs.promises.readFile('./data/channels.json')
  .then(data => JSON.parse(data)).catch(err => []);
const videos = await fs.promises.readFile('./data/videos.json')
  .then(data => JSON.parse(data)).catch(err => ({}))

function channelWithAt(channelName = '') {
  return channelName.startsWith('@') ? channelName : '@' + channelName
} 

async function getChannelId(channelName) {
  const response = await fetch(`https://www.youtube.com/${channelWithAt(channelName) }`)
  const text = await response.text()
  const channelId = text?.split('channel_id=')[1]?.slice(0, 24)
  console.log('getChannelId', channelName, channelId)
  return channelId
}

async function updateAndPersistVideos () {
  return getVideos()
  .then(async videos => {
    await fs.promises.writeFile('./data/videos.json', JSON.stringify(videos, null, 2));
    console.log('Videos saved to ./data/videos.json');
  }).catch(error => {
    console.error('Error fetching videos:', error);
  })
}

async function getVideos() {
  for (const channel of channels) {
    console.log('updating videos for', channel.name)
    const channelVideos = await getVideosFor(channel.name);
    if (channelVideos) {
      videos[channel.name] = channelVideos;
    }
  }
  return videos;
}

async function getVideosFor(channelName) {
  try {
    const response = await fetch(`https://www.youtube.com/${channelWithAt(channelName)}/videos`);
    const text = await response.text();
    const match = text.match(/var ytInitialData = (.+?);<\/script>/);
    if (match && match[1]) {
      const json = JSON.parse(match[1].trim())
      fs.mkdirSync('./data', { recursive: true })
      fs.writeFileSync(`./data/${channelName}.json`, JSON.stringify(json, null, 2))
      const videoTab = json.contents.twoColumnBrowseResultsRenderer.tabs.find(t => t.tabRenderer.title === 'Video')
      const videos = videoTab.tabRenderer.content.richGridRenderer.contents
      return videos
        .filter(v => {
          return v?.richItemRenderer?.content?.videoRenderer?.title?.runs[0]?.text
        })
        .map(v => ({
          channelName,
          title: v.richItemRenderer.content.videoRenderer.title?.runs[0].text,
          url: `https://www.youtube.com/watch?v=${v.richItemRenderer.content.videoRenderer.videoId}`, 
          thumbnail: v.richItemRenderer.content.videoRenderer.thumbnail?.thumbnails[0].url,
          description: v.richItemRenderer.content.videoRenderer.descriptionSnippet?.runs[0].text,
          videoId: v.richItemRenderer.content.videoRenderer.videoId,
          publishedTime: v.richItemRenderer.content.videoRenderer.publishedTimeText.simpleText,
          viewCount: v.richItemRenderer.content.videoRenderer.viewCountText.simpleText,
          duration: v.richItemRenderer.content.videoRenderer.lengthText ? v.richItemRenderer.content.videoRenderer.lengthText.simpleText : null,
        }))
    }  
    return null
  } catch (error) {
    console.error('Error fetching latest video:', error);
    return null;
  }
}

async function downloadVideo(url, path) {
  try {
    await execa('yt-dlp', [url, '-o', path]);
    console.log('Download completed');
  } catch (error) {
    console.error('Error downloading video:', error);
  }
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  if (parsedUrl.pathname === '/videos') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(videos));
    return 
  }
  if (parsedUrl.pathname === '/channels' && req.method === 'POST') {
    console.log('adding channel')
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      let { name } = JSON.parse(body);
      name = name.trim()
      if (!channels.find(c => c.name === name)) {
        const id = await getChannelId(name)
        console.log('-- added channel', name, id)
        channels.push({ name, id });
        await fs.promises.writeFile('./data/channels.json', JSON.stringify(channels));
        await updateAndPersistVideos()
        res.writeHead(201, { 'Content-Type': 'text/plain' });
        res.end('Channel added');
      } else {
        console.log('channel already added', name)
        res.writeHead(409, { 'Content-Type': 'text/plain' });
        res.end('Channel already added');
      }
    })
    return
  } 
  if (parsedUrl.pathname === '/download-video' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      const { url, path } = JSON.parse(body);
      downloadVideo(url, path).then(() => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Download started');
      }).catch(error => {
        console.error('Error starting download:', error);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
      });
    });
    return
  }
  const indexHtml = await fs.promises.readFile('index.html', 'utf8');
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(indexHtml);
});

async function main ({port = 3000} = {}) {
  await updateAndPersistVideos()
  server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

if (import.meta.url.endsWith('server.js')) {
  main();
}

