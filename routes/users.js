const express = require("express");
const router = express.Router();
const { isBlank } = require("../helpers/common");
const User = require("../models/users");
const bcrypt = require("bcrypt");

// ✅ Get user by ID
router.post("/data_by_id", async (req, res) => {
  const { id } = req.body;
  const db = res.locals.conn;

  try {
    const result = await db.query(
      `SELECT id, clinic_id, first_name, last_name, email, password, role_id
       FROM tbl_users
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

// ✅ Save user (insert/update)
router.post("/save", async (req, res) => {
  const { masterFormData, id } = req.body;
  const db = res.locals.conn;
  let errorMessage;

  try {
    await db.query("BEGIN");

    let user = new User(db);

    if (masterFormData.Password) {
      const hashedPassword = await bcrypt.hash(masterFormData.Password, 10);
      masterFormData.Password = hashedPassword;
    }

    if (isBlank(id)) {
      const result = await user.insert(masterFormData);
      await user.checkDuplicate(result.id, masterFormData);
    } else {
      await user.update(id, masterFormData);
    }

    await db.query("COMMIT");
  } catch (error) {
    console.error(error);
    errorMessage = error.message;
    await db.query("ROLLBACK");
  } finally {
    if (db.release) db.release();
    res.json({ error_message: errorMessage });
  }
});

// ✅ Delete user
router.post("/delete", async (req, res) => {
  const { id } = req.body;
  const db = res.locals.conn;
  let errorMessage;

  try {
    await db.query("BEGIN");

    const user = new User(db);
    await user.delete(id);

    await db.query("COMMIT");
  } catch (error) {
    console.error(error);
    errorMessage = error.message;
    await db.query("ROLLBACK");
  } finally {
    if (db.release) db.release();
    res.json({ error_message: errorMessage });
  }
});

module.exports = router;
