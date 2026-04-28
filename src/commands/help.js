function runHelp({ packageJson }) {
  console.log(`${packageJson.name} v${packageJson.version}`);
  console.log('');
  console.log('Project Knowledge Base CLI');
  console.log('Author: William Duong (Dương Tấn Nghĩa) <duongtannghia@gmail.com>');
  console.log('');
  console.log('Usage:');
  console.log('  kb help');
  console.log('  kb init [--mode private-git|tracked] [--target <path>] [--brand <name>]');
  console.log('  kb version');
  console.log('');
  console.log('Implemented commands:');
  console.log('  help      Show usage and package information.');
  console.log('  init      Install the KB template into a target workspace and create state.');
  console.log('');
  console.log('Planned commands:');
  console.log('  show      Expose a hidden KB mount into the workspace.');
  console.log('  hide      Remove the visible KB mount while keeping canonical content.');
  console.log('  test      Run deterministic KB integrity and drift checks.');
  console.log('  sync      Reconcile KB content against the source repository baseline.');
  console.log('  update    Upgrade CLI/template version and run KB patch or migration flow.');
}

module.exports = {
  runHelp,
};