-- Run this once to set up the database and table.
-- You can execute this file with: mysql -u root -p < schema.sql

CREATE DATABASE IF NOT EXISTS login_app;

USE login_app;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NULL,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  auth_provider VARCHAR(20) NOT NULL DEFAULT 'local',
  google_id VARCHAR(100) NULL UNIQUE,
  facebook_id VARCHAR(100) NULL UNIQUE,
  phone VARCHAR(20) NULL,
  phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- NOTE: is_admin is now LEGACY and unused. Admin access is a single hardcoded
-- username/password baked directly into routes/auth.js (search for
-- ADMIN_USERNAME / ADMIN_PASSWORD in that file). This column is kept for
-- backward compatibility but no longer affects who can log into the admin
-- panel — every regular signup is treated as a non-admin regardless of this
-- flag's value.

-- phone / phone_verified support first-time OTP verification (see routes/otp.js).
-- phone_verified starts FALSE for everyone, including existing accounts created
-- before this column existed — so on their next login, they'll be asked to
-- verify a phone number once. After that, phone_verified flips to TRUE and
-- they're never asked again.

-- If you already had a users table from before these columns existed,
-- run these once to add them without losing existing accounts:
-- ALTER TABLE users MODIFY password_hash VARCHAR(255) NULL;
-- ALTER TABLE users ADD COLUMN auth_provider VARCHAR(20) NOT NULL DEFAULT 'local';
-- ALTER TABLE users ADD COLUMN google_id VARCHAR(100) NULL UNIQUE;
-- ALTER TABLE users ADD COLUMN facebook_id VARCHAR(100) NULL UNIQUE;
-- ALTER TABLE users ADD COLUMN phone VARCHAR(20) NULL;
-- ALTER TABLE users ADD COLUMN phone_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- OTP codes: short-lived, single-use verification codes sent via SMS (Twilio).
-- A new row is created each time an OTP is requested; old/expired rows for
-- the same user can simply pile up (or be cleaned up periodically) since
-- each one is checked against expiry + used status, not relied on to be unique.

-- Drop old versions first so re-running this file always works, even if
-- these tables already exist with an outdated structure. Order matters here:
-- tables with foreign keys pointing at another table must be dropped BEFORE
-- the table they point to (e.g. order_items references products, so
-- order_items must go first, or MySQL refuses to drop products).
DROP TABLE IF EXISTS otp_codes;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS cart_items;
DROP TABLE IF EXISTS products;

CREATE TABLE otp_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  phone VARCHAR(20) NOT NULL,
  code VARCHAR(10) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  category VARCHAR(50) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2),
  rating DECIMAL(2,1) DEFAULT 4.0,
  image_emoji VARCHAR(10) DEFAULT '🛒',
  image_url VARCHAR(500),
  description VARCHAR(255),
  stock INT DEFAULT 100,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cart_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_product (user_id, product_id)
);

-- Orders: one row per checkout attempt. Created as 'created' the moment the
-- Razorpay order is generated, then updated to 'paid' or 'failed' once the
-- payment is verified server-side (see routes/payment.js).
CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  razorpay_order_id VARCHAR(100) NOT NULL UNIQUE,
  razorpay_payment_id VARCHAR(100) NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  status ENUM('created', 'paid', 'failed') NOT NULL DEFAULT 'created',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  paid_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Snapshot of what was actually purchased in each order — kept separate from
-- cart_items so a later price/name change to a product doesn't rewrite history.
CREATE TABLE order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  product_name VARCHAR(150) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  quantity INT NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Sample product data (250 products: 50 per category)
INSERT INTO products (name, category, price, original_price, rating, image_emoji, description, stock) VALUES

