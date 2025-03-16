# my-yt

> MYGA - make *you*tube **great** again

A clean and minimal youtube frontend, without all the ads and whistles.
Supported by yt-dlp, and optionally your local AI model, to make your youtube experience local, mindful, succint and ad free.

![preview my-yt](/preview.png)

## Features

- Channel management/Subscriptions
- Download videos from YouTube, using `yt-dlp` behind the scenes
- Summarize video content using your local AI model
- Ignore videos you don't want to watch
- Play videos in background
- Offline media playback
- Subtitles using `<track>` element and WebVTT API
- No dependencies (except for `nano-spawn`, which itself has no transient deps)
- HTML/CSS only, no JS frameworks on client/server side
- Host it in your home network to playback videos on all your devices
- Just JSON files for persistence, stupid simple management and backup

[Check out the todo list](https://github.com/christian-fei/my-yt/issues/5)


> Application runs on http://localhost:3000 

## Installation (node.js)

```bash
git clone https://github.com/christian-fei/my-yt.git
cd my-yt
npm i
# install yt-dlp, please see https://github.com/yt-dlp/yt-dlp

npm start
```

## Installation (docker)

```bash
git clone https://github.com/christian-fei/my-yt.git
cd my-yt
docker compose up --build -d
```

or (currently **wip**)

```bash
docker run -p 3000:3000 -v /path/to/your/data/folder/for/persistence:/app/data christianfei/my-yt:latest
# ok calm down, here is an actual example command to copy-n-paste, jeez
docker run -p 3000:3000 -v $HOME/my-yt-data$:/app/data christianfei/my-yt:latest
```


## Why?

- **Why not??**
- wanted to get back my chronological feed, instead of a "algorithmically curated" one
  - you can just go to the "Subscriptions" page if you want to see your YouTube videos in chronological order, as [gently pointed out on HN](https://news.ycombinator.com/item?id=43374730)
- no distractions
- no clickbait thumbnails (using `mq2` instead of `mqdefault` thumbnail, thanks @drcheap)
- no comments
- no related videos, or any algorithmically determined videos pushed in your face
- no ads (in "just skip the sponsors")
- just videos and a clean UI
- wanted to dabble with [Server-sent Events](https://github.com/christian-fei/my-yt/blob/main/lib/sse.js)
- wanted to try integrate the so much hyped AI in a personal project
- wanted to try out `yt-dlp`
- wanted to experiment with the HTML5 [`<track>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/track) element and [WebVTT API](https://developer.mozilla.org/en-US/docs/Web/API/WebVTT_API)
- just wanted to make this, ok?
- I am even paying for YouTube Premium, so it's not a matter of money, but a matter of control over my attention and enhanced offline experience
- because I can, and wanted to do this
- feedback was awesome on [HackerNews](https://news.ycombinator.com/item?id=43373242), so here we are


## Upcoming features (TODO)

- Make it possible to delete downloaded videos
- Have a way to view a video at a reasonable size in between the small preview and full screen
- Add a way to download a single video without subscribing to a channel
- Specify LLM server endpoint
  - List and choose available model to use for summarization
- add some options for download quality (with webm merge for 4k support)



## Project

Here are some links to help you understand the project better:

### [server.js](https://github.com/christian-fei/my-yt/blob/main/lib/server.js)

Bare HTTP server

Handles SSE for client updates

Implements HTTP Ranged requests for video playback

### [llm.js](https://github.com/christian-fei/my-yt/blob/main/lib/llm.js)

Makes requests using the chat completions API of LMStudio.

### [sse.js](https://github.com/christian-fei/my-yt/blob/main/lib/sse.js)

Utility functions for Server-sent events

### [subtitles-summary.js](https://github.com/christian-fei/my-yt/blob/main/lib/subtitles-summary.js)

Summarizes video transcript using LMStudio API

### [youtube.js](https://github.com/christian-fei/my-yt/blob/main/lib/youtube.js)

yt-dlp wrapper to download videos, get channel videos and video information and transcript

### [repository.js](https://github.com/christian-fei/my-yt/blob/main/lib/repository.js)

Handles persistence of video information (set video as downloaded, summary, ignored, upserting videos, etc.)

### [client](https://github.com/christian-fei/my-yt/tree/main/client)

dependency less, bare HTML5, CSS3 and JS for a basic frontend

Handles SSE updates, interacting with the API

## General information

Currently, on the LLM side of things:

- supports basic chat completions API (LMStudio right now)
  - expects `lms server` to be running on `http://localhost:1234`
- works with `meta-llama-3.1-8b-instruct` model
- customization will come in the future if there's enough interest (let me know by opening an issue or pull-request)


---

Download the project while you can before I get striked with a DMCA takedown request