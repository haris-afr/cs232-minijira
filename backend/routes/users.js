const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.get('/me', async (req, res) => {
  try {
    const r = await db.query(
      'SELECT userID, username, email, userCreatedOn FROM "user" WHERE userID=$1',
      [req.user.userID]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'User not found' });
    return res.json({ data: r.rows[0] });
  } catch (err) {
    console.error('me error:', err);
    return res.status(500).json({ error: 'Failed to load user' });
  }
});

router.get('/search', async (req, res) => {
  try {
    const q = (req.query.q || '').toString().trim();
    if (!q) return res.json({ data: [] });
    const r = await db.query(
      `SELECT userID, username, email FROM "user"
        WHERE username ILIKE $1 OR email ILIKE $1
        ORDER BY username ASC LIMIT 20`,
      [`%${q}%`]
    );
    return res.json({ data: r.rows });
  } catch (err) {
    console.error('user search error:', err);
    return res.status(500).json({ error: 'Failed to search users' });
  }
});

module.exports = router;
