'use strict';

const fs = require('fs');
const path = require('path');
const { discoverSkills } = require('./discover');
const { loadManifest } = require('./manifest');
const { resolveTargetBase } = require('./paths');
const { renderClaudeLike } = require('./renderers/claude');
const { renderCopilot } = require('./renderers/copilot');
const { renderCodex } = require('./renderers/codex');
const { installRenderedFiles } = require('./install');

const REPO_ROOT = path.resolve(__dirname, '..');
const SKILLS_DIR = path.join(REPO_ROOT, 'skills');
const TEMPLATE_DIR = path.join(REPO_ROOT, 'templates', 'skill');
const SUPPORTED_AGENTS = ['claude', 'qwen', 'copilot', 'codex'];

function scaffoldSkill({ root, name, templateDir = TEMPLATE_DIR }) {
  if (!/^[a-z][a-z0-9-]*$/.test(name)) {
    throw new Error('Skill name must be lowercase kebab-case');
  }
  if (!fs.existsSync(templateDir)) {
    throw new Error(`Template directory not found: ${templateDir}`);
  }

  const targetDir = path.join(root, 'skills', name);
  if (fs.existsSync(targetDir)) {
    throw new Error(`Skill already exists: ${targetDir}`);
  }
  fs.mkdirSync(targetDir, { recursive: true });

  for (const fileName of fs.readdirSync(templateDir)) {
    const source = path.join(templateDir, fileName);
    const target = path.join(targetDir, fileName);
    const content = fs.readFileSync(source, 'utf8').replace(/\{\{skill-name\}\}/g, name);
    fs.writeFileSync(target, content, 'utf8');
  }

  return targetDir;
}

function rendererFor(agent) {
  switch (agent) {
    case 'claude':
    case 'qwen':
      return renderClaudeLike;
    case 'copilot':
      return renderCopilot;
    case 'codex':
      return renderCodex;
    default:
      throw new Error(`Unsupported agent: ${agent}`);
  }
}

function loadReferences(skillDir) {
  const referencesDir = path.join(skillDir, 'references');
  if (!fs.existsSync(referencesDir)) return [];
  return fs.readdirSync(referencesDir)
    .filter((name) => fs.statSync(path.join(referencesDir, name)).isFile())
    .map((name) => ({
      name,
      content: fs.readFileSync(path.join(referencesDir, name), 'utf8')
    }));
}

function parseArgs(argv) {
  const result = { positional: [], all: false, force: false, scope: null, agent: null, target: null };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--all') {
      result.all = true;
    } else if (arg === '--force' || arg === '-f') {
      result.force = true;
    } else if (arg === '--user' || arg === '-u') {
      result.scope = 'user';
    } else if (arg === '--project' || arg === '-p') {
      result.scope = 'project';
    } else if (arg === '--agent' || arg === '-a') {
      result.agent = argv[++i];
    } else if (arg.startsWith('--agent=')) {
      result.agent = arg.slice('--agent='.length);
    } else if (arg === '--target' || arg === '-t') {
      result.target = argv[++i];
    } else if (arg.startsWith('--target=')) {
      result.target = arg.slice('--target='.length);
    } else if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (!arg.startsWith('-')) {
      result.positional.push(arg);
    } else {
      throw new Error(`Unknown flag: ${arg}`);
    }
  }
  return result;
}

function commandList() {
  const skills = discoverSkills(SKILLS_DIR);
  if (skills.length === 0) {
    console.log('No skills found.');
    return;
  }
  console.log(`Found ${skills.length} skill${skills.length === 1 ? '' : 's'}:\n`);
  for (const skill of skills) {
    console.log(`  ${skill.name}`);
    const desc = skill.description.length > 120
      ? skill.description.slice(0, 117) + '...'
      : skill.description;
    console.log(`    ${desc}\n`);
  }
}

function commandInstall(args) {
  const { agent, scope, target, force, all, positional } = args;

  if (!agent) {
    throw new Error('--agent is required. Choose one of: ' + SUPPORTED_AGENTS.join(', '));
  }
  if (!SUPPORTED_AGENTS.includes(agent)) {
    throw new Error(`Unsupported agent: ${agent}. Choose one of: ${SUPPORTED_AGENTS.join(', ')}`);
  }

  const skills = discoverSkills(SKILLS_DIR);
  if (skills.length === 0) {
    throw new Error(`No skills found in ${SKILLS_DIR}`);
  }

  let toInstall;
  if (all) {
    toInstall = skills;
  } else {
    const skillName = positional[0];
    if (!skillName) {
      throw new Error('Skill name required. Use `install <skill>` or `install --all`.');
    }
    const match = skills.find((s) => s.name === skillName);
    if (!match) {
      throw new Error(`Skill not found: ${skillName}. Available: ${skills.map((s) => s.name).join(', ')}`);
    }
    toInstall = [match];
  }

  const effectiveScope = scope || 'user';
  const targetBase = resolveTargetBase({
    agent,
    scope: effectiveScope,
    customTarget: target
  });

  const renderer = rendererFor(agent);

  for (const skill of toInstall) {
    const manifest = loadManifest(skill.manifestPath);
    const agentConfig = manifest.agents[agent];
    if (!agentConfig || !agentConfig.enabled) {
      throw new Error(`Skill "${skill.name}" is not enabled for agent "${agent}" in its manifest.`);
    }

    const content = fs.readFileSync(skill.skillPath, 'utf8');
    const references = loadReferences(skill.dir);
    const files = renderer({
      skill: { name: skill.name, content, references, manifest }
    });

    installRenderedFiles({ targetBase, files, force });
    console.log(`Installed ${skill.name} → ${targetBase} (${files.length} file${files.length === 1 ? '' : 's'})`);
  }
}

function commandNew(args) {
  const name = args.positional[0];
  if (!name) {
    throw new Error('Usage: matt-daily-skills new <skill>');
  }
  const targetDir = scaffoldSkill({ root: REPO_ROOT, name });
  console.log(`Scaffolded skill: ${targetDir}`);
  console.log('Next: edit SKILL.md (especially the description — that is the trigger) and manifest.json.');
}

function printHelp() {
  process.stdout.write(`matt-daily-skills — canonical multi-agent skill library

Usage:
  matt-daily-skills list
  matt-daily-skills install <skill> --agent <agent> [options]
  matt-daily-skills install --all --agent <agent> [options]
  matt-daily-skills new <skill>

Install options:
  -a, --agent <agent>     Target agent: claude | copilot | qwen | codex (required)
  -u, --user              User-level install (default)
  -p, --project           Project-level install
  -t, --target <dir>      Custom install directory
  -f, --force             Overwrite existing files
`);
}

function run(argv) {
  argv = argv || [];
  if (argv.length === 0 || argv[0] === 'help' || argv[0] === '--help' || argv[0] === '-h') {
    printHelp();
    return;
  }

  const command = argv[0];
  const rest = argv.slice(1);

  try {
    const args = parseArgs(rest);
    if (args.help) {
      printHelp();
      return;
    }
    switch (command) {
      case 'list':
        commandList();
        break;
      case 'install':
        commandInstall(args);
        break;
      case 'new':
        commandNew(args);
        break;
      default:
        throw new Error(`Unknown command: ${command}. Run with --help for usage.`);
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exitCode = 1;
  }
}

module.exports = { run, scaffoldSkill, rendererFor, parseArgs };
