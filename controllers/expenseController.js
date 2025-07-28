const Expense = require('../models/Expense');
const Category = require('../models/Category');
const { validationResult } = require('express-validator');
const { subDays, subMonths, startOfDay, endOfDay } = require('date-fns');
const logger = require('../utils/logger');

exports.getExpenses = async (req, res) => {
  try {
    const { filter, startDate, endDate, category, page = 1, limit = 10, sortBy = 'date', sortOrder = 'desc' } = req.query;
    let query = { user: req.user.id };

    if (filter) {
      const now = new Date();
      switch (filter) {
        case 'week':
          query.date = { $gte: subDays(now, 7) };
          break;
        case 'month':
          query.date = { $gte: subMonths(now, 1) };
          break;
        case 'three_months':
          query.date = { $gte: subMonths(now, 3) };
          break;
        case 'custom':
          if (startDate && endDate) {
            query.date = { $gte: startOfDay(new Date(startDate)), $lte: endOfDay(new Date(endDate)) };
          }
          break;
      }
    }

    if (category) {
      query.category = category;
    }

    const options = {
      skip: (page - 1) * limit,
      limit: parseInt(limit),
      sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 }
    };

    const expenses = await Expense.find(query, null, options);
    const total = await Expense.countDocuments(query);

    logger.info(`Fetched ${expenses.length} expenses for user ${req.user.id}`);
    res.json({ expenses, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    logger.error(`Get expenses failed for user ${req.user.id}: ${err.message}`);
    res.status(500).json({ msg: `Server error: ${err.message}` });
  }
};

exports.getAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = { user: req.user.id };

    if (startDate && endDate) {
      query.date = { $gte: startOfDay(new Date(startDate)), $lte: endOfDay(new Date(endDate)) };
    }

    const analytics = await Expense.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$category',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    logger.info(`Fetched analytics for user ${req.user.id}`);
    res.json(analytics);
  } catch (err) {
    logger.error(`Get analytics failed for user ${req.user.id}: ${err.message}`);
    res.status(500).json({ msg: `Server error: ${err.message}` });
  }
};

exports.addExpense = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { category, amount, description, date, tags } = req.body;

  try {
    // Validate category exists for user or not, uuouuuouo
    const categoryExists = await Category.findOne({ user: req.user.id, name: category });
    if (!categoryExists) {
      logger.warn(`Invalid category ${category} for user ${req.user.id}`);
      return res.status(400).json({ msg: 'Category does not exist' });
    }

    const newExpense = new Expense({
      user: req.user.id,
      category,
      amount,
      description,
      date: date ? new Date(date) : new Date(),
      tags
    });

    if (isNaN(newExpense.date)) {
      return res.status(400).json({ msg: 'Invalid date format' });
    }

    const expense = await newExpense.save();
    logger.info(`Added expense ${expense._id} for user ${req.user.id}`);
    res.json(expense);
  } catch (err) {
    logger.error(`Add expense failed for user ${req.user.id}: ${err.message}`);
    res.status(500).json({ msg: `Server error: ${err.message}` });
  }
};

exports.updateExpense = async (req, res) => {
  const { category, amount, description, date, tags } = req.body;
  const expenseFields = { category, amount, description, date: date ? new Date(date) : undefined, tags };
  Object.keys(expenseFields).forEach(key => expenseFields[key] === undefined && delete expenseFields[key]);

  try {
    if (expenseFields.date && isNaN(expenseFields.date)) {
      return res.status(400).json({ msg: 'Invalid date format' });
    }

    if (expenseFields.category) {
      const categoryExists = await Category.findOne({ user: req.user.id, name: expenseFields.category });
      if (!categoryExists) {
        logger.warn(`Invalid category ${expenseFields.category} for user ${req.user.id}`);
        return res.status(400).json({ msg: 'Category does not exist' });
      }
    }

    let expense = await Expense.findById(req.params.id);
    if (!expense) {
      logger.warn(`Expense ${req.params.id} not found for user ${req.user.id}`);
      return res.status(404).json({ msg: 'Expense not found' });
    }

    if (expense.user.toString() !== req.user.id) {
      logger.warn(`Unauthorized update attempt on expense ${req.params.id} by user ${req.user.id}`);
      return res.status(401).json({ msg: 'Not authorized' });
    }

    expense = await Expense.findByIdAndUpdate(req.params.id, { $set: expenseFields }, { new: true });
    logger.info(`Updated expense ${req.params.id} for user ${req.user.id}`);
    res.json(expense);
  } catch (err) {
    logger.error(`Update expense failed for user ${req.user.id}: ${err.message}`);
    res.status(500).json({ msg: `Server error: ${err.message}` });
  }
};

exports.deleteExpense = async (req, res) => {
  try {
    let expense = await Expense.findById(req.params.id);
    if (!expense) {
      logger.warn(`Expense ${req.params.id} not found for user ${req.user.id}`);
      return res.status(404).json({ msg: 'Expense not found' });
    }

    if (expense.user.toString() !== req.user.id) {
      logger.warn(`Unauthorized delete attempt on expense ${req.params.id} by user ${req.user.id}`);
      return res.status(401).json({ msg: 'Not authorized' });
    }

    await Expense.findByIdAndDelete(req.params.id);
    logger.info(`Deleted expense ${req.params.id} for user ${req.user.id}`);
    res.json({ msg: 'Expense removed' });
  } catch (err) {
    logger.error(`Delete expense failed for user ${req.user.id}: ${err.message}`);
    res.status(500).json({ msg: `Server error: ${err.message}` });
  }
};

exports.bulkDeleteExpenses = async (req, res) => {
  const { expenseIds } = req.body;

  if (!Array.isArray(expenseIds) || expenseIds.length === 0) {
    return res.status(400).json({ msg: 'Provide an array of expense IDs' });
  }

  try {
    const result = await Expense.deleteMany({
      _id: { $in: expenseIds },
      user: req.user.id
    });

    if (result.deletedCount === 0) {
      logger.warn(`No expenses found for bulk delete by user ${req.user.id}`);
      return res.status(404).json({ msg: 'No expenses found' });
    }

    logger.info(`Deleted ${result.deletedCount} expenses for user ${req.user.id}`);
    res.json({ msg: `${result.deletedCount} expenses removed` });
  } catch (err) {
    logger.error(`Bulk delete failed for user ${req.user.id}: ${err.message}`);
    res.status(500).json({ msg: `Server error: ${err.message}` });
  }
};

