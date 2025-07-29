const express = require("express");
const router = express.Router();
const { isBlank } = require("../helpers/common");
const Patient = require("../models/patients");

// ✅ Get patient by ID
router.post("/data_by_id", async (req, res) => {
  const { id } = req.body;
  const db = res.locals.conn;

  try {
    const result = await db.query(
      `SELECT id, first_name, last_name, email, phone
       FROM tbl_patients
       WHERE id = $1`,
      [id]
    );

    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error_message: error.message });
  } finally {
    if (db.release) db.release();
  }
});

// ✅ Get all patient details
router.post("/details", async (req, res) => {
  const db = res.locals.conn;

  try {
    const result = await db.query(
      `SELECT id, formal_name, email, phone
       FROM tbl_patients
       ORDER BY formal_name`
    );

    res.json({ data: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error_message: error.message });
  } finally {
    if (db.release) db.release();
  }
});

// ✅ Get patient lookups
router.get("/get_patient_look_ups", async (req, res) => {
  const db = res.locals.conn;

  try {
    const result = await db.query(
      `SELECT id, formal_name AS value
       FROM tbl_patients
       ORDER BY formal_name`
    );

    res.json({ data: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error_message: error.message });
  } finally {
    if (db.release) db.release();
  }
});

// ✅ Insert or update patient
router.post("/save", async (req, res) => {
  const db = res.locals.conn;
  let id = req.body.id;
  const { firstName, lastName, email, phone } = req.body.masterFormData;
  console.log('req.body.masterFormData: ', req.body.masterFormData);
  let errorMessage;

  try {
    await db.query("BEGIN");

    const patient = new Patient(db);
    const data = {
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
    };

    if (isBlank(id)) {
      const inserted = await patient.insert(data);
      await patient.checkDuplicate(inserted.id, data);
    } else {
      await patient.update(id, data);
    }

    await db.query("COMMIT");
  } catch (error) {
    errorMessage = error.message;
    await db.query("ROLLBACK");
    console.error(error);
  } finally {
    if (db.release) db.release();
    res.json({ error_message: errorMessage });
  }
});

// ✅ Delete patient
router.post("/delete", async (req, res) => {
  const { id } = req.body;
  const db = res.locals.conn;
  let errorMessage;

  try {
    await db.query("BEGIN");

    const patient = new Patient(db);
    await patient.delete(id);

    await db.query("COMMIT");
  } catch (error) {
    errorMessage = error.message;
    await db.query("ROLLBACK");
    console.error(error);
  } finally {
    if (db.release) db.release();
    res.json({ error_message: errorMessage });
  }
});

module.exports = router;
