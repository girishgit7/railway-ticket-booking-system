#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
g++ -std=c++17 -Wall -Wextra -pedantic railway_sprint2.cpp -o railway_sprint2
printf 'Build successful. Run with: ./railway_sprint2\\n'
