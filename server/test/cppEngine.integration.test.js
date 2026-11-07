import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const projectRoot = path.resolve(serverRoot, "..");
const source = path.join(serverRoot, "engine", "railway_api.cpp");

function runEngine(binary, cwd, args) {
  return JSON.parse(execFileSync(binary, ["--api", ...args], {
    cwd,
    encoding: "utf8",
    timeout: 10_000,
  }));
}

test("C++ engine supports search, booking, history, PNR and cancellation across restarts", () => {
  const temp = mkdtempSync(path.join(os.tmpdir(), "railway-cpp-test-"));
  const binary = path.join(temp, process.platform === "win32" ? "railway_engine.exe" : "railway_engine");
  try {
    execFileSync("g++", ["-std=c++17", "-O2", source, "-o", binary], {
      cwd: projectRoot,
      stdio: "pipe",
      timeout: 60_000,
    });

    const date = new Date();
    date.setDate(date.getDate() + 10);
    const journeyDate = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
    const search = runEngine(binary, temp, ["search", "Bengaluru", "Chennai", journeyDate]);
    assert.ok(search.journeys.length > 0, "demo catalogue should contain Bengaluru–Chennai trains");

    const email = "cpp-test@example.invalid";
    const passengerNames = Buffer.from("Test Passenger").toString("base64");
    const passengerDetails = Buffer.from(JSON.stringify([
      { name: "Test Passenger", age: 21, gender: "unspecified", berthPreference: "no-preference" },
    ])).toString("base64");

    const booked = runEngine(binary, temp, [
      "book", email, "12007", journeyDate, "AC3",
      passengerNames, "UPI", "no-preference", passengerDetails,
    ]);
    assert.match(booked.pnr, /^\d{10}$/);
    assert.equal(booked.status, "confirmed");
    assert.equal(booked.travelClass, "AC", "the current C++ engine stores all AC tiers in one shared AC inventory");

    const history = runEngine(binary, temp, ["history", email]);
    assert.equal(history.length, 1);
    assert.equal(history[0].pnr, booked.pnr);

    // A fresh process reads the persisted flat files, proving restart persistence.
    const afterRestart = runEngine(binary, temp, ["pnr", email, booked.pnr]);
    assert.equal(afterRestart.pnr, booked.pnr);

    const cancelled = runEngine(binary, temp, ["cancel", email, booked.pnr]);
    assert.equal(cancelled.status, "cancelled");
    assert.ok(cancelled.refundAmount > 0);

    const finalHistory = runEngine(binary, temp, ["history", email]);
    assert.equal(finalHistory[0].status, "cancelled");
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});
