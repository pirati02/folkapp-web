# FolkApp

Georgian folk songs and chants: a web player and its API.

| Folder | What | Docs |
|---|---|---|
| `web/` | Angular web app | [web/README.md](web/README.md) |
| `server/` | Node.js API; songs are streamed from Google Drive | [server/README.md](server/README.md) |

Both are hosted on [Render](https://render.com), defined in [render.yaml](render.yaml).

## Run locally

```bash
cd server && docker compose up -d && npm install && npm run dev   # API on http://localhost:8080
cd web && npm install && npm start                                # web app on http://localhost:4200
```

The API needs a `server/.env` and Google Drive access first: see "Local development" in
[server/README.md](server/README.md).
