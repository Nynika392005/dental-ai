const { execSync } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

console.log('Building mobile app for web...');
try {
  // 1. Build mobile app
  execSync('npx expo export --platform web', { 
    cwd: path.join(__dirname, '../dentai-mobile'),
    stdio: 'inherit' 
  });
  
  // 2. Ensure dist/mobile directory exists in dentai-web
  const targetMobileDir = path.join(__dirname, 'dist/mobile');
  if (fs.existsSync(targetMobileDir)) {
    fs.rmSync(targetMobileDir, { recursive: true, force: true });
  }
  fs.mkdirSync(targetMobileDir, { recursive: true });
  
  // 3. Copy mobile/dist to dentai-web/dist/mobile
  const sourceMobileDir = path.join(__dirname, '../dentai-mobile/dist');
  
  // Helper to recursively copy directories/files
  const copyFolderSync = (from, to) => {
    fs.mkdirSync(to, { recursive: true });
    fs.readdirSync(from).forEach(element => {
      const source = path.join(from, element);
      const target = path.join(to, element);
      if (fs.lstatSync(source).isDirectory()) {
        copyFolderSync(source, target);
      } else {
        fs.copyFileSync(source, target);
      }
    });
  };
  
  copyFolderSync(sourceMobileDir, targetMobileDir);
  console.log('Mobile app copied to web build folder successfully!');
} catch (error) {
  console.error('Mobile app build/copy failed:', error.message);
  process.exit(1);
}

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
