import { useState } from "react";
import axios from "axios";
import {
  Alert, AppBar, Box, Button, Card, CardContent, Chip, CircularProgress,
  Container, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Grid,
  MenuItem, Paper, Stack, Tab, Tabs, TextField, Toolbar, Typography,
} from "@mui/material";
import TrainIcon from "@mui/icons-material/Train";
import LoginIcon from "@mui/icons-material/Login";
import SearchIcon from "@mui/icons-material/Search";
import api from "./services/api";
import AdminPanel from "./components/AdminPanel";

type User = { id: string; name: string; email: string; role: "passenger" | "admin" };
type Journey = { scheduleId: string; journeyDate: string; departureTime: string; arrivalTime: string; train: { trainNumber: string; name: string; source: string; destination: string }; availability: Record<string, number>; fares: Record<string, number> };
type Passenger = { name: string; age: number; gender: string; berthPreference: string };
type LiveJourney = { train?: { number?: string; name?: string }; from?: { sequence?: number; name?: string; departure?: string }; to?: { name?: string; arrival?: string }; duration?: number };
type LiveStatus = { train?: { status?: string; delayMinutes?: number; lastUpdatedAt?: string }; status?: string; delayMinutes?: number; lastUpdatedAt?: string };
type LiveSchedule = { route?: unknown[] };
type LiveSeats = { calendar?: { date: string; status: string; availableSeats?: number; waitlistNumber?: number }[]; trainName?: string; classCode?: string; quotaCode?: string };
type Booking = { _id: string; pnr: string; travelClass: string; passengers: Passenger[]; fare: number; status: string; paymentStatus: string; refundAmount?: number; schedule?: { journeyDate: string; departureTime: string; arrivalTime: string; train?: { name: string; trainNumber: string; source: string; destination: string } } };
const classes = ["GENERAL", "SLEEPER", "AC3", "AC2", "FIRST_AC"];
const emptyPassenger = (): Passenger => ({ name: "", age: 18, gender: "unspecified", berthPreference: "no-preference" });
const tomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const apiError = (e: unknown, fallback: string) => axios.isAxiosError(e) ? e.response?.data?.message || fallback : fallback;

