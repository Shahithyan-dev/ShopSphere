require('dotenv').config();
const mongoose = require('mongoose');
const google = require('googlethis');
const Product = require('./models/Product');

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  try {
    console.log('Connecting to MongoDB...');
    require('./config/db');
    await new Promise((resolve) => {
      if (mongoose.connection.readyState === 1) resolve();
      else mongoose.connection.once('open', resolve);
    });
    console.log('Connected to MongoDB.');

    // Find products without an image_url
    const products = await Product.find({ image_url: { $in: [null, ''] } });
    console.log(`Found ${products.length} products without images.`);

    let updatedCount = 0;

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      console.log(`[${i + 1}/${products.length}] Fetching image for: ${product.name}`);
      
      try {
        const query = `${product.name} product high quality`;
        const images = await google.image(query, { safe: false });
        
        if (images && images.length > 0) {
          // Find the first valid-looking image URL
          const validImage = images.find(img => img.url && img.url.startsWith('http'));
          
          if (validImage) {
            product.image_url = validImage.url;
            await product.save();
            updatedCount++;
            console.log(`  -> Updated: ${validImage.url}`);
          } else {
            console.log(`  -> No valid image found.`);
          }
        } else {
          console.log(`  -> No images returned from Google.`);
        }
      } catch (err) {
        console.error(`  -> Error fetching image:`, err.message);
      }

      // Delay to avoid getting blocked by Google
      await delay(1500);
    }

    console.log(`\nFinished! Successfully updated ${updatedCount} products.`);
    process.exit(0);
  } catch (err) {
    console.error('Script failed:', err);
    process.exit(1);
  }
}

run();
