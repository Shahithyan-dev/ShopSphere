const mongoose = require('mongoose');
const google = require('googlethis');
const Product = require('./models/Product');

async function checkImage(url) {
  try {
    // Some servers block HEAD requests, so we use a quick GET with a tiny timeout 
    // and abort if it's too large, but fetch in Node 18+ has AbortSignal.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    
    const res = await fetch(url, { 
      method: 'GET', 
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: controller.signal 
    });
    
    clearTimeout(timeout);
    
    // We only need the headers, so we can cancel the body download
    const contentType = res.headers.get('content-type');
    if (!res.ok || !contentType || !contentType.startsWith('image/')) {
      return false;
    }
    return true;
  } catch (e) {
    return false;
  }
}

async function run() {
  console.log('Connecting to MongoDB...');
  require('./config/db');
  await new Promise((resolve) => {
    if (mongoose.connection.readyState === 1) resolve();
    else mongoose.connection.once('open', resolve);
  });
  console.log('Connected to MongoDB.');

  const products = await Product.find({});
  console.log(`Checking ${products.length} products for broken images...`);
  
  let fixedCount = 0;

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    let isValid = false;
    
    if (p.image_url) {
      isValid = await checkImage(p.image_url);
    }

    if (!isValid) {
      console.log(`[${i+1}/${products.length}] Image broken or missing for: ${p.name}`);
      try {
        const query = `${p.name} product high quality isolated`;
        const images = await google.image(query, { safe: false });
        let found = false;
        
        if (images && images.length > 0) {
          for (let img of images.slice(0, 5)) { // Check top 5 images
             if (img.url && img.url.startsWith('http')) {
                const imgOk = await checkImage(img.url);
                if (imgOk) {
                  p.image_url = img.url;
                  await p.save();
                  console.log(`  -> Fixed with new Google Image: ${img.url}`);
                  found = true;
                  fixedCount++;
                  break;
                }
             }
          }
        }
        
        if (!found) {
           // Guaranteed fallback to a beautiful placeholder with the product's name
           const shortName = p.name.length > 15 ? p.name.substring(0, 15) + '..' : p.name;
           p.image_url = `https://placehold.co/400x400/eeeeee/7a1530?text=${encodeURIComponent(shortName)}`;
           await p.save();
           console.log(`  -> Fallback placeholder assigned`);
           fixedCount++;
        }
      } catch (err) {
         console.log(`  -> Failed to fetch new image: ${err.message}`);
      }
      
      // Delay to avoid Google rate limit
      await new Promise(r => setTimeout(r, 1500));
    }
  }
  
  console.log(`\nDone! Fixed ${fixedCount} broken or missing images.`);
  process.exit(0);
}

run();