-- Electronics (50 products)
('Wireless Bluetooth Headphones', 'Electronics', 2457.50, 2859.93, 4.0, '🎧', 'Over-ear with active noise cancellation, 30-hr battery', 67),
('Smartwatch Series 5', 'Electronics', 3675.61, 4434.15, 4.6, '⌚', 'Fitness tracking, heart rate monitor & notifications', 149),
('Portable Bluetooth Speaker', 'Electronics', 1285.85, 1777.12, 3.6, '🔊', '12-hour battery life, IPX7 waterproof', 65),
('Smartphone 128GB', 'Electronics', 15929.41, 23593.21, 4.3, '📱', '6.5" display, triple camera, 5000mAh battery', 193),
('Laptop 15.6 inch Core i5', 'Electronics', 49497.19, 71756.96, 3.9, '💻', '8GB RAM, 512GB SSD, full HD display', 160),
('Tablet 10.4 inch', 'Electronics', 13111.48, 21347.00, 4.6, '📱', 'Great for reading, browsing & streaming', 50),
('Noise Cancelling Earbuds', 'Electronics', 3545.51, 4740.84, 3.8, '🎧', 'True wireless, touch controls, 24hr case battery', 96),
('4K Smart LED TV 43 inch', 'Electronics', 25816.58, 35083.70, 4.1, '📺', 'Ultra HD, built-in streaming apps, voice remote', 98),
('DSLR Camera 24MP', 'Electronics', 38431.93, 61257.44, 4.5, '📷', 'Interchangeable lens, full HD video recording', 147),
('Gaming Mouse RGB', 'Electronics', 973.77, 1613.79, 3.7, '🖱️', '7200 DPI optical sensor, programmable buttons', 85),
('Mechanical Keyboard', 'Electronics', 3276.40, 4882.44, 4.7, '⌨️', 'Hot-swappable switches, RGB backlight', 157),
('Power Bank 20000mAh', 'Electronics', 1433.41, 1703.26, 4.5, '🔋', 'Fast charging, dual USB output', 84),
('Smart Home Security Camera', 'Electronics', 2784.71, 4512.41, 4.7, '📹', '1080p, night vision, motion alerts via app', 107),
('External Hard Drive 1TB', 'Electronics', 3776.70, 5663.64, 4.1, '💾', 'USB 3.0, compact & portable', 104),
('Wireless Charging Pad', 'Electronics', 976.28, 1482.58, 4.5, '🔌', '10W fast wireless charging, slim design', 184),
('USB-C Hub 7-in-1', 'Electronics', 1951.98, 2898.73, 3.8, '🔌', 'HDMI, USB 3.0, SD card reader, PD charging', 196),
('Action Camera 4K', 'Electronics', 9978.00, 14011.54, 4.0, '📷', 'Waterproof case included, wide-angle lens', 173),
('Smart LED Bulb (Wi-Fi)', 'Electronics', 873.58, 1110.14, 4.0, '💡', '16 million colors, voice assistant compatible', 24),
('Bluetooth Car Adapter', 'Electronics', 813.29, 949.64, 4.0, '🚗', 'Hands-free calls, FM transmitter, dual USB', 78),
('Gaming Headset 7.1 Surround', 'Electronics', 1865.12, 3081.60, 4.3, '🎮', 'Noise-cancelling mic, RGB lighting', 193),
('Webcam 1080p with Mic', 'Electronics', 1618.96, 2445.42, 4.1, '📷', 'Auto-focus, plug and play, built-in privacy cover', 174),
('Smart Plug Wi-Fi', 'Electronics', 636.20, 824.31, 3.9, '🔌', 'Voice control, schedule timers, no hub needed', 153),
('Fitness Band', 'Electronics', 1675.75, 2615.61, 4.2, '⌚', 'Step tracker, sleep monitor, 10-day battery', 159),
('Portable SSD 512GB', 'Electronics', 5797.40, 7366.33, 4.9, '💾', 'USB-C, read speeds up to 1050MB/s', 140),
('Wireless Mouse and Keyboard Combo', 'Electronics', 1394.62, 2183.53, 4.7, '⌨️', '2.4GHz wireless, ergonomic design', 49),
('Drone with HD Camera', 'Electronics', 17135.60, 27170.96, 4.1, '🚁', '30-min flight time, GPS return-to-home', 26),
('Smart Doorbell Camera', 'Electronics', 5268.15, 7784.95, 4.2, '🔔', 'Two-way audio, motion detection, cloud storage', 74),
('Soundbar 2.1 Channel', 'Electronics', 8911.26, 14466.80, 3.6, '🔊', 'Built-in subwoofer, Bluetooth connectivity', 194),
('VR Headset', 'Electronics', 10571.64, 17301.90, 4.6, '🥽', 'Immersive gaming, compatible with major platforms', 174),
('Graphic Tablet for Drawing', 'Electronics', 8019.19, 10516.57, 3.8, '🎨', '8192 pressure levels, battery-free pen', 10),
('Projector Mini LED', 'Electronics', 11813.31, 19276.00, 3.9, '📽️', '1080p support, built-in speaker, HDMI input', 138),
('Bluetooth Sports Earphones', 'Electronics', 1455.42, 2080.12, 3.7, '🎧', 'Sweatproof, magnetic earbuds, 8-hr playback', 170),
('Smart Scale Body Composition', 'Electronics', 1837.46, 2758.80, 4.4, '⚖️', 'BMI, body fat %, syncs to app', 49),
('Router Wi-Fi 6 Dual Band', 'Electronics', 4559.50, 5648.55, 4.8, '📡', 'High-speed mesh-ready, parental controls', 145),
('USB Microphone for Streaming', 'Electronics', 4192.12, 6201.90, 4.2, '🎙️', 'Cardioid pickup, plug and play, mute button', 38),
('Smart Glasses with Audio', 'Electronics', 8320.82, 13590.37, 4.7, '🕶️', 'Open-ear speakers, UV protection lenses', 88),
('Electric Toothbrush Smart', 'Electronics', 2786.10, 3573.12, 4.3, '🪥', 'App connectivity, pressure sensor, 3 modes', 30),
('Mini Fridge for Desk', 'Electronics', 2084.57, 2954.45, 3.7, '❄️', '4L capacity, USB powered, quiet cooling', 146),
('Bluetooth Tracker Tag', 'Electronics', 904.57, 1104.13, 4.2, '📍', 'Find lost items via app, loud alarm', 150),
('Smart Door Lock', 'Electronics', 9659.34, 13911.58, 4.4, '🔐', 'Fingerprint + PIN + app unlock, alerts on entry', 64),
('Laptop Stand Adjustable', 'Electronics', 1555.42, 2434.85, 4.5, '💻', 'Aluminum build, ergonomic height adjustment', 192),
('Monitor 24 inch Full HD', 'Electronics', 10245.55, 17390.10, 4.4, '🖥️', 'IPS panel, 75Hz refresh rate, slim bezel', 122),
('Wireless Presenter Remote', 'Electronics', 1057.95, 1479.35, 3.9, '🖱️', '2.4GHz, works up to 15 meters', 26),
('Smart Pet Feeder', 'Electronics', 4674.83, 6888.69, 3.9, '🐾', 'Scheduled feeding, app control, voice recording', 66),
('Car Dash Camera', 'Electronics', 3009.78, 4632.99, 3.7, '🚗', 'Full HD recording, night vision, loop recording', 27),
('Bluetooth FM Transmitter', 'Electronics', 960.26, 1558.31, 3.7, '📻', 'Dual USB charging, hands-free calling', 70),
('Smart Light Strip RGB', 'Electronics', 1393.66, 1974.79, 4.3, '💡', '5m length, music sync, app & voice control', 195),
('Noise Cancelling Travel Headphones', 'Electronics', 5369.09, 7860.74, 4.2, '🎧', '40-hr battery, foldable design', 131),
('Electric Shaver Rechargeable', 'Electronics', 2805.69, 3520.37, 3.7, '🪒', 'Wet/dry use, 60-min runtime', 120),
('Document Scanner Portable', 'Electronics', 7384.39, 10161.71, 4.7, '🖨️', 'Wireless scanning to phone, battery powered', 23),

