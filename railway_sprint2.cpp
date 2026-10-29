#include <iostream>
#include <fstream>
#include <sstream>
#include <vector>
#include <string>
#include <iomanip>
#include <limits>
#include <algorithm>
#include <ctime>
#include <cctype>
#include <cstdio>
#ifdef _WIN32
#include <conio.h>
#else
#include <termios.h>
#include <unistd.h>
#endif

using namespace std;

/*
 Railway Reservation System - Sprint 1 MVP
 Sprint 1 scope implemented:
   - Search trains by source, destination, journey date
   - Show Sleeper / AC / General availability
   - Book seats with passenger name, class, berth preference
   - Calculate a demo fare and record simulated payment mode
   - Generate unique PNR and display ticket
   - Persist trains/bookings across restarts
 Out of Sprint 1 scope: registration/login, cancellation/refunds,
 admin schedule editing, and reporting.
*/

const string TRAIN_FILE = "trains.txt";
const string BOOKING_FILE = "bookings.txt";
const string AUDIT_FILE = "audit.log";
const string USER_FILE = "users.txt";
const string ADMIN_CONTACT = "admin";
const string ADMIN_PASSWORD = "Railway@123";
string currentUserName;
string currentUserContact;
bool isAdmin = false;

struct Train {
    int number{};
    string name, source, destination, departure, arrival;
    int sleeperTotal{}, acTotal{}, generalTotal{};
    double sleeperFare{}, acFare{}, generalFare{};
};

struct Booking {
    long long pnr{};
    string passenger, trainDate, className, berth, paymentMode, status;
    string ownerContact;
    double refund{};
    int trainNumber{}, seats{};
    double fare{};
};

string clean(string s) {
    // The file format uses '|'; replace it so user input cannot corrupt records.
    replace(s.begin(), s.end(), '|', '/');
    return s;
}

string lowerCopy(string s) {
    transform(s.begin(), s.end(), s.begin(),
              [](unsigned char c) { return static_cast<char>(tolower(c)); });
    return s;
}

string readLine(const string& prompt) {
    cout << prompt;
    string s;
    getline(cin, s);
    return clean(s);
}

int readInt(const string& prompt, int minValue, int maxValue) {
    while (true) {
        cout << prompt;
        string line;
        getline(cin, line);
        stringstream ss(line);
        int value;
        char extra;
        if (ss >> value && !(ss >> extra) && value >= minValue && value <= maxValue)
            return value;
        cout << "Invalid input. Enter a whole number from " << minValue
             << " to " << maxValue << ".\n";
    }
}

bool validDate(const string& date) {
    if (date.size() != 10 || date[4] != '-' || date[7] != '-') return false;
    for (int i = 0; i < 10; ++i) {
        if (i == 4 || i == 7) continue;
        if (!isdigit(static_cast<unsigned char>(date[i]))) return false;
    }
    int year = stoi(date.substr(0, 4)), month = stoi(date.substr(5, 2)), day = stoi(date.substr(8, 2));
    if (year < 2020 || month < 1 || month > 12) return false;
    const int days[] = {31,28,31,30,31,30,31,31,30,31,30,31};
    int maxDay = days[month-1];
    bool leap = (year % 400 == 0) || (year % 4 == 0 && year % 100 != 0);
    if (month == 2 && leap) maxDay = 29;
    return day >= 1 && day <= maxDay;
}

string readDate() {
    while (true) {
        string date = readLine("Journey date (YYYY-MM-DD): ");
        if (validDate(date)) return date;
        cout << "Please use YYYY-MM-DD format (for example, 2026-11-05).\n";
    }
}

