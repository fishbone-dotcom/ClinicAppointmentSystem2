const express = require('express');
const router = express.Router();

router.get('/get_appointment_upcoming', async (req, res) => {
  try {
    const db = res.locals.conn;
    const result = await db.query(
      `
      SELECT
        a.id,
        c.name AS clinic,
        COALESCE(u.formal_name, '') AS doctor,
        p.formal_name AS patient,
        s.name AS status,
        TO_CHAR(a.date, 'MM/DD/YYYY') AS date,
        TO_CHAR(a.time, 'HH12:MI AM') AS time,
        a.notes
      FROM tbl_appointments a
        INNER JOIN tbl_clinics c ON c.id = a.clinic_id
        LEFT JOIN tbl_users u ON u.id = a.user_id
        INNER JOIN tbl_patients p ON p.id = a.patient_id
        INNER JOIN tbl_appointment_status s ON s.id = a.status_id
      WHERE (a.date + a.time >= NOW())
        AND s.id = 2
      `
    );

    res.json({ data: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error_message: error.message });
  }
});

// POST: Appointment stats
router.post('/get_appointment_stats', async (req, res) => {
  const { params } = req.body;
  console.log('params: ', params);

  try {
    const db = res.locals.conn;
    const result = await db.query(
      `
      SELECT 'Total Appointments' AS label, COUNT(*) AS value, 'FaCalendarDay' AS icon
      FROM tbl_appointments a
        INNER JOIN tbl_clinics c ON c.id = a.clinic_id
        LEFT JOIN tbl_users u ON u.id = a.user_id
        INNER JOIN tbl_patients p ON p.id = a.patient_id
        INNER JOIN tbl_appointment_status s ON s.id = a.status_id
      WHERE a.date = $1

      UNION ALL

      SELECT 'Upcoming Appointments', COUNT(*), 'FaClock'
      FROM tbl_appointments a
        INNER JOIN tbl_clinics c ON c.id = a.clinic_id
        LEFT JOIN tbl_users u ON u.id = a
        .user_id
        INNER JOIN tbl_patients p ON p.id = a.patient_id
        INNER JOIN tbl_appointment_status s ON s.id = a.status_id
      WHERE a.date = $1
        AND s.id = 2

      UNION ALL

      SELECT 'Patients Needing Confirmation', COUNT(*), 'FaExclamationTriangle'
      FROM tbl_appointments a
        INNER JOIN tbl_clinics c ON c.id = a.clinic_id
        LEFT JOIN tbl_users u ON u.id = a.user_id
        INNER JOIN tbl_patients p ON p.id = a.patient_id
        INNER JOIN tbl_appointment_status s ON s.id = a.status_id
      WHERE a.date = $1
        AND s.id = 1

      UNION ALL

      SELECT 'Sent Reminders', 0, 'FaPaperPlane'
      `,
      [params.Date]
    );

    res.json({ data: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error_message: error.message });
  }
});

module.exports = router;
