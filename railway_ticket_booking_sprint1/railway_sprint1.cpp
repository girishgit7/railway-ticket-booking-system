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

struct Train {
    int number{};
    string name, source, destination, departure, arrival;
    int sleeperTotal{}, acTotal{}, generalTotal{};
    double sleeperFare{}, acFare{}, generalFare{};
};

struct Booking {
    long long pnr{};
    string passenger, trainDate, className, berth, paymentMode, status;
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
    // Basic YYYY-MM-DD format validation; this is not a full calendar validator.
    if (date.size() != 10 || date[4] != '-' || date[7] != '-') return false;
    for (int i = 0; i < 10; ++i) {
        if (i == 4 || i == 7) continue;
        if (!isdigit(static_cast<unsigned char>(date[i]))) return false;
    }
    int month = stoi(date.substr(5, 2));
    int day = stoi(date.substr(8, 2));
    return month >= 1 && month <= 12 && day >= 1 && day <= 31;
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
        stringstream ss(line);
        vector<string> f;
        string field;
        while (getline(ss, field, '|')) f.push_back(field);
        if (f.size() != 9) continue;
        try {
            Booking b;
            b.pnr = stoll(f[0]); b.passenger = f[1]; b.trainNumber = stoi(f[2]);
            b.trainDate = f[3]; b.className = f[4]; b.seats = stoi(f[5]);
            b.berth = f[6]; b.paymentMode = f[7]; b.fare = stod(f[8]);
            b.status = "CONFIRMED";
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
            << b.fare << '\n';
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
    if (!anyAvailable) cout << "No seats available on these trains for that date.\n";
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
         << "Status         : " << b.status << "\n"
         << "========================================\n";
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
        cout << "This class is full. Please search for an alternative train.\n";
        return;
    }
    int seats = readInt("Number of seats (1-" + to_string(available) + "): ", 1, available);
    string passenger = readLine("Passenger name: ");
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

int main() {
    vector<Train> trains = loadTrains();
    vector<Booking> bookings = loadBookings();

    cout << "========================================\n"
         << "   RAILWAY RESERVATION SYSTEM - SPRINT 1\n"
         << "========================================\n"
         << "Demo application: train data and fares are illustrative.\n"
         << "Bookings are stored locally in " << BOOKING_FILE << ".\n";

    while (true) {
        cout << "\nMain Menu\n"
             << "1. Search trains and availability\n"
             << "2. Book ticket\n"
             << "3. Check ticket / PNR\n"
             << "4. View ALL trains\n"
             << "5. View all cities / destinations\n"
             << "0. Exit\n";
        int choice = readInt("Choose an option: ", 0, 5);
        if (choice == 0) {
            cout << "Thank you for using the Railway Reservation System.\n";
            break;
        }
        if (choice == 1) searchMenu(trains, bookings);
        else if (choice == 2) bookMenu(trains, bookings);
        else if (choice == 3) checkPNR(bookings, trains);
        else if (choice == 4) viewAllTrains(trains, bookings);
        else if (choice == 5) viewAllDestinations(trains);
    }
    return 0;
}
