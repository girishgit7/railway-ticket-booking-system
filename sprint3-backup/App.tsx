import { useState } from "react";
import axios from "axios";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  Box,
  Paper,
  TextField,
  Grid,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Chip,
  Stack,
} from "@mui/material";
import TrainIcon from "@mui/icons-material/Train";
import SearchIcon from "@mui/icons-material/Search";
import LoginIcon from "@mui/icons-material/Login";
import api from "./services/api";

interface PassengerUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Journey {
  scheduleId: string;
  journeyDate: string;
  departureTime: string;
  arrivalTime: string;
  train: {
    trainNumber: string;
    name: string;
    source: string;
    destination: string;
  };
  availability: Record<string, number>;
  fares: Record<string, number>;
}

function getTomorrow(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function App() {
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState(getTomorrow());

  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [user, setUser] = useState<PassengerUser | null>(() => {
    const saved = localStorage.getItem("railway_user");
    return saved ? JSON.parse(saved) as PassengerUser : null;
  });

  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState(0);
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const searchTrains = async () => {
    setError("");
    setMessage("");
    setJourneys([]);

    if (!source.trim() || !destination.trim() || !date) {
      setError("Enter your source, destination and journey date.");
      return;
    }

    if (source.trim().toLowerCase() === destination.trim().toLowerCase()) {
      setError("Source and destination must be different.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.get("/trains/search", {
        params: {
          source: source.trim(),
          destination: destination.trim(),
          date,
        },
      });

      setJourneys(response.data.journeys || []);

      if (!response.data.journeys?.length) {
        setMessage("No scheduled trains found for this route and date.");
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || "Unable to search trains.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const authenticate = async () => {
    setError("");
    setMessage("");

    if (!authEmail.trim() || !authPassword) {
      setError("Enter your email and password.");
      return;
    }

    if (authTab === 1 && !authName.trim()) {
      setError("Enter your full name.");
      return;
    }

    setAuthLoading(true);

    try {
      const endpoint = authTab === 0 ? "/auth/login" : "/auth/register";

      const payload = authTab === 0
        ? { email: authEmail.trim(), password: authPassword }
        : {
            name: authName.trim(),
            email: authEmail.trim(),
            password: authPassword,
          };

      const response = await api.post(endpoint, payload);

      const { token, user: loggedInUser } = response.data;

      localStorage.setItem("railway_token", token);
      localStorage.setItem("railway_user", JSON.stringify(loggedInUser));

      setUser(loggedInUser);
      setAuthOpen(false);
      setAuthName("");
      setAuthEmail("");
      setAuthPassword("");
      setMessage(`Welcome, ${loggedInUser.name}!`);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || "Authentication failed.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("railway_token");
    localStorage.removeItem("railway_user");
    setUser(null);
    setMessage("You have been logged out.");
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f4f6fb" }}>
      <AppBar position="static" sx={{ bgcolor: "#102b4e" }} elevation={0}>
        <Toolbar sx={{ maxWidth: 1200, width: "100%", mx: "auto" }}>
          <TrainIcon sx={{ mr: 1, fontSize: 32 }} />

          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 800 }}>
            RailConnect
          </Typography>

          {user ? (
            <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
              <Typography variant="body2">
                Hi, {user.name}
              </Typography>
              <Button color="inherit" onClick={logout}>
                Logout
              </Button>
            </Stack>
          ) : (
            <Button
              color="inherit"
              startIcon={<LoginIcon />}
              onClick={() => {
                setError("");
                setAuthOpen(true);
              }}
            >
              Login / Register
            </Button>
          )}
        </Toolbar>
      </AppBar>

      <Box
        sx={{
          background: "linear-gradient(120deg, #102b4e, #1769aa)",
          color: "white",
          py: { xs: 7, md: 10 },
        }}
      >
        <Container maxWidth="lg">
          <Typography variant="overline" sx={{ letterSpacing: 3 }}>
            YOUR JOURNEY STARTS HERE
          </Typography>

          <Typography
            variant="h2"
            sx={{ fontSize: { xs: 36, md: 56 }, mt: 1, fontWeight: 900 }}
          >
            Travel smarter.
            <br />
            Travel with RailConnect.
          </Typography>

          <Typography sx={{ mt: 2, opacity: 0.85, maxWidth: 560 }}>
            Discover train schedules, check availability and plan your next
            journey through one simple reservation platform.
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ mt: -4, position: "relative" }}>
        <Paper elevation={5} sx={{ p: { xs: 2, md: 4 }, borderRadius: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 3 }}>
            Find your train
          </Typography>

          <Grid container spacing={2} sx={{ alignItems: "center" }}>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                fullWidth
                label="From"
                placeholder="e.g. Chennai"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                fullWidth
                label="To"
                placeholder="e.g. Bengaluru"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                fullWidth
                type="date"
                label="Journey date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                slotProps={{
                  inputLabel: { shrink: true },
                  htmlInput: { min: getTomorrow() },
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <Button
                fullWidth
                size="large"
                variant="contained"
                startIcon={<SearchIcon />}
                onClick={searchTrains}
                disabled={loading}
                sx={{
                  height: 56,
                  bgcolor: "#1769aa",
                  fontWeight: 700,
                }}
              >
                {loading ? "Searching..." : "Search trains"}
              </Button>
            </Grid>
          </Grid>
        </Paper>

        <Box sx={{ mt: 4, pb: 8 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {message && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {message}
            </Alert>
          )}

          {loading && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
              <CircularProgress />
            </Box>
          )}

          {journeys.length > 0 && (
            <>
              <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>
                Available journeys
              </Typography>

              <Stack spacing={2}>
                {journeys.map((journey) => (
                  <Card key={journey.scheduleId} elevation={2}>
                    <CardContent>
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={2}
                        sx={{ justifyContent: "space-between" }}
                      >
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 800 }}>
                            {journey.train.name}
                          </Typography>
                          <Typography color="text.secondary">
                            Train No. {journey.train.trainNumber}
                          </Typography>
                        </Box>

                        <Chip label="Schedule available" color="success" />
                      </Stack>

                      <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid size={{ xs: 6, md: 3 }}>
                          <Typography color="text.secondary" variant="caption">
                            DEPARTURE
                          </Typography>
                          <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            {journey.departureTime}
                          </Typography>
                          <Typography>{journey.train.source}</Typography>
                        </Grid>

                        <Grid size={{ xs: 6, md: 3 }}>
                          <Typography color="text.secondary" variant="caption">
                            ARRIVAL
                          </Typography>
                          <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            {journey.arrivalTime}
                          </Typography>
                          <Typography>{journey.train.destination}</Typography>
                        </Grid>

                        <Grid size={{ xs: 12, md: 6 }}>
                          <Typography color="text.secondary" variant="caption">
                            FARES AND SEAT AVAILABILITY
                          </Typography>

                          <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1, mt: 1 }}>
                            {Object.entries(journey.fares || {}).map(
                              ([travelClass, fare]) => (
                                <Chip
                                  key={travelClass}
                                  label={`${travelClass}: ₹${fare} · ${
                                    journey.availability?.[travelClass] ?? 0
                                  } seats`}
                                  variant="outlined"
                                />
                              )
                            )}
                          </Stack>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </>
          )}
        </Box>
      </Container>

      <Box sx={{ bgcolor: "#102b4e", color: "white", py: 3 }}>
        <Container maxWidth="lg">
          <Typography variant="body2" sx={{ textAlign: "center" }}>
            © {new Date().getFullYear()} RailConnect · Railway Reservation System
          </Typography>
        </Container>
      </Box>

      <Dialog
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Welcome to RailConnect</DialogTitle>

        <DialogContent>
          <Tabs
            value={authTab}
            onChange={(_, value: number) => {
              setAuthTab(value);
              setError("");
            }}
            variant="fullWidth"
          >
            <Tab label="Login" />
            <Tab label="Register" />
          </Tabs>

          <Stack spacing={2} sx={{ mt: 3 }}>
            {authTab === 1 && (
              <TextField
                label="Full name"
                fullWidth
                value={authName}
                onChange={(e) => setAuthName(e.target.value)}
              />
            )}

            <TextField
              label="Email"
              type="email"
              fullWidth
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
            />

            <TextField
              label="Password"
              type="password"
              fullWidth
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              helperText={
                authTab === 1
                  ? "Use 10–72 characters."
                  : undefined
              }
            />

            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => setAuthOpen(false)}>Close</Button>
          <Button
            variant="contained"
            onClick={authenticate}
            disabled={authLoading}
          >
            {authLoading
              ? "Please wait..."
              : authTab === 0
                ? "Login"
                : "Create account"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default App;