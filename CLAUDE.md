# Bridge Four — Claude instructions

## README maintenance
Whenever you commit a change to this repo, update the **Recent changes** section of `README.md`:
- Add a new bullet at the top of the list in the format `**YYYY-MM-DD** — <short summary of what changed>`
- Keep the list to the last ~8 entries (remove the oldest if it grows longer)
- Do this as part of the same commit, not a separate one

## Project context
- Live URL: https://bridge-four-1.onrender.com (Render free tier — server sleeps after 15 min idle)
- Players: David (N), Hamish (E), Vivienne (S), Caroline (W)
- Socket.IO transport is forced to `websocket` only — do not change to polling
- All game state is in-memory on the server; no database
- Google Sheets webhook logs completed hands; `SHEETS_WEBHOOK_URL` env var must be set in Render
- `ANTHROPIC_API_KEY` env var enables the post-deal AI analysis button
