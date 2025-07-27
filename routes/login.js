const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const secret = process.env.JWT_SECRET || 'super_secret_key';

// ✅ LOGIN
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const db = res.locals.conn;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const result = await db.query(
      `SELECT id, first_name, last_name, email, password, role_id, clinic_id
       FROM tbl_users
       WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role_id,
        clinicId: user.clinic_id,
      },
      secret,
      { expiresIn: '1d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        role: user.role_id,
        clinicId: user.clinic_id,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// ✅ CHANGE PASSWORD
router.post('/change_password', async (req, res) => {
  const { email, oldPassword, newPassword } = req.body;
  const db = res.locals.conn;
  console.log('req.body: ', req.body);

  if (!email || !oldPassword || !newPassword) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    await db.query('BEGIN');

    const result = await db.query(
      `SELECT id, password FROM tbl_users WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    await db.query(
      `UPDATE tbl_users
       SET password = $1, updated_at = NOW()
       WHERE id = $2`,
      [hashedNewPassword, user.id]
    );

    await db.query('COMMIT');
    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Server error while changing password.' });
  } finally {
    db.release();
  }
});

// ✅ LOGOUT
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
  });

  res.json({ message: 'Logout successful' });
});

module.exports = router;
