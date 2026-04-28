function runHelp({ packageJson }) {
  console.log(`${packageJson.name} v${packageJson.version}`);
  console.log('');
  console.log('Project Knowledge Base CLI');
  console.log('Author: William Duong (Dương Tấn Nghĩa) <duongtannghia@gmail.com>');
  console.log('');
  console.log('Usage:');
  console.log('  kb help');
  console.log('  kb init [--mode private-git|tracked] [--target <path>] [--brand <name>]');
  console.log('  kb show');
  console.log('  kb hide');
  console.log('  kb test [--sample <count>]');
  console.log('  kb sync [--accept-baseline]');
  console.log('  kb update [--accept-baseline]');
  console.log('  kb version');
  console.log('');
  console.log('Implemented commands:');
  console.log('  help      Show usage and package information.');
  console.log('  init      Install the KB template into a target workspace and create state.');
  console.log('  show      Expose a hidden KB mount into the workspace (private-git mode).');
  console.log('  hide      Remove the visible KB mount while keeping canonical content (private-git mode).');
  console.log('  test      Run deterministic KB integrity and drift checks.');
  console.log('  sync      Collect drift evidence and update sync state/report.');
  console.log('  update    Sync first, then refresh template version state.');
}

module.exports = {
  runHelp,
};