vector<Train> demoTrains() {
    // Illustrative sample routes for the Sprint 1 demo; not live railway data.
    return {
        {12627, "Karnataka Express", "Bengaluru", "New Delhi", "19:20", "10:30", 80, 32, 100, 850, 2100, 420},
        {12007, "Shatabdi Express", "Bengaluru", "Chennai", "06:00", "11:00", 0, 40, 60, 0, 950, 280},
        {16526, "Kanyakumari Express", "Bengaluru", "Chennai", "20:10", "04:45", 70, 20, 90, 430, 1150, 220},
        {12640, "Brindavan Express", "Chennai", "Bengaluru", "07:50", "13:15", 0, 30, 70, 0, 800, 250},
        {22691, "Rajdhani Express", "Bengaluru", "New Delhi", "20:00", "05:50", 0, 48, 0, 0, 2600, 0},
        {12608, "Lalbagh Express", "Bengaluru", "Chennai", "06:30", "12:45", 70, 24, 90, 390, 980, 210},
        {12609, "Mysuru Express", "Chennai", "Mysuru", "22:30", "08:20", 80, 24, 100, 420, 1100, 230},
        {16591, "Hampi Express", "Bengaluru", "Hubballi", "22:00", "07:15", 75, 20, 100, 360, 900, 190},
        {17310, "Vasco Express", "Bengaluru", "Goa", "20:00", "09:30", 80, 24, 90, 400, 1050, 210},
        {16210, "Mysuru Express", "Bengaluru", "Mysuru", "08:00", "10:45", 50, 16, 80, 180, 450, 100},
        {12650, "Karnataka Sampark Kranti", "Yeshvantpur", "New Delhi", "13:30", "15:00", 90, 32, 0, 780, 1950, 0},
        {12678, "Ernakulam Express", "Bengaluru", "Kochi", "19:00", "08:00", 80, 24, 100, 420, 1150, 220},
        {16527, "Kannur Express", "Bengaluru", "Mangaluru", "20:00", "08:30", 75, 20, 90, 390, 980, 200},
        {12295, "Sanghamitra Express", "Bengaluru", "Patna", "09:00", "20:00", 100, 32, 120, 900, 2200, 450},
        {12864, "Howrah Express", "Bengaluru", "Kolkata", "22:30", "06:00", 100, 32, 120, 950, 2350, 480},
        {12616, "Grand Trunk Express", "Chennai", "New Delhi", "18:40", "06:20", 100, 32, 120, 850, 2100, 430},
        {12622, "Tamil Nadu Express", "Chennai", "New Delhi", "22:00", "07:00", 100, 36, 120, 900, 2250, 450},
        {12656, "Navjeevan Express", "Chennai", "Ahmedabad", "10:00", "19:30", 100, 32, 120, 850, 2050, 420},
        {12968, "Jaipur Express", "Chennai", "Jaipur", "17:00", "08:00", 100, 32, 120, 950, 2300, 470},
        {12618, "Mangala Lakshadweep Express", "Ernakulam", "Mumbai", "10:00", "13:30", 100, 32, 120, 700, 1750, 350},
        {12164, "Chennai Express", "Mumbai", "Chennai", "20:30", "22:00", 100, 36, 120, 750, 1850, 380},
        {11013, "Coimbatore Express", "Mumbai", "Coimbatore", "16:00", "20:30", 100, 32, 120, 720, 1800, 360},
        {12952, "Mumbai Rajdhani", "Mumbai", "New Delhi", "17:00", "08:30", 0, 48, 0, 0, 2800, 0},
        {12009, "Shatabdi Express", "Mumbai", "Ahmedabad", "06:25", "12:40", 0, 40, 60, 0, 1050, 300},
        {12951, "Mumbai Rajdhani", "New Delhi", "Mumbai", "16:30", "08:15", 0, 48, 0, 0, 2800, 0},
        {12301, "Howrah Rajdhani", "New Delhi", "Kolkata", "16:50", "09:55", 0, 48, 0, 0, 2700, 0},
        {12002, "Bhopal Shatabdi", "New Delhi", "Bhopal", "06:00", "14:00", 0, 40, 60, 0, 1500, 350},
        {12424, "Dibrugarh Rajdhani", "New Delhi", "Guwahati", "16:20", "10:00", 0, 48, 0, 0, 2900, 0},
        {12840, "Chennai Mail", "Chennai", "Kolkata", "19:00", "04:30", 100, 32, 120, 900, 2200, 450},
        {16346, "Netravati Express", "Thiruvananthapuram", "Mumbai", "09:00", "17:00", 100, 32, 120, 780, 1900, 390},
        {16382, "Kanyakumari Express", "Kanyakumari", "Bengaluru", "17:30", "08:15", 90, 24, 100, 450, 1150, 230},
        {17230, "Sabari Express", "Hyderabad", "Thiruvananthapuram", "12:00", "16:00", 100, 32, 120, 800, 1950, 400},
        {12702, "Hussain Sagar Express", "Hyderabad", "Mumbai", "14:00", "05:30", 100, 32, 120, 650, 1650, 330},
        {12723, "Telangana Express", "Hyderabad", "New Delhi", "06:00", "07:00", 100, 36, 120, 850, 2150, 440},
        {17030, "Hyderabad Express", "Hyderabad", "Chennai", "20:00", "08:30", 80, 24, 100, 430, 1100, 220},
        {17613, "Nanded Express", "Hyderabad", "Pune", "21:00", "08:30", 80, 24, 100, 400, 980, 200},
        {11020, "Konark Express", "Bhubaneswar", "Mumbai", "15:00", "05:00", 100, 32, 120, 750, 1850, 380},
        {12801, "Purushottam Express", "Puri", "New Delhi", "21:45", "04:00", 100, 32, 120, 900, 2200, 450},
        {18477, "Utkal Express", "Puri", "Haridwar", "20:00", "08:00", 100, 32, 120, 850, 2100, 430},
        {19020, "Dehradun Express", "Dehradun", "Mumbai", "10:00", "16:00", 100, 32, 120, 780, 1900, 390},
        {12028, "Shatabdi Express", "Chandigarh", "New Delhi", "07:00", "10:20", 0, 40, 60, 0, 900, 260}
    };
}

