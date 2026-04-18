# Centrifugo configuration

`config.json` in this directory is **mounted read-only** into the
`centrifugo` container by `docker-compose.yml`:

```yaml
volumes:
  - ./centrifugo/config.json:/centrifugo/config.json:ro
```

It intentionally contains **no secrets**. The HMAC token secret and HTTP API
key are injected via environment variables that Centrifugo picks up
automatically:

| Environment variable                 | Centrifugo config key        |
|--------------------------------------|------------------------------|
| `CENTRIFUGO_TOKEN_HMAC_SECRET_KEY`   | `token_hmac_secret_key`      |
| `CENTRIFUGO_API_KEY`                 | `api_key`                    |

Both values come from the repository root `.env` (or the dev defaults baked
into `docker-compose.yml`). Do not edit this config at runtime — restart the
container after any change.
