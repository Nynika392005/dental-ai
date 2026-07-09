const { execSync } = require('child_process');
const path = require('path');
const os = require('os');

// Set CACHE_DIR to system temp directory with a unique timestamp to prevent file locking and git conflicts
const cacheDir = path.join(os.tmpdir(), `gh-pages-cache-${Date.now()}`);
process.env.CACHE_DIR = cacheDir;

console.log(`Starting deployment to GitHub Pages (Cache: ${cacheDir})...`);
try {
  execSync('npx gh-pages -d dist', { stdio: 'inherit' });
  console.log('Deployment completed successfully!');
} catch (error) {
  console.error('Deployment failed:', error.message);
  process.exit(1);
}
