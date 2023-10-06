#!/usr/bin/env node

import fetch from "node-fetch";
import { lookup } from "node:dns/promises"

async function main() {
  const hostname = process.argv[2];
  if (!hostname) {
    console.error("Usage: pnpm client [hostname]");
    process.exit(1);
  }

  repeat(async () => await requestHostname(hostname), 1000);
}

const state: Record<string, number> = {};

/**
 * Issues a single request against the given IP address
 * Maintains and represents stats for all requests
 */
async function request(ip: string) {
  const response = await fetch(`http://${ip}`);
  const status = response.status;

  const key = `${ip}|${status}`;
  state[key] = key in state ? state[key] + 1 : 1;

  const report = Object.entries(state)
    .map(([key, count]) => `${key}=${count}`)
    .sort()
    .join(" ");
  const time = new Date().toISOString().slice(11, 19)
  console.log(padRight(`${time} ${ip}`, 24), padRight(`-> ${response.status} ${response.statusText}`, 20), report);
}

/**
 * Resolves a given hostname and issues a single request for each
 * IP address resolved
 */
async function requestHostname(hostname: string) {
  const addresses = await lookup(hostname, { all: true })
  const ips = addresses.map(address => address.address)
  return Promise.all(ips.map(ip => request(ip)))
}

/**
 * Repeatedly invokes a given async function, waiting for the result
 * between each iteration
 * 
 * @param func Async function to execute on each iteration
 * @param ms Milliseconds to wait between repeats
 */
async function repeat(func: () => Promise<any>, ms: number) {
  while (true) {
    await sleep(ms)
    await func()
  }
}

/**
 * Async wait function
 */
async function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(() => resolve(), ms));
}

function padRight(text: string, length: number) {
  while (text.length < length) {
    text += " "
  }
  return text
}

main();