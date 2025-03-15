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
- No dependencies (except for `nano-spawn`), HTML/CSS only, no JS frameworks on client/server side
- Host it in your home network to playback videos on all your devices

Application runs on http://localhost:3000 

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

## General information

Currently, on the LLM side of things:

- supports basic chat completions API (LMStudio right now)
  - expects `lms server` to be running on `http://localhost:1234`
- works with `meta-llama-3.1-8b-instruct` model
- customization will come in the future if there's enough interest (let me know by opening an issue or pull-request)


---

Download the project while you can before I get striked with a DMCA takedown request