const express = require('express');
const router = express.Router();

// Fixed: Added curly braces around protect to match your named object export
const { protect } = require('../middleware/authMiddleware');
const aiController = require('../controllers/aiController');


// Clean route handling mapping
router.post('/generate-email', protect, aiController.generateEmail);
router.get('/history', protect, aiController.getHistory);

module.exports = router;

