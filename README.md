# PhonePe Pulse · India Transaction Map

> Interactive choropleth map of India visualising real PhonePe UPI transaction data — fetched live from the official PhonePe Pulse GitHub repository.

🔗 **Live Demo:** https://phonepe-local.vercel.app  
📦 **Data Source:** [PhonePe/pulse](https://github.com/PhonePe/pulse)

---

![India Transaction Map](https://raw.githubusercontent.com/samithr1981/phonepe-pulse-map/main/public/india-states.json)

## What it does

- Fetches **live JSON** from the official `PhonePe/pulse` GitHub repository on every year/quarter selection
- Renders a full **India state-level choropleth map** — all 36 states and union territories
- **Hover** any state → transaction count, total value, avg ticket size, % of national share
- **Click any state** → district-level drill-down with ranked breakdown
- Switch metric: **transaction count / total amount / average ticket size**
- Year selector: **2018 → 2024** covering India's entire UPI growth story
- Quarter selector: **Q1–Q4** for granular time analysis
- Zoom, pan, and reset map controls

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Map rendering | react-simple-maps |
| Color scale | d3-scale (quantile) |
| Map GeoJSON | [udit-001/india-maps-data](https://github.com/udit-001/india-maps-data) |
| Data | [PhonePe/pulse](https://github.com/PhonePe/pulse) (CDLA-Permissive-2.0) |
| API proxy | Vercel serverless functions |
| Deployment | Vercel |

## Data Structure

The app reads from PhonePe Pulse's map hover data:

```
data/map/transaction/hover/country/india/{year}/{quarter}.json
data/map/transaction/hover/country/india/state/{state}/{year}/{quarter}.json
```

Each file contains:
```json
{
  "data": {
    "hoverDataList": [
      {
        "name": "maharashtra",
        "metric": [{ "type": "TOTAL", "count": 3634231839, "amount": 4.15e12 }]
      }
    ]
  }
}
```

## Key Insights from the Data

| Quarter | National Transactions | Total Value |
|---------|----------------------|-------------|
| 2018 Q1 | ~0.3B | ~₹0.5T |
| 2021 Q1 | ~3.5B | ~₹5T |
| 2024 Q1 | 21.24B | ₹29.46T |
| 2024 Q4 | 29.7B | ₹37.2T |

**India's UPI transaction volume grew ~100x from 2018 to 2024.**

Top states consistently: **Maharashtra, Karnataka, Telangana, Uttar Pradesh, Andhra Pradesh**

## Run Locally

```bash
git clone https://github.com/samithr1981/phonepe-pulse-map.git
cd phonepe-pulse-map
npm install
npm run dev
```

Open http://localhost:3000

## Get Latest Data

The app fetches live from GitHub on every request. To update your local copy of the PhonePe Pulse dataset:

```bash
cd pulse-master
git pull origin master
```

PhonePe typically publishes each quarter ~6–8 weeks after quarter end.

## Deploy Your Own

```bash
npm install -g vercel
vercel
```

No environment variables needed. Vercel auto-detects Vite and deploys in ~30 seconds.

## License

- App code: MIT
- PhonePe Pulse data: [CDLA-Permissive-2.0](https://github.com/PhonePe/pulse/blob/master/LICENSE)
- GeoJSON map data: [udit-001/india-maps-data](https://github.com/udit-001/india-maps-data)

---

Built with ❤️ using React, Vite, and the PhonePe Pulse open dataset.
