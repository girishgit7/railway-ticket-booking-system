// Non-interactive API adapter over the original C++ railway engine.
// The original railway_sprint2.cpp remains the source of booking rules and file persistence.
#define main railwayInteractiveMain
#include "../../railway_sprint2.cpp"
#undef main

#include <cstdlib>
#include <ctime>

static string jsonEscape(const string& s) {
    string out;
    for (unsigned char c : s) {
        switch (c) {
            case '"': out += "\\\""; break;
            case '\\': out += "\\\\"; break;
            case '\n': out += "\\n"; break;
            case '\r': out += "\\r"; break;
            case '\t': out += "\\t"; break;
            default: if (c >= 32) out += static_cast<char>(c);
        }
    }
    return out;
}
static string b64decode(const string& in) {
    static const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    string out; int val = 0, bits = -8;
    for (unsigned char c : in) {
        if (c == '=') break;
        size_t p = chars.find(c); if (p == string::npos) continue;
        val = (val << 6) + static_cast<int>(p); bits += 6;
        if (bits >= 0) { out.push_back(char((val >> bits) & 0xFF)); bits -= 8; }
    }
    return out;
}
static vector<string> splitLines(const string& s) {
    vector<string> v; string item; stringstream ss(s);
    while (getline(ss, item, '\n')) if (!item.empty()) v.push_back(clean(item));
    return v;
}
static string classMap(const string& c) {
    if (c == "SLEEPER") return "Sleeper";
    if (c == "GENERAL") return "General";
    if (c == "AC3" || c == "AC2" || c == "FIRST_AC" || c == "AC") return "AC";
    return "";
}
static string classCode(const string& c) {
    if (c == "Sleeper") return "SLEEPER";
    if (c == "General") return "GENERAL";
    return "AC";
}
static string paymentMap(const string& p) {
    if (p == "CASH") return "Cash";
    if (p == "CARD_SIMULATED" || p == "CARD") return "Card";
    return "UPI";
}
static bool withinProjectBookingHorizon(const string& date) {
    if (!validDate(date)) return false;
    time_t now = time(nullptr);
    tm todayTm = *localtime(&now);
    todayTm.tm_hour = 0; todayTm.tm_min = 0; todayTm.tm_sec = 0;
    time_t today = mktime(&todayTm);
    tm journeyTm{};
    journeyTm.tm_year = stoi(date.substr(0, 4)) - 1900;
    journeyTm.tm_mon = stoi(date.substr(5, 2)) - 1;
    journeyTm.tm_mday = stoi(date.substr(8, 2));
    journeyTm.tm_isdst = -1;
    time_t journey = mktime(&journeyTm);
    const double days = difftime(journey, today) / 86400.0;
    return days >= 0 && days <= 240;
}
static const Train* findTrain(const vector<Train>& trains, int no) {
    for (const auto& t : trains) if (t.number == no) return &t;
    return nullptr;
}
static void emitBooking(const Booking& b, const Train* t) {
    cout << "{\"pnr\":\"" << b.pnr << "\",\"trainNumber\":\"" << b.trainNumber
         << "\",\"passenger\":\"" << jsonEscape(b.passenger) << "\",\"journeyDate\":\"" << b.trainDate
         << "\",\"travelClass\":\"" << classCode(b.className) << "\",\"seats\":" << b.seats
         << ",\"fare\":" << fixed << setprecision(2) << b.fare
         << ",\"status\":\"" << (b.status == "CONFIRMED" ? "confirmed" : "cancelled")
         << "\",\"paymentStatus\":\"" << (b.status == "CONFIRMED" ? "paid" : "refunded")
         << "\",\"refundAmount\":" << b.refund;
    if (!b.passengerDetailsJson.empty()) cout << ",\"passengerDetails\":" << b.passengerDetailsJson;
    if (t) cout << ",\"train\":{\"name\":\"" << jsonEscape(t->name) << "\",\"source\":\""
                << jsonEscape(t->source) << "\",\"destination\":\"" << jsonEscape(t->destination)
                << "\",\"departureTime\":\"" << t->departure << "\",\"arrivalTime\":\"" << t->arrival << "\"}";
    cout << "}";
}
int main(int argc, char** argv) {
    if (argc < 2 || string(argv[1]) != "--api" || argc < 3) {
        cerr << "Usage: railway_engine --api <search|book|history|pnr|cancel> ...\n"; return 2;
    }
    const string cmd = argv[2];
    vector<Train> trains = loadTrains();
    vector<Booking> bookings = loadBookings();
    if (cmd == "search") {
        if (argc != 6) { cerr << "search requires source destination date"; return 2; }
        string source = argv[3], destination = argv[4], date = argv[5];
        if (!withinProjectBookingHorizon(date)) { cerr << "HTTP 400: Journey date must be between today and 240 days ahead (project demo booking window)"; return 2; }
        auto matches = searchTrains(trains, source, destination);
        cout << "{\"source\":\"" << jsonEscape(source) << "\",\"destination\":\"" << jsonEscape(destination) << "\",\"journeyDate\":\"" << date << "\",\"demoData\":true,\"journeys\":[";
        bool first = true;
        for (const Train* t : matches) {
            if (!first) cout << ',';
            first = false;
            int sl = max(0, t->sleeperTotal - bookedSeats(bookings,t->number,date,"Sleeper"));
            int ac = max(0, t->acTotal - bookedSeats(bookings,t->number,date,"AC"));
            int gn = max(0, t->generalTotal - bookedSeats(bookings,t->number,date,"General"));
            cout << "{\"trainNumber\":\"" << t->number << "\",\"name\":\"" << jsonEscape(t->name)
                 << "\",\"source\":\"" << jsonEscape(t->source) << "\",\"destination\":\"" << jsonEscape(t->destination)
                 << "\",\"departureTime\":\"" << t->departure << "\",\"arrivalTime\":\"" << t->arrival
                 << "\",\"availability\":{\"SLEEPER\":" << sl << ",\"AC3\":" << ac << ",\"AC2\":" << ac << ",\"FIRST_AC\":" << ac << ",\"GENERAL\":" << gn
                 << "},\"fares\":{\"SLEEPER\":" << t->sleeperFare << ",\"AC3\":" << t->acFare << ",\"AC2\":" << t->acFare << ",\"FIRST_AC\":" << t->acFare << ",\"GENERAL\":" << t->generalFare << "}}";
        }
        cout << "]}"; return 0;
    }
    if (cmd == "book") {
        if (argc != 11) { cerr << "book requires email trainNumber date class namesBase64 payment berth detailsBase64"; return 2; }
        string email=argv[3], date=argv[5], rawClass=argv[6], payment=argv[8], berth=argv[9];
        int trainNo=0; try { trainNo=stoi(argv[4]); } catch (...) { cerr << "Invalid train number"; return 2; }
        string className=classMap(rawClass);
        vector<string> names=splitLines(b64decode(argv[7]));
        if (email.empty() || email.find('|')!=string::npos || !withinProjectBookingHorizon(date) || !className.size() || names.empty() || names.size()>6) { cerr << "Invalid booking details"; return 2; }
        const Train* t=findTrain(trains,trainNo); if (!t) { cerr << "HTTP 404: Train is not in the C++ engine catalogue"; return 1; }
        string today=[&](){time_t n=time(nullptr);tm*x=localtime(&n);char d[11];strftime(d,sizeof(d),"%Y-%m-%d",x);return string(d);}();
        string nowTime=[&](){time_t n=time(nullptr);tm*x=localtime(&n);char d[6];strftime(d,sizeof(d),"%H:%M",x);return string(d);}();
        if(date==today && t->departure <= nowTime){cerr << "HTTP 400: This train has already departed for the selected date"; return 1;}
        int available=totalForClass(*t,className)-bookedSeats(bookings,trainNo,date,className);
        if (static_cast<int>(names.size())>available) { cerr << "HTTP 409: Insufficient seats"; return 1; }
        long long pnr=generatePNR(bookings); if (!pnr) { cerr << "Unable to generate PNR"; return 500; }
        string passengerText; for(size_t i=0;i<names.size();++i){if(i)passengerText += "; ";passengerText += names[i];}
        Booking b; b.pnr=pnr; b.passenger=clean(passengerText); b.trainNumber=trainNo; b.trainDate=date; b.className=className; b.seats=(int)names.size(); b.berth=berth; b.paymentMode=paymentMap(payment); b.fare=fareForClass(*t,className)*b.seats; b.status="CONFIRMED"; b.refund=0; b.ownerContact=email; b.passengerDetailsJson=clean(b64decode(argv[10]));
        bookings.push_back(b); if(!saveBookings(bookings)){bookings.pop_back();cerr<<"Could not persist booking";return 500;}
        audit("BOOKING_CONFIRMED_WEB",pnr,trainNo); emitBooking(b,t); return 0;
    }
    if (cmd == "admin-bookings") {
        cout << "["; bool first=true;
        for(const auto& b:bookings){if(!first)cout<<',';first=false;emitBooking(b,findTrain(trains,b.trainNumber));}
        cout << "]"; return 0;
    }
    if (cmd == "history") {
        if (argc != 4) return 2;
        string email=argv[3]; cout << "["; bool first=true;
        for(const auto& b:bookings) if(b.ownerContact==email){if(!first)cout<<',';first=false;emitBooking(b,findTrain(trains,b.trainNumber));}
        cout << "]"; return 0;
    }
    if (cmd == "pnr") {
        if (argc != 5) return 2;
        string email=argv[3], value=argv[4];
        for(const auto& b:bookings) if(to_string(b.pnr)==value && b.ownerContact==email){emitBooking(b,findTrain(trains,b.trainNumber));return 0;}
        cerr << "HTTP 404: PNR not found for this account"; return 1;
    }
    if (cmd == "cancel") {
        if (argc != 5) return 2;
        string email=argv[3], value=argv[4];
        for(auto& b:bookings) if(to_string(b.pnr)==value && b.ownerContact==email){
            if(b.status!="CONFIRMED"){cerr<<"Booking is already cancelled";return 409;}
            const Train* t=findTrain(trains,b.trainNumber);
            string today=[&](){time_t n=time(nullptr);tm*x=localtime(&n);char d[11];strftime(d,sizeof(d),"%Y-%m-%d",x);return string(d);}();
            string nowTime=[&](){time_t n=time(nullptr);tm*x=localtime(&n);char d[6];strftime(d,sizeof(d),"%H:%M",x);return string(d);}();
            if(b.trainDate < today || (b.trainDate == today && t && t->departure <= nowTime)){cerr<<"HTTP 400: Cancellation is not allowed after departure";return 1;}
            b.refund=b.fare*0.90; b.status="CANCELLED"; if(!saveBookings(bookings)){b.status="CONFIRMED";b.refund=0;cerr<<"Could not persist cancellation";return 500;}
            audit("BOOKING_CANCELLED_WEB",b.pnr,b.trainNumber); emitBooking(b,t); return 0;
        }
        cerr << "HTTP 404: PNR not found for this account"; return 1;
    }
    cerr << "Unknown command"; return 2;
}
