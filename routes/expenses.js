const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { check } = require('express-validator');
const expenseController = require('../controllers/expenseController');

router.use(authMiddleware);

router.get('/', expenseController.getExpenses);
router.get('/analytics', expenseController.getAnalytics);
router.post(
  '/',
  [
    check('category', 'Category is required').not().isEmpty(),
    check('amount', 'Amount must be a positive number').isFloat({ min: 0 }),
    check('date', 'Invalid date format').optional().isISO8601().toDate()
  ],
  expenseController.addExpense
);
router.put(
  '/:id',
  [
    check('amount', 'Amount must be a positive number').optional().isFloat({ min: 0 }),
    check('date', 'Invalid date format').optional().isISO8601().toDate()
  ],
  expenseController.updateExpense
);
router.delete('/:id', expenseController.deleteExpense);
router.delete('/', expenseController.bulkDeleteExpenses);

module.exports = router;