-- Appliances (50 products)
('Front Load Washing Machine 7kg', 'Appliances', 29711.88, 50251.43, 3.7, '🧺', 'Inverter motor, 6 wash programs, energy efficient', 113),
('Double Door Refrigerator 350L', 'Appliances', 34823.98, 55381.48, 3.7, '🧊', 'Frost-free, convertible freezer, low noise', 59),
('Microwave Oven 23L Convection', 'Appliances', 9569.44, 13366.00, 4.1, '🍱', 'Grill, bake & reheat with auto-cook menus', 81),
('Air Conditioner 1.5 Ton Split', 'Appliances', 35699.56, 58224.81, 3.7, '❄️', 'Inverter, copper coil, fast cooling', 150),
('Vacuum Cleaner Bagless', 'Appliances', 4694.72, 7082.83, 4.3, '🧹', 'Powerful suction, HEPA filter, lightweight', 13),
('Air Fryer 4L', 'Appliances', 8420.52, 13973.87, 4.7, '🍟', 'Oil-free frying, digital touch panel, 8 presets', 52),
('Mixer Grinder 750W', 'Appliances', 3286.29, 4649.27, 4.7, '🥤', '3 jars, stainless steel blades, overload protection', 25),
('Electric Kettle 1.8L', 'Appliances', 981.15, 1129.49, 4.1, '♨️', 'Auto shut-off, boil-dry protection', 126),
('Water Purifier RO+UV', 'Appliances', 11139.71, 17078.57, 4.5, '🚰', '8-stage purification, 7L storage tank', 152),
('Ceiling Fan 1200mm', 'Appliances', 2361.65, 3348.04, 3.8, '🌀', 'High air delivery, low power consumption', 65),
('Induction Cooktop 2000W', 'Appliances', 2573.00, 3778.58, 4.3, '🔥', 'Touch control, 8 power levels, auto shut-off', 90),
('Hair Dryer 1800W', 'Appliances', 827.53, 1217.54, 4.3, '💨', 'Foldable, 2 heat settings, cool shot button', 145),
('Steam Iron Box', 'Appliances', 1293.30, 2170.71, 3.7, '🧼', 'Non-stick soleplate, variable steam control', 57),
('Geyser 15L Storage', 'Appliances', 7170.23, 8513.78, 4.7, '🚿', 'Rust-proof tank, thermostat control', 113),
('Dishwasher 12 Place Settings', 'Appliances', 28957.97, 47481.17, 3.9, '🍽️', '6 wash programs, low noise operation', 162),
('Toaster 2 Slice', 'Appliances', 1326.78, 1585.62, 4.5, '🍞', 'Variable browning control, removable crumb tray', 154),
('Sandwich Maker', 'Appliances', 1312.15, 2183.53, 3.9, '🥪', 'Non-stick plates, indicator lights', 193),
('Juicer Mixer Grinder 1000W', 'Appliances', 3969.96, 5145.42, 3.8, '🧃', 'Centrifugal juicer, 3-speed control', 175),
('Room Heater Fan Type', 'Appliances', 1738.70, 2301.86, 4.6, '🔥', 'Adjustable thermostat, overheat protection', 28),
('Air Purifier HEPA Filter', 'Appliances', 8026.94, 11973.29, 4.3, '🌬️', 'Covers up to 400 sq ft, 3-stage filtration', 35),
('Pressure Cooker 5L', 'Appliances', 2057.54, 2607.39, 3.9, '🍲', 'Stainless steel, induction compatible', 99),
('Rice Cooker 1.8L', 'Appliances', 3178.98, 5193.18, 4.1, '🍚', 'One-touch cooking, keep-warm function', 50),
('Hand Blender 300W', 'Appliances', 1461.47, 2117.33, 4.0, '🥣', 'Variable speed, stainless steel blades', 177),
('Cooler Desert Air 50L', 'Appliances', 9585.29, 14544.00, 4.3, '🌀', 'High cooling capacity, castor wheels', 179),
('Chimney Kitchen 60cm', 'Appliances', 10413.24, 17004.51, 3.9, '🍳', 'Auto-clean, touch control, 1200 m3/hr suction', 37),
('Slow Cooker 4L', 'Appliances', 3963.40, 4896.77, 4.0, '🍛', '3 heat settings, ceramic pot', 63),
('Egg Boiler Electric', 'Appliances', 985.33, 1243.47, 4.4, '🥚', 'Boils up to 7 eggs, auto shut-off', 77),
('Garment Steamer Handheld', 'Appliances', 1852.28, 2385.95, 4.8, '👔', '30-second heat up, wrinkle removal', 23),
('Water Dispenser Hot and Cold', 'Appliances', 9275.80, 12828.12, 4.0, '🚰', 'Compressor cooling, child safety lock', 10),
('Vacuum Sealer for Food', 'Appliances', 2832.22, 3460.83, 4.9, '📦', 'Keeps food fresh up to 5x longer', 51),
('Electric Grill Indoor', 'Appliances', 3687.74, 5359.85, 4.2, '🍖', 'Non-stick plates, adjustable temperature', 12),
('Bread Maker Automatic', 'Appliances', 6222.64, 10390.43, 4.5, '🍞', '12 programs, 1kg loaf capacity', 48),
('Stand Mixer 5L', 'Appliances', 11180.82, 17990.24, 4.4, '🥧', 'Multiple attachments, 6-speed control', 47),
('Coffee Maker Drip Style', 'Appliances', 3557.29, 4172.72, 4.1, '☕', 'Programmable timer, 1.2L capacity', 20),
('Deep Fryer Electric', 'Appliances', 4846.49, 6133.44, 3.9, '🍤', 'Adjustable thermostat, removable basket', 36),
('Hand Mixer Electric', 'Appliances', 1610.85, 2348.52, 4.7, '🍰', '5-speed settings, stainless steel beaters', 168),
('Wet Grinder Table Top', 'Appliances', 5847.31, 9701.68, 3.9, '🥘', 'Traditional stone grinding, 2L capacity', 51),
('Otg Oven Toaster Griller 30L', 'Appliances', 8438.54, 13467.27, 4.7, '🍕', 'Convection mode, rotisserie function', 16),
('Exhaust Fan 6 inch', 'Appliances', 988.50, 1639.40, 4.6, '🌀', 'Rust-proof body, low noise motor', 115),
('Water Heater Instant 3L', 'Appliances', 4701.55, 7641.12, 4.7, '🚿', 'Compact wall-mounted design', 78),
('Cordless Vacuum Stick', 'Appliances', 7476.43, 11481.58, 4.1, '🧹', '45-min runtime, detachable handheld unit', 19),
('Food Processor 600W', 'Appliances', 6715.33, 8544.17, 4.7, '🥗', 'Multiple blades, large capacity bowl', 127),
('Humidifier Cool Mist', 'Appliances', 2848.31, 4560.98, 4.7, '💧', 'Quiet operation, auto shut-off, 4L tank', 67),
('Electric Chimney 90cm', 'Appliances', 13093.63, 16448.50, 4.0, '🍳', 'Auto-clean technology, baffle filter', 27),
('Mini Oven Microwave 20L', 'Appliances', 8915.26, 11621.21, 4.4, '🍱', 'Compact design, 5 power levels', 112),
('Stabilizer for AC', 'Appliances', 2541.93, 4102.71, 4.0, '⚡', 'Voltage protection, wide working range', 17),
('Cordless Hand Vacuum', 'Appliances', 1891.16, 3184.18, 3.8, '🧹', 'Lightweight, great for car interiors', 77),
('Ironing Board Foldable', 'Appliances', 1625.74, 2403.03, 4.0, '🧼', 'Height adjustable, heat-resistant cover', 90),
('Electric Lint Remover', 'Appliances', 773.12, 1307.60, 3.8, '🧶', 'Rechargeable, dual blade system', 157),
('Smart Wi-Fi Ceiling Fan', 'Appliances', 4840.95, 5685.27, 4.2, '🌀', 'App + voice control, BLDC motor', 143),

