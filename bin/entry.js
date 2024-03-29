const program = require('commander');
const fs = require('fs');
const path = require('path');
const { build } = require('../src/commands/build');
const config = require('../src/commands/config');
const init = require('../src/commands/init');
const publish = require('../src/commands/publish');

// Modify if we depoly our debugger into different places
let json = fs.readFileSync(path.join(`${path.dirname(__dirname)}/package.json`),'utf-8');
let version = JSON.parse(json).version;

program
    .version(version, '-v, --version')
    .on('--help', function () {
        console.log('');
        console.log('Examples:');
        console.log('  0. mkdir yourProject & cd yourProject    Prepare an empty directory');
        console.log('  1. sharklet-cli init                  Initialize and coding with sharklet.js');
        console.log('  2. sharklet-cli config                Config with your wangsu access');
        console.log('  3. sharklet-cli build                 Build code and you can test with gray env');
        console.log('  4. sharklet-cli publish               Publish code only when you are ready online');
    });

program
    .command('init')
    .description('Initialize project with the default sample')
    .action(init);

program
    .command('config')
    .option('-s, --show', 'show existed config')
    .description('Config project before build and publish')
    .action(config)

program
    .command('build')
    .option('-s, --show', 'show build configs')
    .option('-d, --delete', 'delete existed build')
    .description('Build code, check synax and publish to remote gray environment')
    .action(build)

program
    .command('publish')
    .option('-s, --show', 'show published code')
    .option('-d, --delete', 'delete published code')
    .description('Publish code to remote environment')
    .action(publish)
    
program.parse(process.argv);
