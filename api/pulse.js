export default async function handler(req, res) {
  const { path } = req.query;
  if (!path) return res.status(400).json({ error: "No path" });
  const url = `https://raw.githubusercontent.com/PhonePe/pulse/master/data/${path}`;
  try {
    const r = await fetch(url);
    if (!r.ok) return res.status(r.status).json({ error: "Not found" });
    const data = await r.json();
    res.setHeader("Cache-Control", "s-maxage=3600");
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
