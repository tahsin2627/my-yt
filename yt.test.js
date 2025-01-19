import {test} from 'node:test'
import assert from 'assert';
// read json file data/mr_rip.json
// import fs module to read the file
import fs, { chownSync } from 'fs';
import path from 'path';

const __dirname = new URL('.', import.meta.url).pathname;

const filePath = path.join(__dirname, 'data', 'veritasium.json');
const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

test('extracts videos', () => {
  const videoTab = jsonData.contents.twoColumnBrowseResultsRenderer.tabs.find(t => t.tabRenderer.title === 'Video')
  assert.ok(videoTab);
  const videoContents = videoTab.tabRenderer.content.richGridRenderer.contents
  assert.ok(videoContents)
  const v = videoContents.filter(v => {
    return v.richItemRenderer?.content?.videoRenderer?.title?.runs[0]?.text
  }).map(v => ({
    title: v.richItemRenderer.content.videoRenderer.title.runs[0].text,
    url: `https://www.youtube.com/watch?v=${v.richItemRenderer.content.videoRenderer.videoId}`, 
    thumbnail: v.richItemRenderer.content.videoRenderer.thumbnail.thumbnails[0].url,
    description: v.richItemRenderer.content.videoRenderer.descriptionSnippet.runs[0].text,
    videoId: v.richItemRenderer.content.videoRenderer.videoId,
    publishedTime: v.richItemRenderer.content.videoRenderer.publishedTimeText.simpleText,
    viewCount: v.richItemRenderer.content.videoRenderer.viewCountText.simpleText,
    duration: v.richItemRenderer.content.videoRenderer.lengthText ? v.richItemRenderer.content.videoRenderer.lengthText.simpleText : null,
  }))
  console.log(v)
});