# my-yt

A clean and minimal youtube frontend supported by yt-dlp, and optionally your local AI model, to make your youtube experience local, mindful and succint.

| default | dark mode |
:-------------------------:|:-------------------------:
![preview my-yt](/preview.png) | ![preview my-yt dark](/preview-dark.png)






## Features

- Channel management/Subscriptions
- Download videos from YouTube, using `yt-dlp` behind the scenes
- Ignore videos you don't want to watch
- Remove sponsors automatically thanks to SponsorBlock
- Offline media playback
- Native Google Chromecast support
- Disable clickbait thumbnails
- Play videos in background
- Summarize video content using your local AI model (e.g. Ollama/LMStudio) or hosted provider (e.g. OpenAI, Anthropic)
- Native Picture-in-Picture support
- No dependencies (except for `nano-spawn`, which itself has no transient deps)
- HTML/CSS only, no JS frameworks on client/server side
- Subtitles using `<track>` element and WebVTT API
- Automatic transcoding to h264 for max compat (especially for iOS devices)
- Host it in your home network to playback videos on all your devices
- Just JSON files for persistence, stupid simple management and backup

[Check out the todo list](https://github.com/christian-fei/my-yt/issues/5)


> Application runs on http://localhost:3000





## Installation (node.js)

```bash
git clone https://github.com/christian-fei/my-yt.git
cd my-yt
npm i
# install yt-dlp, https://github.com/yt-dlp/yt-dlp
# install ffmpeg, https://ffmpeg.org/

npm start
```








## Installation (docker)

```bash
git clone https://github.com/christian-fei/my-yt.git
cd my-yt
docker compose up --build -d
```

or

```bash
docker run -p 3000:3000 -v /path/to/your/data/folder/for/persistence:/app/data christianfei/my-yt:latest
# ok calm down, here is an actual example command to copy-n-paste, jeez
docker run -d -p 3000:3000 -v $HOME/my-yt-data:/app/data christianfei/my-yt:latest
```

## Environment variables for LLM integration

| Variable  |  Type |  Default |
|---|---|---|
| AI_APIKEY | string  |   |
| AI_MODEL |  string |  meta-llama-3.1-8b-instruct |
| AI_HOST | string  |  http://127.0.0.1:1234 |
| AI_ENDPOINT | string  |  /v1/chat/completions |
| AI_TEMPERATURE | string  |  0 |


**Simply set the env variables to your needs, by following the format above (e.g. url starting with "http", no ending slash, AI_ENDPOINT with leading slash and path)**

Some examples:

```bash
AI_MODEL=gpt-4o-mini AI_HOST=https://api.openai.com AI_APIKEY=sk-proj-123 npm start

# or with docker in background using OpenAI
docker run -e AI_MODEL=gpt-4o-mini -e AI_HOST=https://api.openai.com -e AI_APIKEY=sk-proj-123 -d -p 3000:3000 -v $HOME/my-yt-data:/app/data christianfei/my-yt:latest
# or with docker in background using Anthropic
docker run -e AI_MODEL=claude-xyz -e AI_HOST=https://api.anthropic.com -e AI_ENDPOINT=/v1/messages -e AI_APIKEY=your-key --rm -it -p 3000:3000 -v $HOME/my-yt-data:/app/data christianfei/my-yt:latest
```

## Environment variable to skip transcoding to h264

If your system is under stress when downloading a video, that could be because of the automatic transcoding that's happening behind the scenes.

This is a feature to make the video compatible with most devices (especially iOS)

If you don't have the need, you can skip the transcoding process by setting `SKIP_TRANSCODING=true`.




## Project

Here are some links to help you understand the project better:

### [server.js](https://github.com/christian-fei/my-yt/blob/main/lib/server.js)

Bare HTTP server

Handles SSE for client updates

Implements HTTP Ranged requests for video playback

### [llm/index.js](https://github.com/christian-fei/my-yt/blob/main/lib/llm/index.js)

Makes requests using the chat completions API of your favorite LLM provider (either locally using LMStudio/Ollama, or hosted like OpenAI/Anthropic)

### [sse.js](https://github.com/christian-fei/my-yt/blob/main/lib/sse.js)

Utility functions for Server-sent events

### [subtitles-summary.js](https://github.com/christian-fei/my-yt/blob/main/lib/subtitles-summary.js)

Summarizes video transcript using LLM provider

### [youtube.js](https://github.com/christian-fei/my-yt/blob/main/lib/youtube.js)

yt-dlp wrapper to download videos, get channel videos and video information and transcript

### [repository.js](https://github.com/christian-fei/my-yt/blob/main/lib/repository.js)

Handles persistence of video information (set video as downloaded, summary, ignored, upserting videos, etc.)

### [client](https://github.com/christian-fei/my-yt/tree/main/client)

dependency less, bare HTML5, CSS3 and JS for a basic frontend

Handles SSE updates, interacting with the API






## Why?

- wanted to get back my chronological feed, instead of a "algorithmically curated" one
- no distractions
- no clickbait thumbnails (using `mq2` instead of `mqdefault` thumbnail, thanks @drcheap)
- no comments
- no related videos, or any algorithmically determined videos pushed in your face
- no sponsors, thanks to SponsorBlock
- just videos and a clean UI
- wanted to dabble with [Server-sent Events](https://github.com/christian-fei/my-yt/blob/main/lib/sse.js)
- wanted to try integrate the so much hyped AI in a personal project
- wanted to try out `yt-dlp`
- wanted to experiment with the HTML5 [`<track>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/track) element and [WebVTT API](https://developer.mozilla.org/en-US/docs/Web/API/WebVTT_API)
- feedback was awesome on [HackerNews](https://news.ycombinator.com/item?id=43373242), so here we are
- I am even paying for YouTube Premium, so it's not a matter of money, but a matter of control over my attention and enhanced offline experience




## development

run tests

```
npm t
```


build docker image

```bash
docker build . -t my-yt:latest
```