bool saveTrains(const vector<Train>& trains) {
    ofstream out(TRAIN_FILE, ios::trunc);
    if (!out) return false;
    for (const auto& x : trains) {
        out << x.number << '|' << x.name << '|' << x.source << '|'
            << x.destination << '|' << x.departure << '|' << x.arrival << '|'
            << x.sleeperTotal << '|' << x.acTotal << '|' << x.generalTotal << '|'
            << x.sleeperFare << '|' << x.acFare << '|' << x.generalFare << "|v1\n";
    }
    return static_cast<bool>(out);
}

vector<Train> loadTrains() {
    vector<Train> trains;
    ifstream in(TRAIN_FILE);
    string line;
    while (getline(in, line)) {
        stringstream ss(line);
        string field;
        vector<string> f;
        while (getline(ss, field, '|')) f.push_back(field);
        if (f.size() != 13) continue;
        try {
            Train t;
            t.number = stoi(f[0]); t.name = f[1]; t.source = f[2];
            t.destination = f[3]; t.departure = f[4]; t.arrival = f[5];
            t.sleeperTotal = stoi(f[6]); t.acTotal = stoi(f[7]);
            t.generalTotal = stoi(f[8]); t.sleeperFare = stod(f[9]);
            t.acFare = stod(f[10]); t.generalFare = stod(f[11]);
            trains.push_back(t);
        } catch (...) { /* ignore malformed seed/data rows */ }
    }
    in.close();

    // Add any newly shipped demo routes to an existing data file without
    // deleting routes already present. This upgrades older Sprint 1 installs.
    vector<Train> seeds = demoTrains();
    for (const auto& seed : seeds) {
        bool exists = any_of(trains.begin(), trains.end(), [&](const Train& t) {
            return t.number == seed.number;
        });
        if (!exists) trains.push_back(seed);
    }
    if (!saveTrains(trains))
        cerr << "Warning: could not write " << TRAIN_FILE << "; using loaded train data.\n";
    return trains;
}

vector<Booking> loadBookings() {
    vector<Booking> bookings;
    ifstream in(BOOKING_FILE);
    string line;
    while (getline(in, line)) {
        stringstream ss(line); vector<string> f; string field;
        while (getline(ss, field, '|')) f.push_back(field);
        if (f.size() < 9) continue;
        try {
            Booking b;
            b.pnr=stoll(f[0]); b.passenger=f[1]; b.trainNumber=stoi(f[2]);
            b.trainDate=f[3]; b.className=f[4]; b.seats=stoi(f[5]); b.berth=f[6];
            b.paymentMode=f[7]; b.fare=stod(f[8]); b.status="CONFIRMED"; b.refund=0.0;
            if (f.size() >= 11) { b.status=f[9]; b.refund=stod(f[10]); }
            if (f.size() >= 12) b.ownerContact=f[11]; else b.ownerContact="";
            bookings.push_back(b);
        } catch (...) {}
    }
    return bookings;
}

bool saveBookings(const vector<Booking>& bookings) {
    const string temp = BOOKING_FILE + ".tmp";
    ofstream out(temp, ios::trunc);
    if (!out) return false;
    for (const auto& b : bookings) {
        out << b.pnr << '|' << b.passenger << '|' << b.trainNumber << '|'
            << b.trainDate << '|' << b.className << '|' << b.seats << '|'
            << b.berth << '|' << b.paymentMode << '|' << fixed << setprecision(2)
            << b.fare << '|' << b.status << '|' << fixed << setprecision(2) << b.refund << '|' << b.ownerContact << '\n';
    }
    out.close();
    if (!out) return false;
    // Portable fallback: replace destination after successful temp write.
    remove(BOOKING_FILE.c_str());
    if (rename(temp.c_str(), BOOKING_FILE.c_str()) != 0) {
        // If rename failed, keep the temporary file for recovery and report failure.
        return false;
    }
    return true;
}

int bookedSeats(const vector<Booking>& bookings, int trainNo,
                const string& date, const string& className) {
    int total = 0;
    for (const auto& b : bookings)
        if (b.trainNumber == trainNo && b.trainDate == date &&
            b.className == className && b.status == "CONFIRMED")
            total += b.seats;
    return total;
}

int totalForClass(const Train& t, const string& c) {
    if (c == "Sleeper") return t.sleeperTotal;
    if (c == "AC") return t.acTotal;
    return t.generalTotal;
}

double fareForClass(const Train& t, const string& c) {
    if (c == "Sleeper") return t.sleeperFare;
    if (c == "AC") return t.acFare;
    return t.generalFare;
}

