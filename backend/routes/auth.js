const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();

function signToken(userID) {
  return jwt.sign({ userID }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body || {};
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'username, email and password are required' });
    }

    const existing = await db.query(
      'SELECT userID FROM "user" WHERE email=$1',
      [email]
    );
    if (existing.rowCount > 0) {
      return res.status(409).json({ error: 'Email is already registered' });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await db.query(
      `INSERT INTO "user" (username, email, password)
       VALUES ($1, $2, $3)
       RETURNING userID, username, email, userCreatedOn`,
      [username, email, hash]
    );

    const row = result.rows[0];
    const token = signToken(row.userid);
    return res.status(201).json({
      data: {
        token,
        user: {
          userID: row.userid,
          username: row.username,
          email: row.email,
          userCreatedOn: row.usercreatedon,
        },
      },
    });
  } catch (err) {
    console.error('register error:', err);
    return res.status(500).json({ error: 'Failed to register user' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const result = await db.query(
      'SELECT userID, username, email, password FROM "user" WHERE email=$1',
      [email]
    );
    if (result.rowCount === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signToken(user.userid);
    return res.json({
      data: {
        token,
        user: { userID: user.userid, username: user.username, email: user.email },
      },
    });
  } catch (err) {
    console.error('login error:', err);
    return res.status(500).json({ error: 'Failed to log in' });
  }
});

module.exports = router;
