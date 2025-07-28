const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { check } = require('express-validator');
const categoryController = require('../controllers/categoryController');

router.use(authMiddleware);

router.post(
  '/',
  [check('name', 'Category name is required').not().isEmpty()],
  categoryController.addCategory
);
router.get('/', categoryController.getCategories);
router.delete('/:name', categoryController.deleteCategory);

module.exports = router;