vector<const Train*> searchTrains(const vector<Train>& trains,
                                  const string& source, const string& destination) {
    vector<const Train*> found;
    for (const auto& t : trains)
        if (lowerCopy(t.source) == lowerCopy(source) &&
            lowerCopy(t.destination) == lowerCopy(destination))
            found.push_back(&t);
    return found;
}

void displayAvailability(const Train& t, const string& date,
                         const vector<Booking>& bookings) {
    cout << "\nTrain " << t.number << " - " << t.name << "\n"
         << "Route: " << t.source << " -> " << t.destination
         << " | " << t.departure << " - " << t.arrival << "\n"
         << "Journey date: " << date << "\n"
         << left << setw(12) << "Class" << right << setw(12) << "Available"
         << setw(14) << "Fare/seat\n";
    const vector<string> classes = {"Sleeper", "AC", "General"};
    for (const auto& c : classes) {
        int total = totalForClass(t, c);
        int available = max(0, total - bookedSeats(bookings, t.number, date, c));
        cout << left << setw(12) << c << right << setw(12) << available
             << setw(14) << fixed << setprecision(2) << fareForClass(t, c) << "\n";
    }
}

void audit(const string& action, long long pnr, int trainNo) {
    ofstream out(AUDIT_FILE, ios::app);
    time_t now = time(nullptr);
    tm* local = localtime(&now);
    if (local) out << put_time(local, "%Y-%m-%d %H:%M:%S");
    else out << "unknown-time";
    out << " | " << action << " | PNR=" << pnr << " | Train=" << trainNo << '\n';
}

long long generatePNR(const vector<Booking>& bookings) {
    long long candidate = 1000000000LL + static_cast<long long>(time(nullptr) % 900000000LL);
    for (int attempts = 0; attempts < 100000; ++attempts) {
        bool used = false;
        for (const auto& b : bookings) if (b.pnr == candidate) { used = true; break; }
        if (!used) return candidate;
        ++candidate;
    }
    return 0;
}

void searchMenu(const vector<Train>& trains, const vector<Booking>& bookings) {
    cout << "\n--- Search Trains ---\n";
    string source = readLine("Source station: ");
    string destination = readLine("Destination station: ");
    string date = readDate();
    auto matches = searchTrains(trains, source, destination);
    if (matches.empty()) {
        cout << "No trains found for that route. Try the station names shown in the demo data.\n";
        return;
    }
    for (const Train* t : matches) displayAvailability(*t, date, bookings);
    bool anyAvailable = false;
    for (const Train* t : matches) {
        for (const string& c : vector<string>{"Sleeper", "AC", "General"})
            if (totalForClass(*t, c) - bookedSeats(bookings, t->number, date, c) > 0)
                anyAvailable = true;
    }
    if (!anyAvailable) {
        cout << "No seats available on these trains for that date. Alternative trains on the same route:\n";
        for (const Train* t : matches) cout << "  " << t->number << " - " << t->name << " (" << t->departure << "-" << t->arrival << ")\n";
    }
}

void viewAllTrains(const vector<Train>& trains, const vector<Booking>& bookings) {
    cout << "\n--- All Trains in Demo Database ---\n";
    if (trains.empty()) {
        cout << "No train records are currently loaded.\n";
        return;
    }
    string date = readDate();
    cout << "\n" << left << setw(8) << "Number" << setw(29) << "Train name"
         << setw(23) << "From" << setw(23) << "To" << setw(8) << "Dep."
         << setw(8) << "Arr." << "SL/AC/GEN available\n";
    cout << string(116, '-') << "\n";
    for (const auto& t : trains) {
        int sl = max(0, t.sleeperTotal - bookedSeats(bookings, t.number, date, "Sleeper"));
        int ac = max(0, t.acTotal - bookedSeats(bookings, t.number, date, "AC"));
        int gn = max(0, t.generalTotal - bookedSeats(bookings, t.number, date, "General"));
        cout << left << setw(8) << t.number << setw(29) << t.name.substr(0, 27)
             << setw(23) << t.source.substr(0, 21) << setw(23) << t.destination.substr(0, 21)
             << setw(8) << t.departure << setw(8) << t.arrival
             << sl << "/" << ac << "/" << gn << "\n";
    }
    cout << "\nTotal trains listed: " << trains.size()
         << " | availability is calculated for " << date << ".\n"
         << "Note: routes, times, fares and capacities are illustrative demo data, not live railway data.\n";
}

void viewAllDestinations(const vector<Train>& trains) {
    vector<string> cities;
    for (const auto& t : trains) {
        if (find(cities.begin(), cities.end(), t.source) == cities.end()) cities.push_back(t.source);
        if (find(cities.begin(), cities.end(), t.destination) == cities.end()) cities.push_back(t.destination);
    }
    sort(cities.begin(), cities.end(), [](const string& a, const string& b) {
        return lowerCopy(a) < lowerCopy(b);
    });
    cout << "\n--- Cities / Stations in Demo Database ---\n";
    for (size_t i = 0; i < cities.size(); ++i) {
        cout << setw(3) << (i + 1) << ". " << cities[i] << "\n";
    }
    cout << "\nTotal unique cities/stations: " << cities.size() << "\n";
    cout << "These are only locations present in the demo train list.\n";
}

