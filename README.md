# Bridge Four

A real-time multiplayer bridge card game for four players, built with React, Node.js, and Socket.IO. Includes AI-powered deal analysis via Claude.

**Live at: [bridge-four-1.onrender.com](https://bridge-four-1.onrender.com)**

Players: David · Hamish · Vivienne · Caroline

---

## Features

- **4-player real-time bridge** — preset seats (North/East/South/West), one shared game room
- **Bot fill-in** — any empty seat can be filled with an AI bot so you can play with fewer than 4 humans
- **Full bidding box** — 7×5 grid with Pass / Double / Redouble; colour-coded suits (♥♦ red, ♣♠ black per bridge convention)
- **Partnership selector** — choose who partners whom at the start of each rubber
- **Dummy display** — dummy hand shown as 4 suit columns after the opening lead; declarer plays both hands
- **Deal review** — see all four hands after each deal, with the full bidding history
- **Claude AI analysis** — one-tap post-deal analysis: optimal contract, bidding critique, and commentary
- **Google Sheets scoring** — completed hands posted automatically to a shared sheet
- **Career scores** — individual totals persist across partnership rotations and rubbers
- **WebRTC video feeds** — optional webcam tiles for all four players
- **Keep-alive** — HTTP ping every 4 minutes keeps the Render free-tier server awake during play

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite |
| Backend | Node.js, Express 5, Socket.IO 4 |
| AI | Anthropic Claude (claude-sonnet-4-5) |
| Deployment | Render (web service) |
| Real-time video | WebRTC (peer-to-peer, Socket.IO signalling relay) |

---

## Running locally

```bash
npm install
npm run dev        # starts Vite (port 5173) + Express server (port 3001) concurrently
```

The Vite dev server proxies `/socket.io` to `localhost:3001` automatically.

**Environment variables** (create a `.env` file or set in Render dashboard):

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Enables post-deal AI analysis |
| `SHEETS_WEBHOOK_URL` | Google Sheets webhook for score logging |
| `BRIDGE_SECRET` | Optional shared secret for the Sheets webhook |

---

## Deployment

Defined in `render.yaml`:

```yaml
buildCommand: npm install && npm run build
startCommand: node server/index.js
```

Push to `main` → Render auto-deploys. The built React app is served as static files from `dist/` by the Express server.

---

## Game structure

```
server/
  index.js          Express + Socket.IO server, Claude API endpoint
  game/
    game.js         State machine (waiting → bidding → playing → hand_complete)
    bidding.js      Auction logic, valid-bid calculation
    deck.js         Card creation, dealing, HCP calculation
    scoring.js      Rubber bridge scoring, vulnerability, dealer rotation
    bot.js          Simple rule-based bidding and card-play AI

src/
  App.jsx           Root component, socket connection, session persistence
  socket.js         Socket.IO client (WebSocket-only transport, keep-alive ping)
  components/
    Lobby.jsx       Pre-game seat selection
    GameTable.jsx   Main table layout, phase routing
    BiddingBox.jsx  Bid grid + history table
    Hand.jsx        Fanned card hand (bottom) and stacked hands (sides/top)
    TrickArea.jsx   Live trick display overlaid on the table
    DealReview.jsx  Post-hand analysis overlay
    ScoreSheet.jsx  Running score modal
    PartnershipSelector.jsx
    VideoFeeds.jsx  WebRTC webcam tiles
```

---

## Recent changes

- **2026-04-26** — Mobile layout improvements: compact top bar (2 rows, video button hidden), seat-aware bidding panel positioning for North/East/West phones, tighter player-info boxes
- **2026-04-26** — Partnership flow: lobby shows first; "Choose Partnerships" button appears only when all 4 humans are seated; bots skip partnership screen and go straight to dealing
- **2026-04-26** — Last Trick modal: removed large central suit symbol from cards for cleaner display
- **2026-04-25** — Seat-aware layout: fan only at bottom seat; North/East/West own-hand shows as compact row; seat-specific CSS stops bidding panel overlapping own hand; South info-box no longer floats mid-table for non-South players
- **2026-04-25** — Absolute compass layout: North always top, East right, South bottom, West left for all players; dummy column Ace-at-top with correct z-order; play-status moved above hand; trick-info moved to top-bar; card suit symbols enlarged
- **2026-04-25** — Design improvements: bidding panel layout fixed (South's info no longer overlaps buttons), suit symbols enlarged and correctly coloured, trick-count box repositioned, video tiles enlarged
- **2026-04-25** — Connection reliability: forced WebSocket transport, shorter ping interval, localStorage session auto-rejoin on reconnect, cold-start hint + Retry button
