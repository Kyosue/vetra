const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Sale = require('../models/Sale');
const Product = require('../models/Product');

// Create a new sale
router.post('/', auth, async (req, res) => {
  try {
    const { items, totalAmount } = req.body;

    // Create the sale
    const sale = new Sale({
      items,
      totalAmount,
      userId: req.userId
    });

    // Verify products exist
    for (const item of items) {
      const product = await Product.findOne({ _id: item.productId, userId: req.userId });
      if (!product) {
        return res.status(404).json({ message: `Product not found: ${item.productId}` });
      }
    }

    await sale.save();
    res.status(201).json(sale);
  } catch (error) {
    res.status(500).json({ message: 'Error creating sale', error: error.message });
  }
});

// Get all sales for the logged-in user
router.get('/', auth, async (req, res) => {
  try {
    const sales = await Sale.find({ userId: req.userId })
      .populate('items.productId', 'name price')
      .sort({ date: -1 });
    res.json(sales);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching sales', error: error.message });
  }
});

module.exports = router; 