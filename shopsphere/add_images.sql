-- add_images.sql
-- Verified, working Unsplash image URLs for the Electronics category.
-- Every URL below was checked individually (searched + fetched) to confirm
-- the photo exists and matches the product before being added here.
--
-- Usage: mysql -u root -p login_app < add_images.sql

USE login_app;

UPDATE products SET image_url = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400' WHERE name = 'Wireless Bluetooth Headphones';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1434494745656-1aea7daa8f6f?w=400' WHERE name = 'Smartwatch Series 5';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1511499271651-073325718d90?w=400' WHERE name = 'Portable Bluetooth Speaker';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1525446517618-9a9e5430288b?w=400' WHERE name = 'Smartphone 128GB';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1710582218565-5b9e50e3298d?w=400' WHERE name = 'Laptop 15.6 inch Core i5';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=400' WHERE name = 'Tablet 10.4 inch';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=400' WHERE name = 'Noise Cancelling Earbuds';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1646861039459-fd9e3aabf3fb?w=400' WHERE name = '4K Smart LED TV 43 inch';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1495707902641-75cac588d2e9?w=400' WHERE name = 'DSLR Camera 24MP';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1616296425622-4560a2ad83de?w=400' WHERE name = 'Gaming Mouse RGB';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=400' WHERE name = 'Mechanical Keyboard';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=400' WHERE name = 'Power Bank 20000mAh';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1599350686877-382a54114d2f?w=400' WHERE name = 'Smart Home Security Camera';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1593448848024-77a27f0690b1?w=400' WHERE name = 'External Hard Drive 1TB';

-- Appliances, Fashion, Home, and Grocery images have not been sourced yet.
-- Those products will keep showing their emoji icon until image_url is set.