void printTicket(const Booking& b, const Train& t) {
    cout << "\n========================================\n"
         << "          RAILWAY E-TICKET\n"
         << "========================================\n"
         << "PNR            : " << b.pnr << "\n"
         << "Passenger      : " << b.passenger << "\n"
         << "Train          : " << t.number << " - " << t.name << "\n"
         << "Route          : " << t.source << " -> " << t.destination << "\n"
         << "Journey date   : " << b.trainDate << "\n"
         << "Timing         : " << t.departure << " - " << t.arrival << "\n"
         << "Class          : " << b.className << "\n"
         << "Seats          : " << b.seats << "\n"
         << "Berth pref.    : " << b.berth << "\n"
         << "Payment mode   : " << b.paymentMode << " (simulated)\n"
         << "Total fare     : Rs. " << fixed << setprecision(2) << b.fare << "\n"
         << "Status         : " << b.status << "\n";
    if (b.status == "CANCELLED") cout << "Refund amount   : Rs. " << fixed << setprecision(2) << b.refund << " (simulated)\n";
    cout << "========================================\n";
}

void bookMenu(const vector<Train>& trains, vector<Booking>& bookings) {
    cout << "\n--- Book Ticket ---\n";
    string source = readLine("Source station: ");
    string destination = readLine("Destination station: ");
    string date = readDate();
    auto matches = searchTrains(trains, source, destination);
    if (matches.empty()) {
        cout << "No trains found for that route.\n";
        return;
    }
    cout << "\nMatching trains:\n";
    for (const Train* t : matches) displayAvailability(*t, date, bookings);
    int trainNo = readInt("Enter train number: ", 1, 999999);
    const Train* selected = nullptr;
    for (const Train* t : matches) if (t->number == trainNo) selected = t;
    if (!selected) {
        cout << "That train is not in the search results.\n";
        return;
    }

    cout << "\nClass: 1. Sleeper  2. AC  3. General\n";
    int classChoice = readInt("Choose class: ", 1, 3);
    string className = classChoice == 1 ? "Sleeper" : classChoice == 2 ? "AC" : "General";
    int available = totalForClass(*selected, className)
                  - bookedSeats(bookings, trainNo, date, className);
    if (available <= 0) {
        cout << "This class is full. Alternative trains on the same route:\n";
        for (const Train* t : matches) {
            int alt = totalForClass(*t, className) - bookedSeats(bookings, t->number, date, className);
            cout << "  " << t->number << " - " << t->name << " | " << className << " available: " << max(0,alt) << "\n";
        }
        return;
    }
    int seats = readInt("Number of seats (1-" + to_string(available) + "): ", 1, available);
    string passenger = currentUserName.empty() ? readLine("Passenger name: ") : currentUserName;
    if (!currentUserName.empty()) cout << "Passenger: " << passenger << " (registered account)\n";
    if (passenger.empty()) {
        cout << "Passenger name cannot be empty.\n";
        return;
    }

    cout << "Berth preference: 1. Lower  2. Middle  3. Upper  4. Window\n";
    int berthChoice = readInt("Choose preference: ", 1, 4);
    string berth = berthChoice == 1 ? "Lower" : berthChoice == 2 ? "Middle" :
                   berthChoice == 3 ? "Upper" : "Window";

    double fare = fareForClass(*selected, className) * seats;
    cout << "\nBooking summary\nTrain: " << selected->name << " (" << trainNo << ")"
         << "\nClass: " << className << "\nSeats: " << seats
         << "\nFare: Rs. " << fixed << setprecision(2) << fare << "\n";
    cout << "Payment mode: 1. Cash  2. Card  3. UPI\n";
    int paymentChoice = readInt("Choose simulated payment mode: ", 1, 3);
    string payment = paymentChoice == 1 ? "Cash" : paymentChoice == 2 ? "Card" : "UPI";
    string confirm = lowerCopy(readLine("Confirm booking? (yes/no): "));
    if (confirm != "yes" && confirm != "y") {
        cout << "Booking not submitted.\n";
        return;
    }

    // Re-check availability immediately before commit to prevent over-booking.
    available = totalForClass(*selected, className)
              - bookedSeats(bookings, trainNo, date, className);
    if (seats > available) {
        cout << "Booking rejected: not enough seats remain.\n";
        return;
    }
    long long pnr = generatePNR(bookings);
    if (pnr == 0) {
        cout << "Could not generate a unique PNR. Please try again.\n";
        return;
    }
    Booking b;
    b.pnr = pnr;
    b.passenger = passenger;
    b.trainNumber = trainNo;
    b.trainDate = date;
    b.className = className;
    b.seats = seats;
    b.berth = berth;
    b.paymentMode = payment;
    b.fare = fare;
    b.status = "CONFIRMED";
    b.refund = 0.0;
    b.ownerContact = currentUserContact;
    bookings.push_back(b);
    if (!saveBookings(bookings)) {
        bookings.pop_back();
        cout << "Could not save booking to disk. No booking was confirmed.\n";
        return;
    }
    audit("BOOKING_CONFIRMED", pnr, trainNo);
    printTicket(b, *selected);
}

