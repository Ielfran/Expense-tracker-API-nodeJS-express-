const Category = require('../models/Category');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');

exports.addCategory = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name } = req.body;

  try {
    let category = await Category.findOne({ user: req.user.id, name });
    if (category) {
      logger.warn(`Category ${name} already exists for user ${req.user.id}`);
      return res.status(400).json({ msg: 'Category already exists' });
    }

    category = new Category({ user: req.user.id, name });
    await category.save();

    logger.info(`Added category ${name} for user ${req.user.id}`);
    res.json(category);
  } catch (err) {
    logger.error(`Add category failed for user ${req.user.id}: ${err.message}`);
    res.status(500).json({ msg: `Server error: ${err.message}` });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ user: req.user.id }).sort({ name: 1 });
    logger.info(`Fetched ${categories.length} categories for user ${req.user.id}`);
    res.json(categories);
  } catch (err) {
    logger.error(`Get categories failed for user ${req.user.id}: ${err.message}`);
    res.status(500).json({ msg: `Server error: ${err.message}` });
  }
};

exports.deleteCategory = async (req, res) => {
  const { name } = req.params;

  try {
    const category = await Category.findOneAndDelete({ user: req.user.id, name });
    if (!category) {
      logger.warn(`Category ${name} not found for user ${req.user.id}`);
      return res.status(404).json({ msg: 'Category not found' });
    }

    // Check if category is used in expenses
    const expenseCount = await Expense.countDocuments({ user: req.user.id, category: name });
    if (expenseCount > 0) {
      logger.warn(`Cannot delete category ${name} used in ${expenseCount} expenses for user ${req.user.id}`);
      return res.status(400).json({ msg: 'Category is used in expenses' });
    }

    logger.info(`Deleted category ${name} for user ${req.user.id}`);
    res.json({ msg: 'Category removed' });
  } catch (err) {
    logger.error(`Delete category failed for user ${req.user.id}: ${err.message}`);
    res.status(500).json({ msg: `Server error: ${err.message}` });
  }
};
