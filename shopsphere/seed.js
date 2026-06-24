const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const Product = require('./models/Product');

async function seed() {
  try {
    // 1. Ensure we are connected
    await new Promise((resolve) => {
      if (mongoose.connection.readyState === 1) {
        resolve();
      } else {
        mongoose.connection.once('open', resolve);
      }
    });

    console.log('Seeding products to MongoDB...');

    // 2. Read schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error('schema.sql not found in backend root!');
    }
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');

    // 3. Parse products from schema.sql
    const lines = schemaContent.split('\n');
    let inValuesBlock = false;
    const productLines = [];

    for (let line of lines) {
      const trimmed = line.trim();
      if (trimmed.toUpperCase().startsWith('INSERT INTO PRODUCTS')) {
        inValuesBlock = true;
        continue;
      }
      if (inValuesBlock) {
        if (trimmed.startsWith('--') || !trimmed) {
          continue;
        }
        productLines.push(trimmed);
        if (trimmed.endsWith(';')) {
          inValuesBlock = false;
        }
      }
    }

    console.log(`Found ${productLines.length} product lines in schema.sql`);

    const products = [];
    for (const line of productLines) {
      let cleanLine = line;
      if (cleanLine.startsWith('(')) {
        cleanLine = cleanLine.substring(1);
      }
      if (cleanLine.endsWith('),')) {
        cleanLine = cleanLine.substring(0, cleanLine.length - 2);
      } else if (cleanLine.endsWith(');')) {
        cleanLine = cleanLine.substring(0, cleanLine.length - 2);
      }

      const values = parseSqlLine(cleanLine);
      if (values.length < 8) {
        console.warn('Skipping invalid product line:', line);
        continue;
      }

      const name = values[0];
      const category = values[1];
      const price = parseFloat(values[2]);
      const original_price = values[3] === 'NULL' || values[3] === 'null' ? null : parseFloat(values[3]);
      const rating = parseFloat(values[4]);
      const image_emoji = values[5];
      const description = values[6];
      const stock = parseInt(values[7], 10);

      products.push({
        name,
        category,
        price,
        original_price,
        rating,
        image_emoji,
        description,
        stock,
        created_at: new Date()
      });
    }

    console.log(`Successfully parsed ${products.length} products`);

    // 4. Read add_images.sql and parse image URLs
    const addImagesPath = path.join(__dirname, 'add_images.sql');
    if (fs.existsSync(addImagesPath)) {
      const addImagesContent = fs.readFileSync(addImagesPath, 'utf8');
      const updateLines = addImagesContent.split('\n');
      let updateCount = 0;
      for (const line of updateLines) {
        const trimmed = line.trim();
        if (trimmed.toUpperCase().startsWith('UPDATE PRODUCTS SET IMAGE_URL =')) {
          // SQL format: UPDATE products SET image_url = 'https://...' WHERE name = '...';
          const match = trimmed.match(/UPDATE\s+products\s+SET\s+image_url\s*=\s*'([^']+)'\s+WHERE\s+name\s*=\s*'([^']+)';/i);
          if (match) {
            const imageUrl = match[1];
            const name = match[2];
            const product = products.find(p => p.name === name);
            if (product) {
              product.image_url = imageUrl;
              updateCount++;
            }
          }
        }
      }
      console.log(`Matched and updated image URLs for ${updateCount} products from add_images.sql`);
    } else {
      console.log('add_images.sql not found, skipping image URL updates');
    }

    // 5. Clear existing products and insert new ones
    console.log('Clearing existing products in MongoDB...');
    await Product.deleteMany({});
    console.log('Inserting products into MongoDB...');
    await Product.insertMany(products);
    console.log('Database seeded successfully!');

    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

function parseSqlLine(cleanLine) {
  const values = [];
  let currentVal = '';
  let inString = false;
  let quoteChar = null;

  for (let i = 0; i < cleanLine.length; i++) {
    const char = cleanLine[i];
    if (inString) {
      if (char === '\\') {
        currentVal += cleanLine[i + 1];
        i++;
      } else if (char === quoteChar) {
        inString = false;
        quoteChar = null;
      } else {
        currentVal += char;
      }
    } else {
      if (char === "'" || char === '"') {
        inString = true;
        quoteChar = char;
      } else if (char === ',') {
        values.push(currentVal.trim());
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
  }
  values.push(currentVal.trim());
  return values;
}

// Start connection by importing db config
require('./config/db');
seed();