-- Fashion (50 products)
('Cotton Casual Shirt', 'Fashion', 1081.38, 1362.58, 3.8, '👔', 'Slim fit, breathable cotton, machine washable', 73),
('Running Shoes', 'Fashion', 2198.73, 2633.24, 4.5, '👟', 'Lightweight cushioned sole, breathable mesh', 145),
('Leather Wallet for Men', 'Fashion', 756.25, 1093.72, 4.8, '👛', 'Genuine leather, RFID protected, 6 card slots', 135),
('Women\'s Floral Dress', 'Fashion', 1478.32, 2287.29, 4.4, '👗', 'A-line fit, soft rayon fabric, knee length', 105),
('Men\'s Denim Jeans', 'Fashion', 2138.27, 3472.17, 3.9, '👖', 'Slim fit stretchable denim, 5-pocket style', 128),
('Women\'s Handbag', 'Fashion', 2391.02, 3867.43, 4.0, '👜', 'Faux leather, spacious compartments, adjustable strap', 193),
('Men\'s Formal Blazer', 'Fashion', 4055.90, 6391.94, 4.2, '🧥', 'Tailored fit, wrinkle-resistant fabric', 113),
('Sports Sneakers', 'Fashion', 1850.14, 2695.42, 4.2, '👟', 'Shock-absorbing sole, ideal for daily training', 102),
('Women\'s Kurti Set', 'Fashion', 1789.67, 2584.05, 4.2, '👘', 'Printed cotton kurti with palazzo, festive wear', 60),
('Sunglasses UV Protected', 'Fashion', 901.15, 1520.41, 4.1, '🕶️', 'Polarized lenses, lightweight frame', 65),
('Men\'s Analog Watch', 'Fashion', 3231.44, 4987.18, 4.6, '⌚', 'Stainless steel strap, water resistant up to 30m', 123),
('Women\'s Heels', 'Fashion', 2093.82, 3539.79, 4.8, '👠', 'Block heel, comfortable padded footbed', 179),
('Kids Hooded Jacket', 'Fashion', 1004.44, 1215.76, 3.8, '🧥', 'Fleece lined, water-resistant outer shell', 185),
('Men\'s Sports T-Shirt', 'Fashion', 917.03, 1095.52, 4.2, '👕', 'Moisture-wicking fabric, breathable mesh panels', 32),
('Women\'s Skinny Jeans', 'Fashion', 1427.48, 2126.32, 4.1, '👖', 'High-waist, stretch denim, 4-way comfort', 44),
('Men\'s Leather Belt', 'Fashion', 807.84, 1018.23, 4.6, '👔', 'Genuine leather, reversible buckle', 24),
('Women\'s Cardigan Sweater', 'Fashion', 1546.66, 2155.48, 4.3, '🧥', 'Soft knit, button-down front, casual wear', 42),
('Men\'s Sports Shorts', 'Fashion', 640.17, 980.90, 4.8, '🩳', 'Quick-dry fabric, elastic waistband with drawstring', 43),
('Women\'s Sandals', 'Fashion', 1241.39, 1918.07, 4.6, '👡', 'Comfortable flat sole, adjustable straps', 48),
('Men\'s Hoodie Pullover', 'Fashion', 1784.82, 2453.35, 3.7, '🧥', 'Fleece lined, kangaroo pocket, ribbed cuffs', 46),
('Women\'s Maxi Skirt', 'Fashion', 1205.89, 2044.12, 4.1, '👗', 'Flowy fabric, elastic waistband, ankle length', 63),
('Men\'s Polo T-Shirt', 'Fashion', 1138.33, 1508.87, 4.2, '👕', 'Pique cotton, classic collar, regular fit', 69),
('Women\'s Crop Top', 'Fashion', 744.30, 903.93, 4.7, '👚', 'Ribbed fabric, casual everyday wear', 57),
('Men\'s Chinos Trousers', 'Fashion', 1740.98, 2482.08, 3.6, '👖', 'Slim fit, wrinkle-resistant cotton blend', 22),
('Women\'s Earrings Set', 'Fashion', 533.64, 724.33, 4.0, '💎', 'Gold-plated, set of 3 pairs, hypoallergenic', 112),
('Men\'s Sneakers Casual', 'Fashion', 1745.96, 2789.22, 4.3, '👟', 'Canvas upper, rubber sole, lace-up', 56),
('Women\'s Saree Cotton', 'Fashion', 2853.60, 4730.33, 4.5, '🥻', 'Handloom weave, contrast border, 6 yards', 112),
('Men\'s Winter Jacket', 'Fashion', 3654.46, 4665.34, 4.7, '🧥', 'Water-resistant shell, quilted lining', 67),
('Women\'s Clutch Bag', 'Fashion', 1025.03, 1353.92, 4.7, '👛', 'Embellished design, magnetic snap closure', 194),
('Men\'s Formal Shoes', 'Fashion', 2606.80, 4093.19, 4.5, '👞', 'Genuine leather, lace-up, cushioned insole', 192),
('Women\'s Leggings', 'Fashion', 598.64, 786.02, 4.6, '🩱', '4-way stretch, high-waist, squat-proof', 30),
('Kids Cotton T-Shirt Pack of 3', 'Fashion', 1139.38, 1574.18, 4.8, '👕', 'Soft cotton, fun prints, machine washable', 27),
('Men\'s Track Pants', 'Fashion', 1200.39, 1979.40, 4.7, '👖', 'Slim fit joggers, zippered pockets', 132),
('Women\'s Denim Jacket', 'Fashion', 2131.71, 3541.64, 3.9, '🧥', 'Classic fit, button front, washed finish', 84),
('Men\'s Casual Cap', 'Fashion', 450.92, 681.80, 4.4, '🧢', 'Adjustable strap, cotton twill fabric', 82),
('Women\'s Hair Accessories Set', 'Fashion', 393.36, 599.12, 4.7, '💇', 'Clips, bands & scrunchies combo pack', 168),
('Men\'s Boxer Briefs Pack of 5', 'Fashion', 865.05, 1204.18, 4.1, '🩲', 'Breathable cotton, elastic waistband', 60),
('Women\'s Yoga Pants', 'Fashion', 1005.88, 1525.80, 4.5, '🧘', 'Moisture-wicking, 4-way stretch fabric', 59),
('Men\'s Rain Jacket', 'Fashion', 2689.44, 4080.69, 4.6, '🧥', 'Waterproof, packable, hooded design', 76),
('Women\'s Anklets Pair', 'Fashion', 379.78, 591.95, 4.7, '✨', 'Silver-toned, adjustable chain', 69),
('Men\'s Pyjama Set', 'Fashion', 761.89, 1237.28, 4.5, '🛌', 'Soft cotton, drawstring waist, breathable', 10),
('Women\'s Tote Bag Canvas', 'Fashion', 643.82, 928.69, 3.6, '👜', 'Spacious, durable canvas, inner pocket', 89),
('Men\'s Sports Socks Pack of 5', 'Fashion', 683.02, 1152.98, 4.9, '🧦', 'Cushioned sole, breathable mesh', 140),
('Women\'s Bodycon Dress', 'Fashion', 2104.60, 2934.37, 3.9, '👗', 'Stretch fabric, party wear, knee length', 199),
('Men\'s Sunglasses Aviator', 'Fashion', 907.00, 1322.59, 4.4, '🕶️', 'UV400 protection, metal frame', 171),
('Women\'s Ballet Flats', 'Fashion', 1396.49, 2071.37, 4.0, '🥿', 'Soft cushioned sole, slip-on design', 199),
('Men\'s Ethnic Kurta', 'Fashion', 1215.47, 1468.09, 4.0, '👘', 'Cotton blend, festive embroidery', 158),
('Women\'s Statement Necklace', 'Fashion', 611.75, 723.13, 4.0, '💍', 'Gold-toned, layered chain design', 152),
('Kids School Backpack', 'Fashion', 1374.21, 2117.66, 4.3, '🎒', 'Padded straps, multiple compartments', 59),
('Men\'s Linen Shirt', 'Fashion', 1627.91, 2760.12, 4.6, '👔', 'Breathable linen blend, summer wear', 112),

