const express = require('express');
const router = express.Router();
const { isBlank } = require('../helpers/common');
const Appointment = require('../models/appointments');
const Email = require('../models/emails');

// ✅ DATA BY ID
router.post('/data_by_id', async (req, res) => {
  const { id } = req.body;
  const db = res.locals.conn;

  try {
    const result = await db.query(
      `
      SELECT id, user_id, clinic_id, patient_id, date, time, status_id, notes
      FROM tbl_appointments
      WHERE id = $1
      `,
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

// ✅ DETAILS
router.post('/details', async (req, res) => {
  const db = res.locals.conn;
  let { params } = req.body;
  let { ClinicId, PatientId, StatusId } = params;

  try {
    const result = await db.query(
      `
      SELECT 
        a.id, c.name AS clinic, COALESCE(u.formal_name, '') AS doctor, 
        p.formal_name AS patient, s.name AS status, 
        TO_CHAR(a.date, 'MM/DD/YYYY') AS date, 
        TO_CHAR(a.time, 'HH12:MI AM') AS time, a.notes
      FROM tbl_appointments a
        INNER JOIN tbl_clinics c ON c.id = a.clinic_id
        LEFT JOIN tbl_users u ON u.id = a.user_id
        INNER JOIN tbl_patients p ON p.id = a.patient_id
        INNER JOIN tbl_appointment_status s ON s.id = a.status_id
      WHERE ($1 = 0 OR a.clinic_id = $1)
        AND ($2 = 0 OR a.patient_id = $2)
        AND ($3 = 0 OR a.status_id = $3)
      `,
      [ClinicId, PatientId, StatusId]
    );

    res.json({ data: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error_message: error.message });
  } finally {
    if (db.release) db.release();
  }
});

// ✅ SAVE
router.post('/save', async (req, res) => {
  const db = res.locals.conn;
  let id = req.body.id;
  let { patientId, clinicId, statusId, userId, date, time, reason } = req.body.masterFormData;

  console.log('req.body: ', req.body);
  let errorMessage;

  await db.query('BEGIN');

  try {
    let appointment = new Appointment(db);
    let email = new Email(db);

    let data = {
      user_id: userId,
      patient_id: patientId,
      clinic_id: clinicId,
      status_id: statusId,
      date: date,
      time: time,
      notes: reason
    };

    if (isBlank(id)) {
      const result = await appointment.insert(data);
      id = result.id;
      await appointment.checkDuplicate(id, data);
    } else {
      await appointment.update(id, data);
    }

    const appointmentResult = await db.query(
      `
      SELECT s.is_send_email, s.name AS status, u.email AS sender_email, 
             p.email AS recipient_email, a.date, a.time
      FROM tbl_appointments a
        INNER JOIN tbl_users u ON u.id = a.user_id
        INNER JOIN tbl_patients p ON p.id = a.patient_id
        INNER JOIN tbl_appointment_status s ON s.id = a.status_id
      WHERE a.id = $1
      `,
      [id]
    );

    if (appointmentResult.rows.length > 0) {
      let { is_send_email, status, sender_email, recipient_email, date, time } = appointmentResult.rows[0];

      if (is_send_email) {
        let emailData = {
          appointment_id: id,
          sender_email: recipient_email,
          recipient_email: sender_email,
          subject: `Your Appointment is ${status}`,
          body: `Dear Patient, your appointment with HealthFirst Medical Center has been ${status} for ${date} at ${time}.`
        };

        await email.insert(emailData);
      }
    }

    await db.query('COMMIT');
  } catch (error) {
    errorMessage = error.message;
    await db.query('ROLLBACK');
  } finally {
    if (db.release) db.release();
    res.json({ error_message: errorMessage });
  }
});

// ✅ DELETE
router.post('/delete', async (req, res) => {
  const { id } = req.body;
  let errorMessage;
  const db = res.locals.conn;

  try {
    await db.query('BEGIN');

    let appointment = new Appointment(db);
    await appointment.delete(id);

    await db.query('COMMIT');
  } catch (error) {
    console.error(error);
    errorMessage = error.message;
    await db.query('ROLLBACK');
  } finally {
    if (db.release) db.release();
    res.json({ error_message: errorMessage });
  }
});

// ✅ LOOK UPS
router.get('/get_appointment_look_ups', async (req, res) => {
  const db = res.locals.conn;

  try {
    const result = await db.query(
      `
      SELECT id AS id, name AS value
      FROM tbl_appointment_status
      `
    );

    res.json({ data: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error_message: error.message });
  } finally {
    if (db.release) db.release();
  }
});

module.exports = router;
