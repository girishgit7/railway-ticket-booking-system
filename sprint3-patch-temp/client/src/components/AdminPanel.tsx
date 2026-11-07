import { useEffect, useState } from "react";
import axios from "axios";
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Grid, MenuItem, Paper, Stack, Tab, Tabs, TextField, Typography } from "@mui/material";
import api from "../services/api";

type Train = { _id: string; trainNumber: string; name: string; source: string; destination: string; active: boolean };
type UserRow = { _id: string; name: string; email: string; role: "passenger" | "admin" };
type BookingRow = { _id: string; pnr: string; fare: number; status: string; paymentStatus: string; user?: { name: string; email: string } };
const classes = ["GENERAL", "SLEEPER", "AC3", "AC2", "FIRST_AC"];
const blankClassValues = () => Object.fromEntries(classes.map((c) => [c, 0]));

export default function AdminPanel() {
  const [tab, setTab] = useState(0);
  const [overview, setOverview] = useState<Record<string, number> | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [trains, setTrains] = useState<Train[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [trainForm, setTrainForm] = useState({ trainNumber: "", name: "", source: "", destination: "", stops: "" });
  const [scheduleForm, setScheduleForm] = useState({ trainId: "", journeyDate: "", departureTime: "08:00", arrivalTime: "16:00" });
  const [inventory, setInventory] = useState<Record<string, number>>(blankClassValues());
  const [fares, setFares] = useState<Record<string, number>>(blankClassValues());

  const load = async () => {
    setBusy(true); setError("");
    try {
      const [o, u, t, b, a] = await Promise.all([
        api.get("/admin/overview"), api.get("/admin/users"), api.get("/admin/trains"), api.get("/admin/bookings"), api.get("/admin/audit"),
      ]);
      setOverview(o.data); setUsers(u.data.users ?? []); setTrains(t.data.trains ?? []); setBookings(b.data.bookings ?? []); setLogs(a.data.logs ?? []);
    } catch (e) { setError(axios.isAxiosError(e) ? e.response?.data?.message || "Unable to load admin data." : "Unable to load admin data."); }
    finally { setBusy(false); }
  };
  useEffect(() => { void load(); }, []);

  const createTrain = async () => {
    setError(""); setNotice("");
    try {
      await api.post("/admin/trains", { ...trainForm, stops: trainForm.stops.split(",").map((s) => s.trim()).filter(Boolean) });
      setTrainForm({ trainNumber: "", name: "", source: "", destination: "", stops: "" }); setNotice("Train created."); await load();
    } catch (e) { setError(axios.isAxiosError(e) ? e.response?.data?.message || "Train creation failed." : "Train creation failed."); }
  };
  const createSchedule = async () => {
    setError(""); setNotice("");
    try {
      await api.post("/admin/schedules", { ...scheduleForm, inventory, fares }); setNotice("Schedule created."); await load();
    } catch (e) { setError(axios.isAxiosError(e) ? e.response?.data?.message || "Schedule creation failed." : "Schedule creation failed."); }
  };
  const setRole = async (id: string, role: string) => {
    try { await api.patch(`/admin/users/${id}/role`, { role }); setNotice("User role updated."); await load(); }
    catch (e) { setError(axios.isAxiosError(e) ? e.response?.data?.message || "Role update failed." : "Role update failed."); }
  };
  const setTrainActive = async (train: Train) => {
    try { await api.patch(`/admin/trains/${train._id}`, { active: !train.active }); setNotice("Train status updated."); await load(); }
    catch (e) { setError(axios.isAxiosError(e) ? e.response?.data?.message || "Train update failed." : "Train update failed."); }
  };

  return <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}><Typography variant="h5" fontWeight={800}>Admin console</Typography><Button onClick={() => void load()} disabled={busy}>Refresh</Button></Stack>
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}{notice && <Alert severity="success" sx={{ mb: 2 }}>{notice}</Alert>}
    {busy && <CircularProgress size={24} />}
    <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" sx={{ mb: 2 }}>
      <Tab label="Overview" /><Tab label="Users" /><Tab label="Trains" /><Tab label="Schedules" /><Tab label="Bookings" /><Tab label="Audit log" />
    </Tabs>
    {tab === 0 && <Grid container spacing={2}>{Object.entries(overview ?? {}).map(([key, value]) => <Grid size={{ xs: 6, md: 3 }} key={key}><Card variant="outlined"><CardContent><Typography color="text.secondary" variant="body2">{key.replace(/[A-Z]/g, (m) => ` ${m}`).toUpperCase()}</Typography><Typography variant="h4" fontWeight={800}>{value}</Typography></CardContent></Card></Grid>)}</Grid>}
    {tab === 1 && <Stack spacing={1}>{users.map((u) => <Paper key={u._id} variant="outlined" sx={{ p: 1.5 }}><Stack direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "center" }} justifyContent="space-between" gap={1}><Box><Typography fontWeight={700}>{u.name}</Typography><Typography variant="body2" color="text.secondary">{u.email}</Typography></Box><Stack direction="row" alignItems="center" gap={1}><Chip label={u.role} color={u.role === "admin" ? "primary" : "default"} /><TextField select size="small" label="Role" value={u.role} onChange={(e) => void setRole(u._id, e.target.value)} sx={{ minWidth: 130 }}><MenuItem value="passenger">Passenger</MenuItem><MenuItem value="admin">Admin</MenuItem></TextField></Stack></Stack></Paper>)}</Stack>}
    {tab === 2 && <Stack spacing={2}><Grid container spacing={1}>{["trainNumber", "name", "source", "destination", "stops"].map((k) => <Grid size={{ xs: 12, sm: k === "stops" ? 12 : 6 }} key={k}><TextField fullWidth label={k === "stops" ? "Intermediate stops (comma separated)" : k} value={(trainForm as any)[k]} onChange={(e) => setTrainForm((f) => ({ ...f, [k]: e.target.value }))} /></Grid>)}</Grid><Button variant="contained" onClick={() => void createTrain()}>Add train</Button><DividerLike />{trains.map((t) => <Paper key={t._id} variant="outlined" sx={{ p: 1.5 }}><Stack direction="row" justifyContent="space-between" alignItems="center"><Box><Typography fontWeight={700}>{t.trainNumber} · {t.name}</Typography><Typography variant="body2">{t.source} → {t.destination}</Typography></Box><Button color={t.active ? "warning" : "success"} onClick={() => void setTrainActive(t)}>{t.active ? "Deactivate" : "Activate"}</Button></Stack></Paper>)}</Stack>}
    {tab === 3 && <Stack spacing={2}><TextField select label="Train" value={scheduleForm.trainId} onChange={(e) => setScheduleForm((f) => ({ ...f, trainId: e.target.value }))}>{trains.filter((t) => t.active).map((t) => <MenuItem key={t._id} value={t._id}>{t.trainNumber} · {t.name}</MenuItem>)}</TextField><Grid container spacing={1}>{(["journeyDate", "departureTime", "arrivalTime"] as const).map((k) => <Grid size={{ xs: 12, sm: 4 }} key={k}><TextField fullWidth type={k === "journeyDate" ? "date" : "time"} label={k} InputLabelProps={{ shrink: true }} value={scheduleForm[k]} onChange={(e) => setScheduleForm((f) => ({ ...f, [k]: e.target.value }))} /></Grid>)}</Grid><Typography fontWeight={700}>Seat inventory and fare by class</Typography>{classes.map((c) => <Grid container spacing={1} key={c} alignItems="center"><Grid size={{ xs: 4 }}><Typography>{c}</Typography></Grid><Grid size={{ xs: 4 }}><TextField fullWidth size="small" type="number" label="Seats" inputProps={{ min: 0 }} value={inventory[c]} onChange={(e) => setInventory((v) => ({ ...v, [c]: Number(e.target.value) }))} /></Grid><Grid size={{ xs: 4 }}><TextField fullWidth size="small" type="number" label="Fare ₹" inputProps={{ min: 0 }} value={fares[c]} onChange={(e) => setFares((v) => ({ ...v, [c]: Number(e.target.value) }))} /></Grid></Grid>)}<Button variant="contained" onClick={() => void createSchedule()}>Create schedule</Button></Stack>}
    {tab === 4 && <Stack spacing={1}>{bookings.map((b) => <Paper key={b._id} variant="outlined" sx={{ p: 1.5 }}><Stack direction="row" justifyContent="space-between" gap={1}><Box><Typography fontWeight={700}>PNR {b.pnr}</Typography><Typography variant="body2">{b.user?.name ?? "Unknown passenger"} · {b.user?.email ?? ""}</Typography></Box><Box textAlign="right"><Typography>₹{b.fare}</Typography><Chip size="small" label={`${b.status} / ${b.paymentStatus}`} /></Box></Stack></Paper>)}</Stack>}
    {tab === 5 && <Stack spacing={1}>{logs.map((l) => <Paper key={l._id} variant="outlined" sx={{ p: 1.5 }}><Typography fontWeight={700}>{l.action}</Typography><Typography variant="body2">{l.actor?.email ?? "System"} · {l.targetType} · {new Date(l.timestamp).toLocaleString()}</Typography></Paper>)}</Stack>}
  </Paper>;
}

function DividerLike() { return <Box sx={{ borderTop: "1px solid", borderColor: "divider", my: 1 }} />; }