-- Home (50 products)
('Stainless Steel Water Bottle', 'Home', 545.52, 706.80, 4.0, '🍶', '1 litre, keeps cold 24 hrs', 43),
('Non-Stick Frying Pan', 'Home', 958.81, 1560.33, 4.5, '🍳', '28cm, induction compatible', 109),
('Ceramic Dinner Set 18pcs', 'Home', 2300.38, 3852.87, 3.8, '🍽️', 'Microwave & dishwasher safe', 74),
('Cotton Bedsheet Double', 'Home', 1144.12, 1607.19, 4.7, '🛏️', 'King size, 300 thread count, includes 2 pillow covers', 189),
('Memory Foam Pillow', 'Home', 1028.21, 1649.93, 4.8, '🛏️', 'Orthopedic cervical support, washable cover', 132),
('Bath Towel Set Pack of 2', 'Home', 827.55, 1236.54, 4.8, '🧖', '100% cotton, highly absorbent, quick dry', 180),
('Wall Clock Analog', 'Home', 566.62, 674.91, 3.9, '🕐', 'Silent sweep movement, 12-inch diameter', 127),
('LED Table Lamp', 'Home', 1212.38, 1470.83, 4.6, '💡', 'Touch control, 3 brightness levels, USB charging', 28),
('Storage Boxes Set of 3', 'Home', 866.54, 1346.21, 4.3, '📦', 'Foldable, stackable, lidded design', 146),
('Curtains Pair Blackout', 'Home', 1419.01, 1641.23, 4.0, '🪟', 'Room darkening, eyelet style, 7ft length', 76),
('Door Mat Anti-Slip', 'Home', 448.63, 661.05, 3.7, '🚪', 'Coir material, durable & absorbent', 19),
('Wooden Photo Frame Set of 5', 'Home', 618.05, 884.57, 4.3, '🖼️', 'Assorted sizes, tabletop & wall mount', 84),
('Glass Storage Jars Set of 4', 'Home', 893.95, 1243.93, 4.5, '🫙', 'Airtight lids, ideal for kitchen pantry', 116),
('Bean Bag Cover XXL', 'Home', 1159.49, 1453.61, 4.2, '🛋️', 'Faux leather, filling not included', 79),
('Wooden Coffee Table', 'Home', 4549.71, 6145.94, 4.3, '🪑', 'Engineered wood, modern design, easy assembly', 60),
('Artificial Plant Decor', 'Home', 908.46, 1131.49, 4.1, '🪴', 'Lifelike leaves, ceramic pot included', 146),
('Cushion Covers Set of 5', 'Home', 631.50, 961.67, 4.5, '🛋️', '16x16 inch, zipper closure, assorted prints', 45),
('Kitchen Knife Set 6pcs', 'Home', 1634.03, 1956.88, 4.6, '🔪', 'Stainless steel, ergonomic handles, wooden block', 175),
('Mattress Protector Waterproof', 'Home', 1126.17, 1514.30, 4.6, '🛏️', 'Breathable, fitted elastic sides, queen size', 69),
('Bathroom Organizer Rack', 'Home', 1005.88, 1577.53, 4.4, '🚿', 'Rust-proof, multi-tier, wall mounted', 97),
('Dining Table Runner', 'Home', 630.18, 1034.25, 4.7, '🍽️', 'Cotton blend, machine washable, 72 inch', 121),
('Laundry Basket Foldable', 'Home', 674.01, 841.68, 3.7, '🧺', 'Large capacity, breathable mesh', 137),
('Wall Mirror Decorative', 'Home', 1812.68, 2604.25, 4.8, '🪞', 'Round frame, 24-inch diameter', 69),
('Shoe Rack 5 Tier', 'Home', 1975.46, 3012.91, 3.7, '👟', 'Space-saving, durable metal frame', 70),
('Kitchen Chimney Cleaner Kit', 'Home', 568.46, 882.90, 4.4, '🧽', 'Degreaser spray + microfiber cloths', 30),
('Vacuum Storage Bags Set of 6', 'Home', 948.70, 1175.24, 4.8, '📦', 'Space saver, ideal for clothes & blankets', 52),
('Aroma Diffuser with Essential Oils', 'Home', 1817.46, 2463.05, 4.0, '🕯️', '7-color LED, auto shut-off, 300ml tank', 21),
('Wooden Bookshelf 5 Tier', 'Home', 3874.93, 4499.60, 4.8, '📚', 'Sturdy MDF build, easy assembly', 43),
('Non-Slip Bath Mat', 'Home', 778.33, 1272.20, 4.7, '🛁', 'Quick-dry, suction cups, machine washable', 85),
('Wine Glass Set of 6', 'Home', 1201.78, 1707.54, 4.6, '🍷', 'Lead-free crystal, elegant stem design', 20),
('Kitchen Scale Digital', 'Home', 740.14, 1098.04, 4.0, '⚖️', '5kg capacity, LCD display, tare function', 95),
('Wall Shelves Floating Set of 3', 'Home', 1296.73, 2065.72, 4.9, '🗄️', 'Easy installation, modern design', 106),
('Cotton Table Cloth', 'Home', 923.74, 1372.35, 4.3, '🍽️', 'Stain-resistant, rectangular, 6-seater size', 187),
('Bedside Table Lamp Set of 2', 'Home', 2005.27, 3148.35, 4.8, '💡', 'Fabric shade, wooden base, warm light', 199),
('Trash Can with Lid 30L', 'Home', 1278.28, 1830.18, 4.8, '🗑️', 'Foot pedal operation, odor-sealed', 68),
('Window Blinds Roller', 'Home', 1438.15, 1975.23, 3.7, '🪟', 'Blackout fabric, easy installation, 4ft width', 71),
('Kitchen Trolley 3 Tier', 'Home', 2775.72, 3442.20, 4.3, '🛒', 'Wheeled, multi-purpose storage', 121),
('Hanging Wall Planters Set of 3', 'Home', 701.16, 1170.22, 4.7, '🪴', 'Ceramic, macrame hanger included', 43),
('Dish Drying Rack Stainless Steel', 'Home', 1438.44, 1796.41, 4.0, '🍽️', 'Rust-proof, drainboard included', 75),
('Bedsheet Set King Size Cotton', 'Home', 1663.73, 2612.57, 3.8, '🛏️', 'Includes fitted sheet, flat sheet & 2 pillow covers', 174),
('Wall Stickers Decorative Pack', 'Home', 307.86, 421.06, 4.9, '🎨', 'Removable vinyl, easy peel and stick', 124),
('Multi-Purpose Storage Cart', 'Home', 1872.95, 2759.84, 4.0, '🗄️', '4-wheel, 3 baskets, compact design', 43),
('Ceramic Coffee Mug Set of 6', 'Home', 937.61, 1393.97, 4.1, '☕', '350ml each, microwave safe, assorted colors', 50),
('Foldable Step Stool', 'Home', 691.82, 1013.58, 3.9, '🪜', 'Non-slip steps, compact storage', 35),
('Kitchen Cutting Board Set of 3', 'Home', 673.10, 848.73, 4.6, '🔪', 'Bamboo material, different sizes', 44),
('Wall Mounted Coat Rack', 'Home', 1036.23, 1703.12, 3.8, '🧥', '5 hooks, solid wood, easy installation', 185),
('Insulated Lunch Bag', 'Home', 538.53, 812.27, 4.5, '🍱', 'Leak-proof lining, adjustable strap', 139),
('Floor Cushion Round', 'Home', 1448.33, 2343.13, 3.7, '🛋️', 'Cotton cover, washable, floor seating', 71),
('Electric Mosquito Repellent Set', 'Home', 277.15, 423.46, 4.1, '🦟', 'Liquid vaporizer, low odor formula', 144),
('Wooden Wall Clock Vintage', 'Home', 1235.28, 1584.73, 4.0, '🕰️', 'Roman numerals, silent movement, 14 inch', 154),

