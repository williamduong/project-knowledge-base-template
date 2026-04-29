function runHelp({ packageJson }) {
  console.log(`${packageJson.name} v${packageJson.version}`);
  console.log('');
  console.log('Project Knowledge Base CLI');
  console.log('Author: William Duong (Dương Tấn Nghĩa) <duongtannghia@gmail.com>');
  console.log('');
  console.log('Usage:');
  console.log('  kb help');
  console.log('  kb init [--mode private-git|tracked] [--target <path>] [--brand <name>]');
  console.log('          [--skip-adapters] [--install-hooks]');
  console.log('  kb bootstrap [--dry-run] [--no-fill-placeholders]');
  console.log('  kb plan list');
  console.log('  kb plan add "<description>" [--owner <name>] [--priority P0|P1|P2]');
  console.log('  kb show [--backup-existing]');
  console.log('  kb hide [--restore-backup]');
  console.log('  kb test [--sample <count>]');
  console.log('  kb sync [--accept-baseline]');
  console.log('  kb update [--accept-baseline]');
  console.log('  kb doctor [--json] [--strict]');
  console.log('  kb version');
  console.log('');
  console.log('Implemented commands:');
  console.log('  help       Show usage and package information.');
  console.log('  init       Install the KB template into a target workspace and create state.');
  console.log('             --skip-adapters   Skip generating AI IDE adapter files.');
  console.log('             --install-hooks   Install a pre-commit hook that runs kb doctor.');
  console.log('  bootstrap  Scan source code and generate unverified stub docs for');
  console.log('             03-architecture, 05-backend, 06-api, 07-database, 09-operations.');
  console.log('             --dry-run         Preview create/update/skip actions.');
  console.log('             --no-fill-placeholders  Do not replace existing template placeholders.');
  console.log('  plan       Manage the KB finalization plan (finalization-plan.md).');
  console.log('             list              Show pending and done plan items.');
  console.log('             add "<text>"      Append a new todo item with auto-incremented ID.');
  console.log('  show       Expose a hidden KB mount into the workspace (private-git mode).');
  console.log('             Use --backup-existing to move a real directory out of the way safely.');
  console.log('  hide       Remove the visible KB mount while keeping canonical content (private-git mode).');
  console.log('             Use --restore-backup to restore a previous backup directory.');
  console.log('  test       Run deterministic KB integrity and drift checks.');
  console.log('  sync       Collect drift evidence, map source_of_truth changes, and update queue/report.');
  console.log('             Use --accept-baseline to stamp HEAD as new baseline after review.');
  console.log('  update     Sync first, then refresh template version state.');
  console.log('             Use --accept-baseline to propagate sync baseline acceptance.');
  console.log('  doctor     Quick publish-readiness checks (node/git/link/hooks).');
  console.log('             Use --json for machine-readable CI output.');
  console.log('             Use --strict to exit with code 1 on WARN (hard CI gate).');
}

module.exports = {
  runHelp,
};