void checkPNR(const vector<Booking>& bookings, const vector<Train>& trains) {
    cout << "\n--- Check PNR ---\n";
    long long pnr;
    while (true) {
        cout << "Enter PNR: ";
        string s;
        getline(cin, s);
        stringstream ss(s);
        char extra;
        if ((ss >> pnr) && !(ss >> extra) && pnr > 0) break;
        cout << "Enter a valid numeric PNR.\n";
    }
    for (const auto& b : bookings) {
        if (b.pnr == pnr) {
            for (const auto& t : trains) if (t.number == b.trainNumber) {
                printTicket(b, t);
                return;
            }
        }
    }
    cout << "PNR not found.\n";
}


string readPassword(const string& prompt) {
    cout << prompt; string value;
#ifdef _WIN32
    while (true) { int ch = _getch(); if (ch == '\r') break; if (ch == '\b') { if (!value.empty()) { value.pop_back(); cout << "\b \b"; } } else if (ch >= 32 && ch <= 126 && value.size() < 128) { value.push_back((char)ch); cout << '*'; } }
#else
    termios oldt{}, newt{}; bool changed = (tcgetattr(STDIN_FILENO, &oldt) == 0);
    if (changed) { newt=oldt; newt.c_lflag &= ~ECHO; tcsetattr(STDIN_FILENO, TCSANOW, &newt); }
    getline(cin, value);
    if (changed) { tcsetattr(STDIN_FILENO, TCSANOW, &oldt); cout << '\n'; }
#endif
    cout << '\n'; return value;
}
string passwordHash(const string& input) {
    // FNV-1a hash for this academic demo; use a vetted password KDF in production.
    unsigned long long h=1469598103934665603ULL;
    for (unsigned char c : input) { h ^= c; h *= 1099511628211ULL; }
    stringstream ss; ss << hex << h; return ss.str();
}
struct User { string name, contact, hash; int failed=0; bool locked=false; };
vector<User> loadUsers() {
    vector<User> users; ifstream in(USER_FILE); string line;
    while (getline(in,line)) { stringstream ss(line); User u; string locked, failed;
        if (getline(ss,u.name,'|') && getline(ss,u.contact,'|') && getline(ss,u.hash,'|')) {
            if (getline(ss,failed,'|')) try {u.failed=stoi(failed);} catch(...) {}
            if (getline(ss,locked,'|')) u.locked=(locked=="1");
            users.push_back(u);
        }
    } return users;
}
bool saveUsers(const vector<User>& users) { ofstream out(USER_FILE,ios::trunc); if(!out)return false; for(const auto&u:users) out<<clean(u.name)<<'|'<<clean(u.contact)<<'|'<<u.hash<<'|'<<u.failed<<'|'<<(u.locked?1:0)<<'\n'; return (bool)out; }
bool registerUser() {
    auto users=loadUsers(); cout<<"\n--- Passenger Registration ---\n";
    string name=readLine("Full name: "), contact=readLine("Contact number (or username): ");
    if(name.empty() || contact.empty() || contact.find('|')!=string::npos) {cout<<"Name/contact cannot be empty.\n";return false;}
    if(any_of(users.begin(),users.end(),[&](const User&u){return u.contact==contact;})){cout<<"That contact is already registered.\n";return false;}
    string pass=readPassword("Create password (minimum 6 characters): "); if(pass.size()<6){cout<<"Password must be at least 6 characters.\n";return false;}
    users.push_back({name,contact,passwordHash(pass),0,false}); if(!saveUsers(users)){cout<<"Could not save account.\n";return false;}
    cout<<"Registration successful. Please log in.\n"; return true;
}
bool loginUser() {
    cout<<"\n--- Login ---\n"; string contact=readLine("Contact/username (admin for administrator): "); string pass=readPassword("Password: ");
    if(contact==ADMIN_CONTACT && pass==ADMIN_PASSWORD){isAdmin=true;currentUserName="Administrator";currentUserContact=ADMIN_CONTACT;cout<<"Administrator login successful. (Change the demo credentials before real use.)\n";audit("ADMIN_LOGIN",0,0);return true;}
    auto users=loadUsers(); for(auto &u:users) if(u.contact==contact){
        if(u.locked){cout<<"Account locked after 3 failed login attempts. Contact administrator.\n";return false;}
        if(u.hash==passwordHash(pass)){u.failed=0;saveUsers(users);currentUserName=u.name;currentUserContact=u.contact;isAdmin=false;cout<<"Welcome, "<<u.name<<".\n";return true;}
        u.failed++; if(u.failed>=3)u.locked=true; saveUsers(users); audit("LOGIN_FAILED",0,0);
        cout<<"Incorrect password. Failed attempts: "<<u.failed<<"/3"<<(u.locked?" — account locked.":"")<<"\n";return false;
    }
    cout<<"Account not found. Register first.\n"; return false;
}
void cancelTicket(vector<Booking>& bookings, const vector<Train>& /*trains*/) {
    cout<<"\n--- Cancel Ticket / Refund ---\n"; long long pnr=0; string input=readLine("Enter PNR: "); try{size_t n=0;pnr=stoll(input,&n);if(n!=input.size())throw 1;}catch(...){cout<<"Invalid PNR.\n";return;}
    for(auto &b:bookings) if(b.pnr==pnr){
        if(!isAdmin && !b.ownerContact.empty() && b.ownerContact!=currentUserContact){cout<<"This booking does not belong to your account.\n";return;}
        if(b.status!="CONFIRMED"){cout<<"This PNR is already cancelled or not active. No changes made.\n";return;}
        double charge=b.fare*0.10; b.refund=b.fare-charge; b.status="CANCELLED";
        if(!saveBookings(bookings)){b.status="CONFIRMED";b.refund=0;cout<<"Could not save cancellation.\n";return;}
        audit("BOOKING_CANCELLED_REFUND",pnr,b.trainNumber); cout<<"Cancellation successful. Seats have been restored.\nCancellation charge (10% demo policy): Rs. "<<fixed<<setprecision(2)<<charge<<"\nRefund status: REFUND_PENDING (simulated)\nRefund amount: Rs. "<<b.refund<<"\n";return;
    } cout<<"PNR not found.\n";
}
void bookingHistory(const vector<Booking>& bookings,const vector<Train>& /*trains*/){
    cout<<"\n--- My Booking History ---\n"; bool found=false;
    for(const auto&b:bookings) if(isAdmin || b.ownerContact==currentUserContact || (b.ownerContact.empty() && lowerCopy(b.passenger)==lowerCopy(currentUserName))){
        found=true; cout<<"PNR "<<b.pnr<<" | Train "<<b.trainNumber<<" | "<<b.trainDate<<" | "<<b.className<<" | "<<b.status<<" | Rs."<<fixed<<setprecision(2)<<b.fare<<"\n";
    } if(!found)cout<<"No bookings found for this account.\n";
}
void adminMenu(vector<Train>& trains, vector<Booking>& bookings){
    if(!isAdmin){cout<<"Access denied: administrator login required.\n";return;}
    while(true){cout<<"\n--- Administration ---\n1. Add train\n2. Update train route/timings/fares\n3. Remove train\n4. Configure seat inventory\n5. Occupancy/revenue report\n0. Back\n";int c=readInt("Choose: ",0,5);if(c==0)return;
        if(c==1){Train t; t.number=readInt("Train number: ",1,999999);if(any_of(trains.begin(),trains.end(),[&](const Train&x){return x.number==t.number;})){cout<<"Train number already exists.\n";continue;}t.name=readLine("Train name: ");t.source=readLine("Source: ");t.destination=readLine("Destination: ");t.departure=readLine("Departure (HH:MM): ");t.arrival=readLine("Arrival (HH:MM): ");t.sleeperTotal=readInt("Sleeper seats: ",0,100000);t.acTotal=readInt("AC seats: ",0,100000);t.generalTotal=readInt("General seats: ",0,100000);cout<<"Fares per seat:\n";string a; // use numeric text helper via stringstream
            auto fare=[&](const string&label){while(true){string v=readLine(label);try{size_t n;double d=stod(v,&n);if(n==v.size()&&d>=0&&d<=1000000)return d;}catch(...){}cout<<"Enter a valid non-negative fare.\n";}};t.sleeperFare=fare("Sleeper fare: ");t.acFare=fare("AC fare: ");t.generalFare=fare("General fare: ");trains.push_back(t);if(saveTrains(trains)){audit("ADMIN_ADD_TRAIN",0,t.number);cout<<"Train added.\n";}else{trains.pop_back();cout<<"Could not save train.\n";}}
        else if(c==2||c==3||c==4){int no=readInt("Train number: ",1,999999);auto it=find_if(trains.begin(),trains.end(),[&](const Train&t){return t.number==no;});if(it==trains.end()){cout<<"Train not found.\n";continue;}
            if(c==3){if(any_of(bookings.begin(),bookings.end(),[&](const Booking&b){return b.trainNumber==no&&b.status=="CONFIRMED";})){cout<<"Cannot remove a train with confirmed bookings.\n";continue;}Train old=*it;trains.erase(it);if(!saveTrains(trains)){trains.push_back(old);cout<<"Could not save removal.\n";}else{audit("ADMIN_REMOVE_TRAIN",0,no);cout<<"Train removed.\n";}}
            else if(c==4){int sl=readInt("New Sleeper capacity: ",0,100000),ac=readInt("New AC capacity: ",0,100000),gn=readInt("New General capacity: ",0,100000);if(sl<bookedSeats(bookings,no,"", "Sleeper")){} // date-specific checks below are performed on booked records
                int maxSL=0,maxAC=0,maxGN=0;for(const auto&b:bookings)if(b.trainNumber==no&&b.status=="CONFIRMED"){if(b.className=="Sleeper")maxSL=max(maxSL,bookedSeats(bookings,no,b.trainDate,"Sleeper"));if(b.className=="AC")maxAC=max(maxAC,bookedSeats(bookings,no,b.trainDate,"AC"));if(b.className=="General")maxGN=max(maxGN,bookedSeats(bookings,no,b.trainDate,"General"));}if(sl<maxSL||ac<maxAC||gn<maxGN){cout<<"Capacity cannot be lower than already booked seats for any journey date.\n";continue;}int osl=it->sleeperTotal,oac=it->acTotal,ogn=it->generalTotal;it->sleeperTotal=sl;it->acTotal=ac;it->generalTotal=gn;if(saveTrains(trains)){audit("ADMIN_UPDATE_INVENTORY",0,no);cout<<"Inventory updated.\n";}else{it->sleeperTotal=osl;it->acTotal=oac;it->generalTotal=ogn;cout<<"Could not save inventory.\n";}}
            else{it->name=readLine("Train name: ");it->source=readLine("Source: ");it->destination=readLine("Destination: ");it->departure=readLine("Departure (HH:MM): ");it->arrival=readLine("Arrival (HH:MM): ");if(saveTrains(trains)){audit("ADMIN_UPDATE_TRAIN",0,no);cout<<"Train updated.\n";}else cout<<"Could not save changes.\n";}}
        else if(c==5){int no=readInt("Train number (0 for all trains): ",0,999999);string from=readDate(),to=readDate();if(to<from){cout<<"End date must be on/after start date.\n";continue;}double revenue=0;int seats=0,capacity=0;for(const auto&b:bookings)if((no==0||b.trainNumber==no)&&b.trainDate>=from&&b.trainDate<=to){if(b.status=="CONFIRMED"){revenue+=b.fare;seats+=b.seats;}else revenue+=(b.fare-b.refund);}for(const auto&t:trains)if(no==0||t.number==no)capacity+=t.sleeperTotal+t.acTotal+t.generalTotal;cout<<"\nReport period: "<<from<<" to "<<to<<"\nConfirmed seats sold: "<<seats<<"\nNet revenue after simulated refunds: Rs. "<<fixed<<setprecision(2)<<revenue<<"\nConfigured seat capacity (per train, not date-specific): "<<capacity<<"\n";audit("ADMIN_REPORT",0,no);}
    }
}

