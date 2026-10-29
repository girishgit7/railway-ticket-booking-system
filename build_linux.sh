#!/usr/bin/env sh
set -eu
g++ -std=c++17 -Wall -Wextra -pedantic railway_sprint1.cpp -o railway_sprint2
printf 'Build successful. Run with: ./railway_sprint2\n'
