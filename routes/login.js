const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const sql = require('mssql');
const jwt = require('jsonwebtoken');

const secret = process.env.JWT_SECRET || 'super_secret_key';

router.post('/login', async (req, res) => {
  const conn = res.locals.conn;
  const { email, password } = req.body;
  console.log('req.body: ', req.body);

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const result = await conn.request()
      .input('Email', sql.VarChar, email)
      .query(`
        SELECT Id, FirstName, LastName, Email, Password, RoleId, ClinicId
        FROM tblUsers
        WHERE Email = @Email
      `);

    if (result.recordset.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = result.recordset[0];
    const isPasswordValid = await bcrypt.compare(password, user.Password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
    {
      id: user.Id,
      role: user.RoleId,
      clinicId: user.ClinicId,
    },
    secret,
    { expiresIn: '1d' }
  );

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  });

    // ✅ No JWT — just return basic user data
    res.json({
      message: 'Login successful',
      user: {
        id: user.Id,
        name: `${user.FirstName} ${user.LastName}`,
        email: user.Email,
        role: user.RoleId,
        clinicId: user.ClinicId
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

router.post('/change_password', async (req, res) => {
  const conn = res.locals.conn;
  const { email, oldPassword, newPassword } = req.body;

  if (!email || !oldPassword || !newPassword) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    const result = await conn.request()
      .input('Email', sql.VarChar, email)
      .query(`SELECT Id, Password FROM tblUsers WHERE Email = @Email`);

    const user = result.recordset[0];

    if (
        result.recordset.length === 0 ||
        !(await bcrypt.compare(oldPassword, user.Password))
    ) {
        // Generic error — no confirmation if it's the email or password
        return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    await conn.request()
      .input('Id', sql.Int, user.Id)
      .input('NewPassword', sql.VarChar, hashedNewPassword)
      .query(`UPDATE tblUsers SET Password = @NewPassword, UpdatedAt = GETDATE() WHERE Id = @Id`);

    res.json({ message: 'Password changed successfully.' });

  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Server error while changing password.' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });

  res.json({ message: 'Logout successful' });
});

module.exports = router;
