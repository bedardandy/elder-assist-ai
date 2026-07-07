# Hardware & Shopping Guide

**What you'll have when done:** everything ordered (or dug out of a closet) for a
complete install, chosen from the most common working configurations — with the
exact search terms to find each item.

**Time required:** 30 minutes of shopping; most families spend $150–$400 total.

The stack runs on hardware you probably already partly own. Buy in stages —
the hub first, everything else after week 1 of the rollout
(`onboarding.md` §3 explains why going slow wins).

## 1. Pick your hub path (one box, always on)

### Path A — Used business mini-PC + Linux (recommended: cheapest, quietest, best supported)
The sweet spot is a 1-liter "tiny" business desktop off-lease, ~$100–160.

- Search: **"Lenovo ThinkCentre M720q i5 16GB"**, **"Dell OptiPlex 3070 micro i5 16GB"**,
  or **"HP EliteDesk 800 G4 mini i5 16GB"** (eBay/Amazon Renewed/Back Market).
  Want new instead: **"Beelink Mini S12 Pro 16GB"** (~$180).
- Checklist: 16 GB RAM, 256 GB+ SSD, any 8th-gen-or-newer Intel/Ryzen.
- OS: search **"Ubuntu Server 24.04 LTS download"** (or Desktop if you want a GUI),
  install, then **"install Docker Engine Ubuntu"** (docs.docker.com — use the apt
  repo method, not snap), then:
  `git clone <this repo> && cd elder-assist-ai && ./setup.sh --all`
- Verified: the rehearsed install (`docs/REHEARSAL.md`) used exactly this class of
  box — stack up in ~2½ minutes plus model downloads.

### Path B — A computer the family already owns
Any old desktop/laptop with 8–16 GB RAM works (laptops even bring a free UPS —
their battery). Same steps as Path A. 8 GB = use a 3B model
(`OLLAMA_MODEL=llama3.2:3b` in `.env`) or point Hermes at a hosted API.

### Path C — Mac mini (M-series)
Great if one's already around; Ollama is fast on Apple Silicon.
Install **"Docker Desktop for Mac"**, then `./setup.sh --all`. One caveat: Docker
host networking doesn't exist on macOS — `docs/INSTALL.md` (macOS section) shows
the two-line compose change for Home Assistant's ports.

### Path D — Windows PC
Install **"Docker Desktop for Windows"** (WSL2 backend), then `.\setup.ps1 -All`
in PowerShell. Works, but Linux is the first-class citizen here.

### Path E — Home Assistant Green + a small compute box (least technical operator)
If the operator wants an appliance, search **"Home Assistant Green"** (~$99) for
the HA half, run the AI half (Ollama/Hermes/kiosk/HomeBox) on any Path-A/B box,
and use HA *add-ons* for whisper/piper instead of our compose voice profile —
`docs/INSTALL.md` documents this alternative path.

## 2. The rest of the kit (per room / per feature)

| Need | Buy (search term) | ~Price | Notes |
|---|---|---|---|
| Kitchen kiosk tablet | **"Samsung Galaxy Tab A9+ 11"** or **"Amazon Fire HD 10"** | $120–170 | Fire tablets: also search **"install Fully Kiosk Browser Fire tablet"**; the PWA + Fully Kiosk recipe is in `pwa/README.md` §3 |
| Tablet mount | **"tablet wall mount adhesive kitchen"** or a chunky countertop stand | $15–30 | Eye level, near where they actually stand |
| Voice satellite (per room) | **"Home Assistant Voice Preview Edition"** | $59 | The purpose-built option; ameriDroid / Everything Smart Home / Apollo Automation carry it |
| TV casting (if no smart TV) | **"Chromecast with Google TV 4K"** | $50 | Existing Android TV / Google TV works as-is |
| Cable-box / dumb-TV control | **"Broadlink RM4 Pro"** (IR/RF blaster) | $50 | For "channel 5" macros on cable boxes — `tv-and-casting.md` |
| Bluetooth proxy (per key room) | **"M5Stack Atom Lite"** or **"ESP32 DevKitC"** + search **"ESPHome Bluetooth proxy"** | $8–15 | Flash in the browser from the ESPHome site — `ha/README.md` §7 |
| Findable tags (keys, wallet) | **"Chipolo ONE"** / **"Pebblebee Clip"** | $25–30/ea | HA-ringable (that's why not AirTags — `docs/DECISIONS.md` D12) |
| Motion/door sensors + radio | **"Sonoff Zigbee Dongle-E"** + **"Aqara motion sensor P1"** + **"Aqara door window sensor"** | $20 + $20/ea | For wellness checks & door-left-open — `safety-wellness.md` |
| Real-phone calls in-house | **"Grandstream HT801 ATA"** | $35 | Plugs an ordinary handset into HA's VoIP — `calling-and-video.md` |
| Power protection | **"APC Back-UPS 600VA"** | $60 | Rides out blips; pair with the hub-down watchdog (`safety-wellness.md` §9) |
| Faster AI (optional) | **"used RTX 3060 12GB"** (Path A/B towers only) | $180–220 | Sub-second voice replies + fast vision reading; enable `docker-compose.gpu.yml` |
| Fall-risk backstop | **"medical alert pendant no monthly fee"** or a monitored service | varies | **Buy this regardless** — this project is not a medical alert system (`safety-wellness.md` §6) |

## 3. Suggested buying order

1. **Week 0:** the hub (Path A/B) + the tablet. That alone delivers calling,
   reminders on the tablet, and the memory book.
2. **Week 2:** one Voice PE for the kitchen; Chromecast if needed.
3. **Week 3–4:** trackers + one Bluetooth proxy; sensors for wellness checks.
4. **Only if wanted:** more satellites, IR blaster, ATA phone, GPU.

Don't buy everything up front: half the point of the staged rollout is learning
which features this particular person actually embraces before spending on them.
