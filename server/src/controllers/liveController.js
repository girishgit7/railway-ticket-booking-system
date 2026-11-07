import { railRadarGet } from "../services/railRadar.js";

export async function searchStations(req, res, next) {
  try {
    const q = String(req.query.q || "").trim();
    if (!q || q.length > 100) return res.status(400).json({ message: "Enter a station name or code." });
    const result = await railRadarGet("/lookup/search/stations", { q, limit: 10 });
    res.json({ stations: result.data, meta: result.meta, cached: result.cached });
  } catch (error) { next(error); }
}
export async function liveTrainStatus(req, res, next) {
  try {
    const number = String(req.params.number || "");
    if (!/^[0-9A-Za-z\s_/-]{1,20}$/.test(number)) return res.status(400).json({ message: "Invalid train number." });
    const date = req.query.date;
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(String(date))) return res.status(400).json({ message: "Date must use YYYY-MM-DD." });
    const result = await railRadarGet(`/trains/${encodeURIComponent(number)}/live`, { date, lang: "en" });
    res.json({ train: result.data, meta: result.meta, cached: result.cached, provider: "RailRadar" });
  } catch (error) { next(error); }
}
export async function liveTrainSchedule(req, res, next) {
  try {
    const number = String(req.params.number || "");
    if (!/^[0-9A-Za-z\s_/-]{1,20}$/.test(number)) return res.status(400).json({ message: "Invalid train number." });
    const result = await railRadarGet(`/trains/${encodeURIComponent(number)}`, { haltsOnly: true });
    res.json({ ...result.data, meta: result.meta, cached: result.cached, provider: "RailRadar" });
  } catch (error) { next(error); }
}
export async function trainsBetweenStations(req, res, next) {
  try {
    const from = String(req.query.from || "").trim().toUpperCase();
    const to = String(req.query.to || "").trim().toUpperCase();
    const date = String(req.query.date || "");
    if (!/^[A-Z0-9]{2,10}$/.test(from) || !/^[A-Z0-9]{2,10}$/.test(to) || from === to) return res.status(400).json({ message: "Use valid, different railway station codes (e.g. SBC and MAS)." });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ message: "Date must use YYYY-MM-DD." });
    const result = await railRadarGet(`/trains/between/${encodeURIComponent(from)}/${encodeURIComponent(to)}`, { date, live: false });
    res.json({ ...result.data, meta: result.meta, cached: result.cached, provider: "RailRadar" });
  } catch (error) { next(error); }
}

export async function liveSeatAvailability(req, res, next) {
  try {
    const number = String(req.params.number || "");
    const { source, destination, journeyDate, classCode = "3A", quotaCode = "GN" } = req.query;
    const classes = ["1A", "2A", "3A", "3E", "CC", "EC", "EA", "FC", "SL", "2S", "VS", "CH", "SH", "VC", "EV"];
    const quotas = ["GN", "TQ", "PT", "LD", "DF", "FT", "SS", "YU", "DP", "HP", "PH"];
    if (!/^[0-9A-Za-z\s_/-]{1,20}$/.test(number)) return res.status(400).json({ message: "Invalid train number." });
    if (typeof source !== "string" || !/^[A-Z0-9]{2,10}$/i.test(source) || typeof destination !== "string" || !/^[A-Z0-9]{2,10}$/i.test(destination) || source.toUpperCase() === destination.toUpperCase()) return res.status(400).json({ message: "Valid, different source and destination station codes are required." });
    if (typeof journeyDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(journeyDate) || !classes.includes(String(classCode).toUpperCase()) || !quotas.includes(String(quotaCode).toUpperCase())) return res.status(400).json({ message: "Provide a valid journey date, class code and quota code." });
    const result = await railRadarGet(`/trains/${encodeURIComponent(number)}/seats`, { source: source.toUpperCase(), destination: destination.toUpperCase(), journeyDate, classCode: String(classCode).toUpperCase(), quotaCode: String(quotaCode).toUpperCase() });
    res.json({ availability: result.data, meta: result.meta, cached: result.cached, provider: "RailRadar", authoritative: false });
  } catch (error) { next(error); }
}
