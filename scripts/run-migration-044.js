const fs = require('fs');
const path = require('path');
const tsConfig = require('../tsconfig.json');
const tsConfigPaths = require('tsconfig-paths');

// Simple .env parser to ensure environment variables are loaded
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  });
}

// Register ts-node
require('ts-node').register({
  compilerOptions: {
    module: 'commonjs',
    moduleResolution: 'node',
    esModuleInterop: true,
  },
  ignore: ['node_modules'],
});

// Register tsconfig-paths to handle @/ imports
tsConfigPaths.register({
  baseUrl: './',
  paths: tsConfig.compilerOptions.paths,
});

// Execute the migration script
require('./apply_migration_044.ts');
