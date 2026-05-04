'use strict';

const fs = require('fs');
const path = require('path');

function defaultReportPath() {
  return path.resolve('notes', 'orch-reports', `kb-orch-report-${Date.now()}.json`);
}

function writeReport(report, outputPath) {
  const out = outputPath
    ? path.resolve(outputPath)
    : defaultReportPath();
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  return out;
}

module.exports = {
  writeReport,
};