-- Grocery (50 products)
('Organic Basmati Rice 5kg', 'Grocery', 582.42, 730.35, 4.6, '🌾', 'Premium aged basmati', 17),
('Cold Pressed Coconut Oil 1L', 'Grocery', 413.90, 575.41, 4.0, '🥥', '100% pure, chemical-free', 22),
('Assorted Dry Fruits 1kg', 'Grocery', 830.95, 1040.20, 4.8, '🥜', 'Almonds, cashews & raisins mix', 181),
('Whole Wheat Atta 10kg', 'Grocery', 486.98, 714.64, 4.0, '🌾', 'Stone-ground, high fiber content', 195),
('Toor Dal 1kg', 'Grocery', 180.51, 223.40, 4.1, '🫘', 'Unpolished, high protein content', 188),
('Cooking Oil Sunflower 5L', 'Grocery', 794.45, 1027.39, 4.2, '🛢️', 'Refined, cholesterol-free, light texture', 16),
('Green Tea Bags Pack of 100', 'Grocery', 284.14, 348.82, 3.7, '🍵', 'Antioxidant rich, no added flavors', 107),
('Honey Pure 500g', 'Grocery', 300.79, 501.64, 4.8, '🍯', 'Raw & unprocessed, no added sugar', 72),
('Masala Chai Powder 500g', 'Grocery', 241.53, 381.35, 3.6, '☕', 'Blended spices, rich aroma', 55),
('Mixed Spices Combo Pack', 'Grocery', 380.57, 509.57, 3.9, '🌶️', 'Turmeric, chili, coriander & cumin powder set', 28),
('Peanut Butter Creamy 1kg', 'Grocery', 545.11, 757.01, 4.5, '🥜', 'No added sugar, high protein', 30),
('Extra Virgin Olive Oil 1L', 'Grocery', 1105.87, 1863.35, 4.1, '🫒', 'Cold-pressed, imported, rich flavor', 118),
('Brown Bread Multigrain', 'Grocery', 75.19, 102.01, 4.3, '🍞', 'High fiber, no preservatives', 175),
('Instant Noodles Pack of 12', 'Grocery', 167.13, 257.65, 4.7, '🍜', 'Quick cooking, assorted flavors', 79),
('Pasta Penne 1kg', 'Grocery', 240.96, 285.64, 3.6, '🍝', 'Durum wheat semolina, al dente texture', 78),
('Tomato Ketchup 1kg', 'Grocery', 164.98, 199.02, 4.7, '🍅', 'No artificial colors, tangy taste', 169),
('Mixed Pickle Jar 500g', 'Grocery', 248.36, 314.66, 4.5, '🥒', 'Traditional recipe, tangy & spicy', 143),
('Almonds California 500g', 'Grocery', 451.51, 703.92, 3.7, '🌰', 'Premium quality, rich in protein', 108),
('Cashew Nuts Whole 500g', 'Grocery', 567.17, 657.77, 4.2, '🥜', 'Crunchy, naturally processed', 190),
('Jaggery Powder 1kg', 'Grocery', 120.64, 191.42, 4.6, '🍯', 'Natural sweetener, chemical-free', 140),
('Sugar Refined 5kg', 'Grocery', 317.75, 471.14, 4.3, '🍚', 'Fine crystal, food grade', 37),
('Salt Iodized 1kg', 'Grocery', 36.91, 50.53, 3.9, '🧂', 'Free-flowing, essential nutrients', 161),
('Tea Powder Premium 1kg', 'Grocery', 536.87, 751.39, 4.2, '🍵', 'Strong aroma, CTC blend', 162),
('Coffee Instant 200g', 'Grocery', 307.43, 356.90, 4.3, '☕', 'Rich roast, smooth finish', 172),
('Oats Rolled 1kg', 'Grocery', 209.25, 287.83, 4.2, '🥣', 'High fiber, heart healthy', 179),
('Quinoa Organic 500g', 'Grocery', 496.99, 729.73, 3.6, '🌾', 'Gluten-free, high protein superfood', 92),
('Chia Seeds 250g', 'Grocery', 216.23, 328.08, 4.9, '🌱', 'Omega-3 rich, raw & unprocessed', 13),
('Flax Seeds 500g', 'Grocery', 217.81, 349.95, 4.7, '🌱', 'Roasted, fiber rich', 56),
('Soya Chunks 1kg', 'Grocery', 190.06, 304.18, 4.5, '🫘', 'High protein, low fat meat substitute', 55),
('Poha Flattened Rice 1kg', 'Grocery', 106.52, 128.63, 4.7, '🍚', 'Thin variety, quick cooking', 117),
('Besan Gram Flour 1kg', 'Grocery', 117.92, 141.85, 3.9, '🌾', 'Stone-ground, high protein', 144),
('Maida All Purpose Flour 1kg', 'Grocery', 67.81, 109.64, 4.5, '🌾', 'Fine textured, refined', 80),
('Vermicelli Roasted 500g', 'Grocery', 107.38, 125.56, 4.4, '🍝', 'Perfect for upma & desserts', 27),
('Cornflakes Breakfast Cereal 500g', 'Grocery', 218.81, 298.71, 4.8, '🥣', 'High fiber, no added sugar variant', 163),
('Dark Chocolate Bar Pack of 6', 'Grocery', 356.64, 576.09, 4.7, '🍫', '70% cocoa, no added preservatives', 138),
('Mixed Seeds Trail Mix 500g', 'Grocery', 394.69, 551.12, 4.3, '🌰', 'Pumpkin, sunflower & melon seeds blend', 172),
('Apple Cider Vinegar 500ml', 'Grocery', 317.25, 414.26, 3.8, '🍎', 'Raw, unfiltered, with mother culture', 140),
('Coconut Milk Powder 400g', 'Grocery', 261.75, 373.35, 4.4, '🥥', 'Rich creamy texture, no preservatives', 164),
('Pickled Vegetables Jar 400g', 'Grocery', 214.61, 273.57, 4.2, '🥗', 'Traditional fermented recipe', 47),
('Whole Spices Combo Box', 'Grocery', 484.36, 646.99, 4.6, '🌶️', 'Cinnamon, cloves, cardamom & bay leaf', 112),
('Multigrain Atta 5kg', 'Grocery', 406.49, 485.87, 4.1, '🌾', 'Blend of 5 grains, high fiber', 118),
('Rock Salt Edible 1kg', 'Grocery', 96.86, 115.85, 3.9, '🧂', 'Natural mineral salt, unrefined', 32),
('Saffron Strands 1g', 'Grocery', 375.89, 494.03, 3.7, '🌺', 'Premium grade A, authentic aroma', 197),
('Dates Premium 500g', 'Grocery', 274.52, 362.58, 4.7, '🌴', 'Soft & seedless, naturally sweet', 183),
('Mustard Oil Cold Pressed 1L', 'Grocery', 249.65, 299.32, 3.7, '🛢️', 'Strong aroma, traditional extraction', 16),
('Sesame Oil 1L', 'Grocery', 463.92, 589.14, 4.1, '🛢️', 'Cold-pressed, rich in antioxidants', 139),
('Dry Coconut Whole Pack of 2', 'Grocery', 151.95, 228.96, 3.9, '🥥', 'Fresh & naturally dried', 148),
('Rajma Red Kidney Beans 1kg', 'Grocery', 205.38, 260.84, 3.8, '🫘', 'High protein, unpolished', 189),
('Chickpeas Kabuli Chana 1kg', 'Grocery', 164.93, 272.46, 4.8, '🫘', 'Premium quality, high fiber', 69),
('Herbal Tea Assorted Pack', 'Grocery', 475.77, 759.34, 4.4, '🍵', 'Chamomile, peppermint & ginger blends', 164);


-- ============================================================
-- HOW TO ADD PRODUCT IMAGES (image URLs)
-- ============================================================
-- Run an UPDATE statement like this for each product, matching by name.
-- Paste any direct image link (must end in the actual image, e.g. .jpg/.png/.webp).
--
-- Example:
-- UPDATE products SET image_url = 'https://example.com/images/headphones.jpg'
--   WHERE name = 'Wireless Bluetooth Headphones';
--
-- UPDATE products SET image_url = 'https://example.com/images/smartwatch.jpg'
--   WHERE name = 'Smartwatch Series 5';
--
-- You can also update by id if you already know it:
-- UPDATE products SET image_url = 'https://example.com/images/shoes.jpg' WHERE id = 4;
--
-- If image_url is left NULL, the product card will automatically fall back
-- to showing the image_emoji icon instead — so it's safe to add these gradually.

