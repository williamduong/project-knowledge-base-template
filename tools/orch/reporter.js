'use strict';

const fs = require('fs');
const path = require('path');

function writeReport(report, outputPath) {
  const out = outputPath
    ? path.resolve(outputPath)
    : path.resolve(`kb-orch-report-${Date.now()}.json`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  return out;
}

module.exports = {
  writeReport,
};
