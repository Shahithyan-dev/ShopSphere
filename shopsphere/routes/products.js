const express = require('express');
const Product = require('../models/Product');
const CartItem = require('../models/CartItem');

const router = express.Router();

function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ success: false, message: 'Please log in first.' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ success: false, message: 'Please log in first.' });
  }
  if (!req.session.user.isAdmin) {
    return res.status(403).json({ success: false, message: 'Admin access required.' });
  }
  next();
}

router.get('/', async (req, res) => {
  try {
    const { category, search, sort } = req.query;
    const filter = {};

    if (category && category !== 'All') {
      filter.category = category;
    }
    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    const sortOrder = sort === 'top_rated'
      ? { rating: -1, created_at: -1 }
      : { created_at: -1 };

    const rawProducts = await Product.find(filter).sort(sortOrder).lean();
    const products = rawProducts.map(p => ({ ...p, id: p._id.toString() }));
    res.json({ success: true, products });
  } catch (err) {
    console.error('Get products error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching products.' });
  }
});

router.get('/categories', async (req, res) => {
  try {
    const categories = await Product.distinct('category');
    categories.sort();
    res.json({ success: true, categories });
  } catch (err) {
    console.error('Get categories error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching categories.' });
  }
});

router.get('/top-rated', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);

    if (req.query.grouped) {
      const categories = await Product.distinct('category');
      const grouped = {};

      for (const category of categories) {
        const rawGrouped = await Product.find({ category })
          .sort({ rating: -1, created_at: -1 })
          .limit(limit)
          .lean();
        grouped[category] = rawGrouped.map(p => ({ ...p, id: p._id.toString() }));
      }

      return res.json({ success: true, grouped });
    }

    const rawProducts = await Product.find({})
      .sort({ rating: -1, created_at: -1 })
      .limit(limit)
      .lean();
    const products = rawProducts.map(p => ({ ...p, id: p._id.toString() }));
    res.json({ success: true, products });
  } catch (err) {
    console.error('Get top-rated error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching top-rated products.' });
  }
});

router.get('/cart', requireLogin, async (req, res) => {
  try {
    const items = await CartItem.find({ user_id: req.session.user.id })
      .populate('product_id')
      .lean();

    const cartItems = items
      .filter(item => item.product_id)
      .map((item) => ({
        cart_id: item._id.toString(),
        quantity: item.quantity,
        id: item.product_id._id.toString(),
        name: item.product_id.name,
        category: item.product_id.category,
        price: item.product_id.price,
        original_price: item.product_id.original_price,
        rating: item.product_id.rating,
        image_emoji: item.product_id.image_emoji,
        image_url: item.product_id.image_url,
        description: item.product_id.description,
        stock: item.product_id.stock,
        created_at: item.product_id.created_at
      }));

    res.json({ success: true, items: cartItems });
  } catch (err) {
    console.error('Get cart error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching cart.' });
  }
});

router.post('/cart', requireLogin, async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const qty = quantity || 1;

    if (!productId) {
      return res.status(400).json({ success: false, message: 'Product ID is required.' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    await CartItem.findOneAndUpdate(
      { user_id: req.session.user.id, product_id: productId },
      { $inc: { quantity: qty } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, message: 'Added to cart.' });
  } catch (err) {
    console.error('Add to cart error:', err);
    res.status(500).json({ success: false, message: 'Server error adding to cart.' });
  }
});

router.delete('/cart/:cartId', requireLogin, async (req, res) => {
  try {
    await CartItem.deleteOne({ _id: req.params.cartId, user_id: req.session.user.id });
    res.json({ success: true, message: 'Removed from cart.' });
  } catch (err) {
    console.error('Remove from cart error:', err);
    res.status(500).json({ success: false, message: 'Server error removing item.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).lean();
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }
    product.id = product._id.toString();
    res.json({ success: true, product });
  } catch (err) {
    console.error('Get product error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching product.' });
  }
});

router.get('/admin/:id', requireAdmin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).lean();
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }
    product.id = product._id.toString();
    res.json({ success: true, product });
  } catch (err) {
    console.error('Get product error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching product.' });
  }
});

router.post('/admin', requireAdmin, async (req, res) => {
  try {
    const {
      name, category, price, original_price,
      rating, image_emoji, image_url, description, stock
    } = req.body;

    if (!name || !category || price === undefined) {
      return res.status(400).json({ success: false, message: 'Name, category, and price are required.' });
    }

    const product = await Product.create({
      name,
      category,
      price,
      original_price: original_price ?? null,
      rating: rating ?? 4.0,
      image_emoji: image_emoji ?? '🛒',
      image_url: image_url ?? null,
      description: description ?? '',
      stock: stock !== undefined ? stock : 100
    });

    res.status(201).json({ success: true, message: 'Product created.', productId: product._id.toString() });
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ success: false, message: 'Server error creating product.' });
  }
});

router.put('/admin/:id', requireAdmin, async (req, res) => {
  try {
    const {
      name, category, price, original_price,
      rating, image_emoji, image_url, description, stock
    } = req.body;

    if (!name || !category || price === undefined) {
      return res.status(400).json({ success: false, message: 'Name, category, and price are required.' });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        name,
        category,
        price,
        original_price: original_price ?? null,
        rating: rating ?? 4.0,
        image_emoji: image_emoji ?? '🛒',
        image_url: image_url ?? null,
        description: description ?? '',
        stock: stock !== undefined ? stock : 100
      },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    res.json({ success: true, message: 'Product updated.' });
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ success: false, message: 'Server error updating product.' });
  }
});

router.delete('/admin/:id', requireAdmin, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Product deleted.' });
  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).json({ success: false, message: 'Server error deleting product.' });
  }
});

module.exports = router;
