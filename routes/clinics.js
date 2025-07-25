const express = require('express');
const router = express.Router();
const {isBlank} = require('../helpers/common')
const Clinic = require('../models/clinics')

router.post('/data_by_id', async (req, res) => {
  const { id } = req.body;

  try {
    const db = res.locals.conn
    const result = await db.query(
      `
      SELECT id, name, email, address, phone
      FROM tbl_clinics
      WHERE id = $1
      `,
      [id]
    );

    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error_message: error.message });
  }
});

router.post('/save', async (req, res) => {
  const { masterFormData, id } = req.body;
  let errorMessage;
  const db = res.locals.conn

  try {
    await db.query('BEGIN');

    let clinic = new Clinic(db); // pass client for transaction

    if (isBlank(id)) {
      const result = await clinic.insert(masterFormData);
      const newId = result.id;
      await clinic.checkDuplicate(newId, masterFormData);
    } else {
      await clinic.update(id, masterFormData);
    }

    await db.query('COMMIT');
  } catch (error) {
    console.error(error);
    errorMessage = error.message;
    await db.query('ROLLBACK');
  } finally {
    db.release();
    res.json({ error_message: errorMessage });
  }
});

router.post('/delete', async (req, res) => {
  const { id } = req.body;
  let errorMessage;
  const db = res.locals.conn

  try {
    await db.query('BEGIN');

    let clinic = new Clinic(db);

    await clinic.delete(id);

    await db.query('COMMIT');
  } catch (error) {
    console.error(error);
    errorMessage = error.message;
    await db.query('ROLLBACK');
  } finally {
    db.release();
    res.json({ error_message: errorMessage });
  }
});

router.get('/get_clinic_look_ups', async (req, res) => {
  try {
    const db = res.locals.conn
    const result = await db.query(
      `SELECT id, name AS value FROM tbl_clinics ORDER BY name`
    );
    res.json({ data: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error_message: error.message });
  }
});

module.exports = router;
