# Project notes (OpenSpec)

- **Centrifugo:** Docker image `centrifugo/centrifugo:v6` (HTTP listen
  `http_server.port` `3080` in `centrifugo/config.json`). Connect + subscribe
  proxies call the Next.js app over the compose network. Server publishes use
  `CENTRIFUGO_URL` (e.g. `http://centrifugo:3080`) and `CENTRIFUGO_API_KEY`
  matching `http_api.key` in that file for development.
