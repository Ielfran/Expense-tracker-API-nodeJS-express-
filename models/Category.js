const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true, unique: true },
  createdAt: { type: Date, default: Date.now }
});

CategorySchema.index({ user: 1, name: 1 });

module.exports = mongoose.model('Category', CategorySchema);
