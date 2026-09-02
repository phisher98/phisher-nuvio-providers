const fs = require('fs');
const path = require('path');

const providersDir = path.join(__dirname, 'src', 'providers');
const files = fs.readdirSync(providersDir).filter(f => f.endsWith('.js'));

async function testAll() {
  const results = { passed: [], failed: [], error: [] };
  
  for (const file of files) {
    console.log(`\nTesting ${file}...`);
    try {
      const provider = require(path.join(providersDir, file));
      
      if (typeof provider.getStreams !== 'function') {
        results.error.push(file);
        continue;
      }
      
      // Test Movie (Inception)
      let streams = await provider.getStreams('27205', 'movie', 1, 1).catch(() => []);
      
      // If no streams, test Anime (One Punch Man)
      if (!streams || streams.length === 0) {
        streams = await provider.getStreams('37806', 'tv', 1, 1).catch(() => []);
      }
      
      if (Array.isArray(streams) && streams.length > 0) {
        console.log(`✅ ${file} passed!`);
        results.passed.push(file);
      } else {
        console.log(`⚠️ ${file} returned 0 streams.`);
        results.failed.push(file);
      }
    } catch (e) {
      console.log(`❌ ${file} error: ${e.message}`);
      results.error.push(file);
    }
  }
  
  console.log("\n==============================");
  console.log(`Passed: ${results.passed.length}`);
  console.log(`Failed: ${results.failed.length}`);
  console.log(`Error: ${results.error.length}`);
  console.log("==============================");
}

testAll();