export default function App() {
  const [user, setUser] = useState<User | null>(() => { try { const s = localStorage.getItem("railway_user"); return s ? JSON.parse(s) as User : null; } catch { return null; } });
  const [tab, setTab] = useState(0);
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState(0);
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState(tomorrow());
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [pnr, setPnr] = useState("");
  const [pnrResult, setPnrResult] = useState<Booking | null>(null);
  const [ticketBooking, setTicketBooking] = useState<Booking | null>(null);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [selected, setSelected] = useState<Journey | null>(null);
  const [travelClass, setTravelClass] = useState("SLEEPER");
  const [passengers, setPassengers] = useState<Passenger[]>([emptyPassenger()]);
  const [paymentMode, setPaymentMode] = useState("UPI");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [liveFrom, setLiveFrom] = useState("SBC");
  const [liveTo, setLiveTo] = useState("MAS");
  const [liveJourneys, setLiveJourneys] = useState<LiveJourney[]>([]);
  const [liveTrainNumber, setLiveTrainNumber] = useState("");
  const [liveStatus, setLiveStatus] = useState<LiveStatus | null>(null);
  const [liveSchedule, setLiveSchedule] = useState<LiveSchedule | null>(null);
  const [liveSeats, setLiveSeats] = useState<LiveSeats | null>(null);
  const [liveSeatClass, setLiveSeatClass] = useState("3A");
  const [liveQuota, setLiveQuota] = useState("GN");

  const loadBookings = async () => {
    if (!user) return;
    setBusy(true); setError("");
    try { const r = await api.get("/engine/bookings/my"); setBookings(r.data.bookings ?? []); }
    catch (e) { setError(apiError(e, "Unable to load your bookings.")); }
    finally { setBusy(false); }
  };

  const searchTrains = async () => {
    setError(""); setNotice(""); setJourneys([]);
    if (!source.trim() || !destination.trim() || !date) return setError("Enter source, destination and journey date.");
    if (source.trim().toLowerCase() === destination.trim().toLowerCase()) return setError("Source and destination must differ.");
    setBusy(true);
    try { const r = await api.get("/engine/search", { params: { source: source.trim(), destination: destination.trim(), date } }); setJourneys(r.data.journeys ?? []); if (!r.data.journeys?.length) setNotice("No train found in the C++ engine catalogue for this route. Live timetable search is available below."); }
    catch (e) { setError(apiError(e, "Unable to search trains.")); }
    finally { setBusy(false); }
  };

  const authenticate = async () => {
    setError("");
    if (!authEmail.trim() || !authPassword) return setError("Enter email and password.");
    if (authTab === 1 && authName.trim().length < 2) return setError("Enter your full name (at least 2 characters).");
    setBusy(true);
    try {
      const r = await api.post(authTab === 0 ? "/auth/login" : "/auth/register", authTab === 0 ? { email: authEmail.trim(), password: authPassword } : { name: authName.trim(), email: authEmail.trim(), password: authPassword });
      localStorage.setItem("railway_token", r.data.token); localStorage.setItem("railway_user", JSON.stringify(r.data.user)); setUser(r.data.user); setAuthOpen(false); setNotice(`Welcome, ${r.data.user.name}!`); setAuthPassword("");
    } catch (e) { setError(apiError(e, "Authentication failed.")); }
    finally { setBusy(false); }
  };
  const logout = () => { localStorage.removeItem("railway_token"); localStorage.removeItem("railway_user"); setUser(null); setBookings([]); setPnrResult(null); setTab(0); setNotice("You have been logged out."); };

  const bookSelected = async () => {
    if (!selected) return;
    if (passengers.some((p) => p.name.trim().length < 2 || !Number.isInteger(Number(p.age)) || Number(p.age) < 1 || Number(p.age) > 120)) return setError("Enter a valid name and age for every passenger.");
    setBusy(true); setError("");
    try {
      const r = await api.post("/engine/bookings", { trainNumber: selected.train.trainNumber, journeyDate: selected.journeyDate, travelClass, passengers: passengers.map((p) => ({ ...p, name: p.name.trim(), age: Number(p.age) })), paymentMode });
      setSelected(null); setNotice(`Booking confirmed! Your PNR is ${r.data.booking.pnr}. Payment is simulated for this project.`); setTab(1); await loadBookings();
    } catch (e) { setError(apiError(e, "Booking failed. Please retry.")); }
    finally { setBusy(false); }
  };
  const lookupPNR = async () => {
    setPnrResult(null); setError(""); setNotice("");
    if (!/^\d{10}$/.test(pnr.trim())) return setError("Enter the 10-digit PNR generated by the C++ engine.");
    setBusy(true);
    try { const r = await api.get(`/engine/bookings/pnr/${pnr.trim()}`); setPnrResult(r.data.booking); }
    catch (e) { setError(apiError(e, "Unable to find this booking.")); }
    finally { setBusy(false); }
  };
  const openTicket = async (booking: Booking) => {
    setTicketLoading(true);
    setError("");
    try {
      const r = await api.get(`/engine/bookings/${encodeURIComponent(booking.pnr)}/ticket`);
      setTicketBooking(r.data.ticket);
      setTicketOpen(true);
    } catch (e) {
      setError(apiError(e, "Unable to retrieve this ticket. Please refresh your bookings and try again."));
    } finally {
      setTicketLoading(false);
    }
  };

  const cancelBooking = async (booking: Booking) => {
    if (!window.confirm(`Cancel booking ${booking.pnr}? A 90% simulated refund will be recorded.`)) return;
    setBusy(true); setError(""); setNotice("");
    try { const r = await api.post(`/engine/bookings/pnr/${booking.pnr}/cancel`); setNotice(`Booking cancelled. Simulated refund: ₹${r.data.refundAmount}.`); await loadBookings(); if (pnrResult?._id === booking._id) setPnrResult({ ...pnrResult, status: "cancelled", paymentStatus: "refunded", refundAmount: r.data.refundAmount }); }
    catch (e) { setError(apiError(e, "Cancellation failed.")); }
    finally { setBusy(false); }
  };

  const searchLiveTrains = async () => {
    setError(""); setNotice(""); setLiveJourneys([]); setLiveStatus(null); setLiveSchedule(null); setLiveSeats(null);
    if (!liveFrom.trim() || !liveTo.trim() || liveFrom.trim().toUpperCase() === liveTo.trim().toUpperCase()) return setError("Enter two different station codes, for example SBC and MAS.");
    setBusy(true);
    try { const r = await api.get("/live/trains/between", { params: { from: liveFrom.trim().toUpperCase(), to: liveTo.trim().toUpperCase(), date } }); setLiveJourneys(r.data.trains ?? []); if (!(r.data.trains ?? []).length) setNotice("No trains found for those station codes and date."); }
    catch (e) { setError(apiError(e, "Live train search failed. Check the RailRadar API key and station codes.")); }
    finally { setBusy(false); }
  };
  const fetchLiveStatus = async (number: string) => {
    setError(""); setLiveTrainNumber(number); setLiveStatus(null); setLiveSchedule(null); setLiveSeats(null); setBusy(true);
    try { const [status, schedule] = await Promise.all([api.get(`/live/trains/${encodeURIComponent(number)}/live`, { params: { date } }), api.get(`/live/trains/${encodeURIComponent(number)}/schedule`)]); setLiveStatus(status.data); setLiveSchedule(schedule.data); }
    catch (e) { setError(apiError(e, "Unable to retrieve live status. This train may not have current telemetry.")); }
    finally { setBusy(false); }
  };

  const fetchLiveSeats = async (number: string) => {
    setError(""); setLiveSeats(null); setLiveTrainNumber(number); setBusy(true);
    try { const r = await api.get(`/live/trains/${encodeURIComponent(number)}/seats`, { params: { source: liveFrom, destination: liveTo, journeyDate: date, classCode: liveSeatClass, quotaCode: liveQuota } }); setLiveSeats(r.data.availability); }
    catch (e) { setError(apiError(e, "External seat availability is unavailable for this train/date.")); }
    finally { setBusy(false); }
  };

  const renderBooking = (b: Booking) => <Card key={b._id} variant="outlined"><CardContent><Stack direction={{ xs: "column", sm: "row" }} style={{ justifyContent: "space-between" }} spacing={2}><Box><Typography variant="h6" style={{ fontWeight: 800 }}>PNR {b.pnr}</Typography><Typography>{b.schedule?.train?.name ?? "Train details"} · {b.travelClass}</Typography><Typography variant="body2" color="text.secondary">{b.schedule?.train?.source ?? ""} → {b.schedule?.train?.destination ?? ""} · {b.schedule?.journeyDate ? new Date(b.schedule.journeyDate).toLocaleDateString() : ""}</Typography><Typography variant="body2">{b.passengers?.length ?? 0} passenger(s) · ₹{b.fare}</Typography></Box><Stack style={{ alignItems: "flex-end" }} spacing={1}><Chip label={`${b.status} / ${b.paymentStatus}`} color={b.status === "confirmed" ? "success" : "default"} /><Button variant="outlined" onClick={() => void openTicket(b)} disabled={ticketLoading}>{ticketLoading ? "Loading…" : "View ticket"}</Button>{b.status === "confirmed" && <Button color="error" onClick={() => void cancelBooking(b)} disabled={busy}>Cancel booking</Button>}{b.refundAmount ? <Typography variant="body2">Refund: ₹{b.refundAmount}</Typography> : null}</Stack></Stack></CardContent></Card>;

  return <Box sx={{ minHeight: "100vh", bgcolor: "#f4f6fb" }}>
    <AppBar position="static" sx={{ bgcolor: "#102b4e" }} elevation={0}><Toolbar sx={{ maxWidth: 1200, width: "100%", mx: "auto" }}><TrainIcon sx={{ mr: 1 }} /><Typography variant="h6" style={{ fontWeight: 800 }} sx={{ flexGrow: 1 }}>RailConnect</Typography>{user ? <Stack direction="row" spacing={1} style={{ alignItems: "center" }}><Typography variant="body2">Hi, {user.name}</Typography>{user.role === "admin" && <Chip size="small" label="ADMIN" color="secondary" /> }<Button color="inherit" onClick={logout}>Logout</Button></Stack> : <Button color="inherit" startIcon={<LoginIcon />} onClick={() => { setError(""); setAuthOpen(true); }}>Login / Register</Button>}</Toolbar></AppBar>
    <Box sx={{ background: "linear-gradient(120deg, #102b4e, #1769aa)", color: "white", py: { xs: 5, md: 7 } }}><Container maxWidth="lg"><Typography variant="overline" sx={{ letterSpacing: 3 }}>YOUR JOURNEY STARTS HERE</Typography><Typography variant="h2" sx={{ fontSize: { xs: 36, md: 54 }, mt: 1, fontWeight: 900 }}>Travel smarter.<br />Travel with RailConnect.</Typography><Typography sx={{ mt: 2, opacity: 0.9, maxWidth: 600 }}>Search the C++ train catalogue, view third-party live railway data, reserve demo seats and manage bookings.</Typography></Container></Box>
    <Container maxWidth="lg" sx={{ mt: -3, position: "relative", pb: 8 }}>
      <Paper sx={{ p: { xs: 1, md: 2 }, borderRadius: 3 }}><Tabs value={tab} onChange={(_, v) => { setTab(v); setError(""); setNotice(""); if (v === 1 && user) void loadBookings(); }} variant="scrollable"><Tab label="Find trains" /><Tab label="My bookings" disabled={!user} /><Tab label="PNR lookup" disabled={!user} />{user?.role === "admin" && <Tab label="Admin console" />}</Tabs></Paper>
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}{notice && <Alert severity="success" sx={{ mt: 2 }}>{notice}</Alert>}
      {busy && <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}><CircularProgress size={26} /></Box>}
      {tab === 0 && <Stack spacing={3} sx={{ mt: 3 }}><Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}><Typography variant="h5" style={{ fontWeight: 800 }} sx={{ mb: 2 }}>Find your train</Typography><Grid container spacing={2} style={{ alignItems: "center" }}><Grid size={{ xs: 12, md: 3 }}><TextField fullWidth label="From" value={source} onChange={(e) => setSource(e.target.value)} /></Grid><Grid size={{ xs: 12, md: 3 }}><TextField fullWidth label="To" value={destination} onChange={(e) => setDestination(e.target.value)} /></Grid><Grid size={{ xs: 12, md: 3 }}><TextField fullWidth type="date" label="Journey date" value={date} onChange={(e) => setDate(e.target.value)} slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: tomorrow() } }} /></Grid><Grid size={{ xs: 12, md: 3 }}><Button fullWidth variant="contained" size="large" startIcon={<SearchIcon />} onClick={() => void searchTrains()} disabled={busy} sx={{ height: 56 }}>Search trains</Button></Grid></Grid></Paper>
        {journeys.map((j) => <Card key={j.scheduleId}><CardContent><Stack direction={{ xs: "column", md: "row" }} style={{ justifyContent: "space-between" }} spacing={2}><Box><Typography variant="h6" style={{ fontWeight: 800 }}>{j.train.name}</Typography><Typography color="text.secondary">Train {j.train.trainNumber}</Typography><Typography sx={{ mt: 1 }}>{j.train.source} {j.departureTime} → {j.train.destination} {j.arrivalTime}</Typography><Typography variant="caption" color="text.secondary">C++ engine catalogue · demo timetable and inventory</Typography></Box><Stack spacing={1} style={{ alignItems: "flex-end" }}><Stack direction="row" style={{ flexWrap: "wrap" }} spacing={1}>{classes.map((c) => <Chip key={c} variant="outlined" label={`${c}: ₹${j.fares?.[c] ?? "—"} · ${j.availability?.[c] ?? 0} seats`} />)}</Stack><Stack direction="row" spacing={1}><Button size="small" variant="outlined" onClick={() => void fetchLiveStatus(j.train.trainNumber)}>Live status</Button><Button variant="contained" disabled={!user || !classes.some((c) => Number(j.availability?.[c]) > 0)} onClick={() => { setSelected(j); setTravelClass(classes.find((c) => Number(j.availability?.[c]) > 0) ?? "SLEEPER"); setPassengers([emptyPassenger()]); }}>Book seats</Button></Stack>{!user && <Typography variant="caption" color="text.secondary">Login to book</Typography>}</Stack></Stack></CardContent></Card>)}
        <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}><Typography variant="h5" style={{ fontWeight: 800 }}>Live Indian Railways data</Typography><Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Search the external live timetable by station code (e.g. SBC = KSR Bengaluru, MAS = Chennai Central). Live information is read-only and is not used to confirm a ticket.</Typography><Grid container spacing={1} style={{ alignItems: "center" }}><Grid size={{ xs: 12, sm: 3 }}><TextField fullWidth label="From station code" value={liveFrom} onChange={(e) => setLiveFrom(e.target.value.toUpperCase())} /></Grid><Grid size={{ xs: 12, sm: 3 }}><TextField fullWidth label="To station code" value={liveTo} onChange={(e) => setLiveTo(e.target.value.toUpperCase())} /></Grid><Grid size={{ xs: 6, sm: 2 }}><TextField fullWidth select label="Class" value={liveSeatClass} onChange={(e) => setLiveSeatClass(e.target.value)}>{["1A", "2A", "3A", "3E", "SL", "CC", "2S"].map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}</TextField></Grid><Grid size={{ xs: 6, sm: 2 }}><TextField fullWidth select label="Quota" value={liveQuota} onChange={(e) => setLiveQuota(e.target.value)}>{[{v:"GN",t:"General"},{v:"TQ",t:"Tatkal"},{v:"PT",t:"Premium Tatkal"},{v:"LD",t:"Ladies"}].map((q) => <MenuItem key={q.v} value={q.v}>{q.t}</MenuItem>)}</TextField></Grid><Grid size={{ xs: 12, sm: 2 }}><Button fullWidth variant="contained" onClick={() => void searchLiveTrains()} disabled={busy} sx={{ height: 56 }}>Search live timetable</Button></Grid></Grid>{liveJourneys.map((item) => <Paper key={`${item.train?.number}-${item.from?.sequence}`} variant="outlined" sx={{ p: 1.5, mt: 1 }}><Stack direction={{ xs: "column", sm: "row" }} style={{ justifyContent: "space-between" }} spacing={1}><Box><Typography style={{ fontWeight: 700 }}>{item.train?.number} · {item.train?.name}</Typography><Typography variant="body2">{item.from?.name} {item.from?.departure ?? ""} → {item.to?.name} {item.to?.arrival ?? ""}</Typography><Typography variant="caption" color="text.secondary">{item.duration ? `${Math.floor(item.duration / 60)}h ${item.duration % 60}m` : "Duration unavailable"} · Live provider timetable</Typography></Box><Stack direction="row" spacing={1}><Button size="small" variant="outlined" onClick={() => { if (item.train?.number) void fetchLiveStatus(item.train.number); }}>Running status</Button><Button size="small" variant="outlined" onClick={() => { if (item.train?.number) void fetchLiveSeats(item.train.number); }}>Seat availability</Button></Stack></Stack></Paper>)}{liveSeats && <Paper variant="outlined" sx={{ p: 2, mt: 2 }}><Typography style={{ fontWeight: 800 }}>External availability · {liveSeats.trainName ?? liveTrainNumber} · {liveSeats.classCode ?? liveSeatClass} · {liveSeats.quotaCode ?? liveQuota}</Typography><Typography variant="caption" color="text.secondary">Third-party forecast only; not an IRCTC reservation or guaranteed inventory.</Typography><Stack spacing={1} sx={{ mt: 1 }}>{(liveSeats.calendar ?? []).map((day) => <Stack key={day.date} direction="row" style={{ justifyContent: "space-between" }}><Typography>{day.date}</Typography><Chip size="small" label={day.status} color={day.status.startsWith("AVAILABLE") ? "success" : "warning"} /></Stack>)}</Stack></Paper>}{liveStatus && <Alert severity="info" sx={{ mt: 2 }}><Typography style={{ fontWeight: 800 }}>Train {liveTrainNumber} · {liveStatus.train?.status ?? liveStatus.status ?? "Status unavailable"}</Typography><Typography>Delay: {liveStatus.train?.delayMinutes ?? liveStatus.delayMinutes ?? "Not reported"} minutes · Last updated: {liveStatus.train?.lastUpdatedAt ?? liveStatus.lastUpdatedAt ?? "Not provided"}</Typography><Typography variant="caption">Source: RailRadar · {liveSchedule?.route?.length ?? 0} timetable stops · Verify critical travel details with official railway channels.</Typography></Alert>}</Paper>
      </Stack>}
      {tab === 1 && <Stack spacing={2} sx={{ mt: 3 }}><Stack direction="row" style={{ justifyContent: "space-between", alignItems: "center" }}><Typography variant="h5" style={{ fontWeight: 800 }}>My bookings</Typography><Button onClick={() => void loadBookings()}>Refresh</Button></Stack>{bookings.length ? bookings.map(renderBooking) : !busy && <Alert severity="info">You haven't made any bookings yet.</Alert>}</Stack>}
      {tab === 2 && <Paper sx={{ p: 3, mt: 3 }}><Typography variant="h5" style={{ fontWeight: 800 }} sx={{ mb: 2 }}>Retrieve ticket by PNR</Typography><Stack direction={{ xs: "column", sm: "row" }} spacing={1}><TextField label="10-digit PNR" value={pnr} onChange={(e) => setPnr(e.target.value.replace(/\D/g, "").slice(0, 10))} /><Button variant="contained" onClick={() => void lookupPNR()} disabled={busy}>Search PNR</Button></Stack>{pnrResult && <Box sx={{ mt: 3 }}>{renderBooking(pnrResult)}</Box>}</Paper>}
      {tab === 3 && user?.role === "admin" && <Box sx={{ mt: 3 }}><AdminPanel /></Box>}
    </Container>

    <Dialog open={authOpen} onClose={() => setAuthOpen(false)} fullWidth maxWidth="xs"><DialogTitle style={{ fontWeight: 800 }}>Welcome to RailConnect</DialogTitle><DialogContent><Tabs value={authTab} onChange={(_, v) => { setAuthTab(v); setError(""); }} variant="fullWidth"><Tab label="Login" /><Tab label="Register" /></Tabs><Stack spacing={2} sx={{ mt: 3 }}>{authTab === 1 && <TextField label="Full name" value={authName} onChange={(e) => setAuthName(e.target.value)} /> }<TextField label="Email" type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} /><TextField label="Password" type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} helperText={authTab === 1 ? "Use 10–72 characters." : ""} />{error && <Alert severity="error">{error}</Alert>}</Stack></DialogContent><DialogActions sx={{ p: 2 }}><Button onClick={() => setAuthOpen(false)}>Close</Button><Button variant="contained" onClick={() => void authenticate()} disabled={busy}>{authTab === 0 ? "Login" : "Create account"}</Button></DialogActions></Dialog>

    <Dialog open={ticketOpen} onClose={() => setTicketOpen(false)} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 900, pb: 1 }}>RailConnect · Journey ticket</DialogTitle>
      <DialogContent>
        {ticketBooking && <Stack spacing={2} sx={{ pt: 1 }}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderStyle: "dashed" }}>
            <Stack direction="row" style={{ justifyContent: "space-between", alignItems: "center" }} spacing={2}>
              <Box>
                <Typography variant="overline" color="text.secondary">BOOKING REFERENCE / PNR</Typography>
                <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: 1 }}>{ticketBooking.pnr}</Typography>
              </Box>
              <Chip label={ticketBooking.status?.toUpperCase() ?? "UNKNOWN"} color={ticketBooking.status === "confirmed" ? "success" : "default"} />
            </Stack>
          </Paper>
          <Box>
            <Typography variant="overline" color="text.secondary">TRAIN</Typography>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>{ticketBooking.schedule?.train?.name ?? "Train details unavailable"}</Typography>
            <Typography color="text.secondary">Train no. {ticketBooking.schedule?.train?.trainNumber ?? "—"}</Typography>
          </Box>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6 }}><Typography variant="caption" color="text.secondary">FROM</Typography><Typography sx={{ fontWeight: 700 }}>{ticketBooking.schedule?.train?.source ?? "—"}</Typography></Grid>
            <Grid size={{ xs: 6 }}><Typography variant="caption" color="text.secondary">TO</Typography><Typography sx={{ fontWeight: 700 }}>{ticketBooking.schedule?.train?.destination ?? "—"}</Typography></Grid>
            <Grid size={{ xs: 6 }}><Typography variant="caption" color="text.secondary">JOURNEY DATE</Typography><Typography sx={{ fontWeight: 700 }}>{ticketBooking.schedule?.journeyDate ? new Date(ticketBooking.schedule.journeyDate).toLocaleDateString() : "—"}</Typography></Grid>
            <Grid size={{ xs: 6 }}><Typography variant="caption" color="text.secondary">CLASS</Typography><Typography sx={{ fontWeight: 700 }}>{ticketBooking.travelClass}</Typography></Grid>
            <Grid size={{ xs: 6 }}><Typography variant="caption" color="text.secondary">DEPARTURE</Typography><Typography sx={{ fontWeight: 700 }}>{ticketBooking.schedule?.departureTime ?? "—"}</Typography></Grid>
            <Grid size={{ xs: 6 }}><Typography variant="caption" color="text.secondary">ARRIVAL</Typography><Typography sx={{ fontWeight: 700 }}>{ticketBooking.schedule?.arrivalTime ?? "—"}</Typography></Grid>
          </Grid>
          <Divider />
          <Box>
            <Typography sx={{ fontWeight: 800, mb: 1 }}>Passenger details</Typography>
            <Stack spacing={1}>{(ticketBooking.passengers ?? []).map((p, i) => <Paper key={`${p.name}-${i}`} variant="outlined" sx={{ p: 1.5 }}>
              <Typography sx={{ fontWeight: 700 }}>{i + 1}. {p.name}</Typography>
              <Typography variant="body2" color="text.secondary">Age: {p.age ?? "—"} · Gender: {p.gender ?? "—"} · Berth: {p.berthPreference ?? "No preference"}</Typography>
            </Paper>)}</Stack>
          </Box>
          <Divider />
          <Stack direction="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <Box><Typography variant="caption" color="text.secondary">PAYMENT STATUS</Typography><Typography sx={{ fontWeight: 700 }}>{ticketBooking.paymentStatus?.toUpperCase() ?? "—"}</Typography></Box>
            <Box sx={{ textAlign: "right" }}><Typography variant="caption" color="text.secondary">TOTAL FARE</Typography><Typography variant="h5" sx={{ fontWeight: 900 }}>₹{Number(ticketBooking.fare ?? 0).toLocaleString("en-IN")}</Typography></Box>
          </Stack>
          {ticketBooking.refundAmount ? <Alert severity="info">Recorded simulated refund: ₹{ticketBooking.refundAmount.toLocaleString("en-IN")}</Alert> : null}
          <Alert severity="info">This is a RailConnect project booking receipt generated from the C++ booking engine. It is not an IRCTC-issued ticket.</Alert>
        </Stack>}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}><Button onClick={() => setTicketOpen(false)}>Close</Button></DialogActions>
    </Dialog>

    <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} fullWidth maxWidth="md"><DialogTitle style={{ fontWeight: 800 }}>Complete your booking</DialogTitle><DialogContent><Stack spacing={2} sx={{ mt: 1 }}><Typography>{selected?.train.name} · {selected?.train.source} → {selected?.train.destination}</Typography><TextField select label="Travel class" value={travelClass} onChange={(e) => setTravelClass(e.target.value)}>{classes.filter((c) => Number(selected?.availability?.[c] ?? 0) > 0).map((c) => <MenuItem key={c} value={c}>{c} · ₹{selected?.fares?.[c]} per passenger · {selected?.availability?.[c]} seats</MenuItem>)}</TextField>{passengers.map((p, i) => <Paper key={i} variant="outlined" sx={{ p: 2 }}><Stack spacing={1}><Typography style={{ fontWeight: 700 }}>Passenger {i + 1}</Typography><Grid container spacing={1}><Grid size={{ xs: 12, sm: 5 }}><TextField fullWidth label="Full name" value={p.name} onChange={(e) => setPassengers((a) => a.map((x, n) => n === i ? { ...x, name: e.target.value } : x))} /></Grid><Grid size={{ xs: 6, sm: 2 }}><TextField fullWidth type="number" label="Age" value={p.age} onChange={(e) => setPassengers((a) => a.map((x, n) => n === i ? { ...x, age: Number(e.target.value) } : x))} /></Grid><Grid size={{ xs: 6, sm: 2 }}><TextField fullWidth select label="Gender" value={p.gender} onChange={(e) => setPassengers((a) => a.map((x, n) => n === i ? { ...x, gender: e.target.value } : x))}><MenuItem value="unspecified">Unspecified</MenuItem><MenuItem value="male">Male</MenuItem><MenuItem value="female">Female</MenuItem><MenuItem value="other">Other</MenuItem></TextField></Grid><Grid size={{ xs: 12, sm: 3 }}><TextField fullWidth select label="Berth" value={p.berthPreference} onChange={(e) => setPassengers((a) => a.map((x, n) => n === i ? { ...x, berthPreference: e.target.value } : x))}>{["no-preference", "lower", "middle", "upper", "side-lower", "side-upper"].map((v) => <MenuItem key={v} value={v}>{v}</MenuItem>)}</TextField></Grid></Grid>{passengers.length > 1 && <Button color="error" onClick={() => setPassengers((a) => a.filter((_, n) => n !== i))}>Remove passenger</Button>}</Stack></Paper>)}<Button disabled={passengers.length >= 6} onClick={() => setPassengers((a) => [...a, emptyPassenger()])}>+ Add passenger (max 6)</Button><TextField select label="Payment mode (simulated)" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>{["UPI", "CARD_SIMULATED", "NET_BANKING", "CASH"].map((v) => <MenuItem key={v} value={v}>{v}</MenuItem>)}</TextField><Typography style={{ fontWeight: 800 }}>Total: ₹{Number(selected?.fares?.[travelClass] ?? 0) * passengers.length}</Typography><Alert severity="info">This is a simulated payment for academic demonstration. No real money is charged.</Alert></Stack></DialogContent><DialogActions sx={{ p: 2 }}><Button onClick={() => setSelected(null)}>Cancel</Button><Button variant="contained" onClick={() => void bookSelected()} disabled={busy || !selected || Number(selected.availability?.[travelClass] ?? 0) < passengers.length}>Confirm booking</Button></DialogActions></Dialog>
    <Box sx={{ bgcolor: "#102b4e", color: "white", py: 3, textAlign: "center" }}><Typography variant="body2">© {new Date().getFullYear()} RailConnect · Railway Reservation System</Typography></Box>
  </Box>;
}
