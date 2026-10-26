# Railway Reservation System — Sprint 1

## Sprint 1 scope implemented
- Search trains by source, destination, and journey date (case-insensitive station matching)
- Display Sleeper, AC, and General availability
- **View ALL trains** in the local demo database, with route, departure/arrival, and seat availability for a chosen date
- **View all cities / destinations** represented in the demo database
- Book seats after checking inventory
- Record passenger name, class, seat count, and berth preference
- Calculate demo fare and record simulated Cash/Card/UPI payment mode
- Generate a unique PNR and display an e-ticket
- Check a booking by PNR
- Persist bookings locally across program restarts
- Append booking events to `audit.log`
- Validate menu choices, seat counts, and date format

## Demo data
The program ships with **41 illustrative train routes across 27 cities/stations**, including Bengaluru, Chennai, New Delhi, Mumbai, Hyderabad, Kolkata, Kochi, Pune, Jaipur, Ahmedabad, Bhopal, Guwahati, and others. These are sample records for a college project, **not real-time or verified railway schedules**.

The program automatically adds newly supplied demo trains to an existing `trains.txt` file by train number, so older installations are upgraded without intentionally discarding existing train records. Keep the text files in the same working directory as the executable.

## Explicitly outside Sprint 1
Passenger registration/login, three-failure account lockout, cancellation/refunds, admin schedule editing, inventory administration, and revenue/occupancy reports are not included. The supplied documents describe these in the overall SRS but do not define a separate Sprint 1 scope, so this build intentionally limits itself to the core search-and-booking flow.

## Build and run

### Windows (MinGW / g++)
Open a terminal in this folder:
```bash
g++ -std=c++17 -Wall -Wextra -pedantic railway_sprint1.cpp -o railway_sprint1.exe
.\railway_sprint1.exe
```

### Linux
```bash
g++ -std=c++17 -Wall -Wextra -pedantic railway_sprint1.cpp -o railway_sprint1
./railway_sprint1
```

## Main menu
1. Search trains and availability
2. Book ticket
3. Check ticket / PNR
4. View ALL trains
5. View all cities / destinations
0. Exit

For option 4, enter a journey date to see availability for every listed route on that date. Option 5 lists all unique locations in the demo data. Booking availability is tracked separately for each train and journey date.
