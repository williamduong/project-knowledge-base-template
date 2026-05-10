#!/usr/bin/env node
/**
 * HTML Report Generator for v2.7 Manual Tests
 * Converts JSON test results to visual HTML report for team review
 */

const fs = require('fs');
const path = require('path');

function generateHTMLReport(jsonFile, outputFile) {
  const data = JSON.parse(fs.readFileSync(jsonFile, 'utf-8'));
  
  const passRate = ((data.total_passed / data.total_tests) * 100).toFixed(1);
  const failureRate = ((data.total_failed / data.total_tests) * 100).toFixed(1);

  // Generate suite rows
  const suiteRows = data.suites.map(suite => {
    const suitePassRate = ((suite.passed / suite.total) * 100).toFixed(1);
    return `
    <tr class="suite-row">
      <td colspan="6" class="suite-name">
        <strong>${suite.suite}</strong>
        <span class="suite-stats">${suite.passed}/${suite.total} passed</span>
      </td>
    </tr>
    ${suite.results.map(test => `
    <tr class="test-row ${test.status.toLowerCase()}">
      <td>${test.status === 'PASS' ? '✓' : test.status === 'FAIL' ? '✗' : '⚠'}</td>
      <td><code>${test.id}</code></td>
      <td><strong>${test.name}</strong></td>
      <td><span class="severity ${test.severity}">${test.severity}</span></td>
      <td>${test.duration_ms}ms</td>
      <td class="message-cell">${test.message || (test.status === 'ERROR' ? test.error_stack : '')}</td>
    </tr>
    `).join('')}
    `;
  }).join('');

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>v2.7 Manual Test Report</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      overflow: hidden;
    }

    header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px;
      text-align: center;
    }

    header h1 {
      font-size: 2.5em;
      margin-bottom: 10px;
    }

    header .meta {
      font-size: 0.9em;
      opacity: 0.9;
    }

    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      padding: 30px;
      background: #f8f9fa;
      border-bottom: 1px solid #e0e0e0;
    }

    .summary-card {
      text-align: center;
      padding: 20px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }

    .summary-card .number {
      font-size: 2.5em;
      font-weight: bold;
      margin: 10px 0;
    }

    .summary-card .label {
      font-size: 0.9em;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .summary-card.passed .number {
      color: #27ae60;
    }

    .summary-card.failed .number {
      color: #e74c3c;
    }

    .summary-card.error .number {
      color: #f39c12;
    }

    .summary-card.duration .number {
      color: #3498db;
    }

    .results {
      padding: 0;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.95em;
    }

    thead {
      background: #f8f9fa;
      position: sticky;
      top: 0;
    }

    thead th {
      padding: 15px;
      text-align: left;
      font-weight: 600;
      color: #333;
      border-bottom: 2px solid #e0e0e0;
      text-transform: uppercase;
      font-size: 0.85em;
      letter-spacing: 0.5px;
    }

    tbody tr {
      border-bottom: 1px solid #e0e0e0;
      transition: background 0.2s;
    }

    tbody tr:hover {
      background: #f8f9fa;
    }

    .test-row td {
      padding: 12px 15px;
    }

    .test-row.pass {
      border-left: 4px solid #27ae60;
    }

    .test-row.pass td:first-child {
      color: #27ae60;
      font-weight: bold;
    }

    .test-row.fail {
      border-left: 4px solid #e74c3c;
      background: #ffebee;
    }

    .test-row.fail td:first-child {
      color: #e74c3c;
      font-weight: bold;
    }

    .test-row.error {
      border-left: 4px solid #f39c12;
      background: #fff3e0;
    }

    .test-row.error td:first-child {
      color: #f39c12;
      font-weight: bold;
    }

    .suite-row {
      background: linear-gradient(90deg, #f5f5f5 0%, #ffffff 100%);
    }

    .suite-row td {
      padding: 12px 15px;
      font-weight: 600;
      border-top: 2px solid #ddd;
    }

    .suite-name {
      display: flex !important;
      justify-content: space-between;
      align-items: center;
    }

    .suite-stats {
      background: #667eea;
      color: white;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 0.85em;
      margin-left: 10px;
    }

    code {
      background: #f5f5f5;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
    }

    .severity {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 0.8em;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .severity.critical {
      background: #ffebee;
      color: #c62828;
    }

    .severity.high {
      background: #fff3e0;
      color: #e65100;
    }

    .severity.medium {
      background: #e3f2fd;
      color: #1565c0;
    }

    .severity.low {
      background: #f3e5f5;
      color: #6a1b9a;
    }

    .message-cell {
      font-size: 0.9em;
      color: #666;
      word-break: break-word;
      max-width: 300px;
    }

    footer {
      background: #f8f9fa;
      padding: 20px;
      text-align: center;
      color: #666;
      font-size: 0.9em;
      border-top: 1px solid #e0e0e0;
    }

    .progress-bar {
      width: 100%;
      height: 8px;
      background: #e0e0e0;
      border-radius: 4px;
      overflow: hidden;
      margin: 10px 0;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #27ae60 0%, #2ecc71 100%);
      border-radius: 4px;
    }

    .warning {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 20px;
      border-radius: 4px;
      color: #856404;
    }

    @media print {
      body {
        background: white;
      }
      .container {
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🧪 v2.7 Manual Test Report</h1>
      <div class="meta">
        Phase 1: Rules + CLI Deep Testing | Generated: ${new Date(data.timestamp).toLocaleString()}
      </div>
    </header>

    <div class="summary">
      <div class="summary-card passed">
        <div class="label">Passed</div>
        <div class="number">${data.total_passed}</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${(data.total_passed / data.total_tests) * 100}%"></div>
        </div>
      </div>
      <div class="summary-card failed">
        <div class="label">Failed</div>
        <div class="number">${data.total_failed}</div>
      </div>
      <div class="summary-card error">
        <div class="label">Errors</div>
        <div class="number">${data.total_errors}</div>
      </div>
      <div class="summary-card">
        <div class="label">Pass Rate</div>
        <div class="number">${passRate}%</div>
      </div>
      <div class="summary-card duration">
        <div class="label">Duration</div>
        <div class="number">${(data.total_duration_ms / 1000).toFixed(1)}s</div>
      </div>
      <div class="summary-card">
        <div class="label">Total Tests</div>
        <div class="number">${data.total_tests}</div>
      </div>
    </div>

    ${data.total_failed > 0 || data.total_errors > 0 ? `
    <div class="warning">
      <strong>⚠️ Issues Found:</strong> ${data.total_failed} failures, ${data.total_errors} errors detected.
      Review detailed results below for investigation.
    </div>
    ` : ''}

    <div class="results">
      <table>
        <thead>
          <tr>
            <th width="5%">Status</th>
            <th width="15%">Test ID</th>
            <th width="25%">Test Name</th>
            <th width="10%">Severity</th>
            <th width="10%">Duration</th>
            <th width="35%">Details</th>
          </tr>
        </thead>
        <tbody>
          ${suiteRows}
        </tbody>
      </table>
    </div>

    <footer>
      <p>Generated by kbx Manual Test Suite v2.7.0-beta.1 | Phase 1: Rules + CLI Testing</p>
      <p>For detailed JSON results, see: <code>test-results-v2.7-phase1.json</code></p>
    </footer>
  </div>
</body>
</html>
  `;

  fs.writeFileSync(outputFile, html);
  return outputFile;
}

if (require.main === module) {
  const jsonFile = process.argv[2] || path.join(__dirname, 'test-results-v2.7-phase1.json');
  const outputFile = process.argv[3] || path.join(__dirname, 'test-report-v2.7-phase1.html');

  if (!fs.existsSync(jsonFile)) {
    console.error(`❌ JSON file not found: ${jsonFile}`);
    process.exit(1);
  }

  try {
    const htmlFile = generateHTMLReport(jsonFile, outputFile);
    console.log(`✅ HTML report generated: ${htmlFile}`);
  } catch (error) {
    console.error(`❌ Error generating report: ${error.message}`);
    process.exit(1);
  }
}

module.exports = { generateHTMLReport };