int main() {
    vector<Train> trains=loadTrains(); vector<Booking> bookings=loadBookings();
    cout << "========================================\n RAILWAY RESERVATION SYSTEM - SPRINT 2\n========================================\n"
         << "Demo data only; payment/refunds are simulated. Admin login: admin / Railway@123\n";
    while(true){
        cout<<"\nWelcome Menu\n1. Register passenger\n2. Login\n3. Search trains (guest)\n4. View all trains (guest)\n5. View cities/stations\n0. Exit\n";
        int c=readInt("Choose: ",0,5); if(c==0)break;
        if(c==1)registerUser();
        else if(c==2){if(!loginUser())continue;while(true){cout<<"\nAccount Menu ("<<currentUserName<<")\n1. Search trains\n2. Book ticket\n3. Check PNR/refund status\n4. Cancel ticket\n5. My booking history\n";if(isAdmin)cout<<"6. Administration\n";cout<<"9. Logout\n";int maxOpt=isAdmin?9:9;int a=readInt("Choose: ",1,maxOpt);if(a==9){currentUserName="";currentUserContact="";isAdmin=false;break;}if(a==1)searchMenu(trains,bookings);else if(a==2){if(isAdmin)cout<<"Admin accounts cannot make passenger bookings.\n";else bookMenu(trains,bookings);}else if(a==3)checkPNR(bookings,trains);else if(a==4)cancelTicket(bookings,trains);else if(a==5)bookingHistory(bookings,trains);else if(a==6&&isAdmin)adminMenu(trains,bookings);else cout<<"Invalid option for this account.\n";}
        }
        else if(c==3)searchMenu(trains,bookings);else if(c==4)viewAllTrains(trains,bookings);else if(c==5)viewAllDestinations(trains);
    }
    cout<<"Thank you for using the Railway Reservation System.\n";return 0;
}
