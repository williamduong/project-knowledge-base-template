#!/usr/bin/env node

// Load .env before anything else — silently ignored if file not present
require('dotenv').config();

const { run } = require('../src/cli');

run(process.argv.slice(2)).catch((error) => {
  const message = error && error.message ? error.message : String(error);
  console.error(`kbx: ${message}`);
  process.exitCode = 1;
});