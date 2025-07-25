const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const sql = require('mssql');

router.get('/get_appointment_upcoming', async (req, res) => {
  const conn = res.locals.conn

  let appointmentUpcoming = await conn.request()
    .query(`SELECT a.Id, c.Name AS Clinic, ISNULL(u.FormalName, '') AS [Doctor], p.FormalName AS [Patient], s.Name AS [Status], dbo.fnFormatDate('mm/dd/yyyy', a.[Date]) AS [Date], dbo.fnFormatTime(a.Time, '12', 1) AS [Time], a.Notes
            FROM tblAppointments a
              INNER JOIN tblClinics c ON c.Id = a.ClinicId
              LEFT JOIN tblUsers u ON u.Id = a.UserId
              INNER JOIN tblPatients p ON p.Id = a.PatientId
              INNER JOIN tblAppointmentStatus s ON s.Id = a.StatusId
            WHERE (a.DateTime >= GETDATE())
			AND s.Id = 2`)

  res.json({data: appointmentUpcoming.recordset})
})

router.post('/get_appointment_stats', async (req, res) => {
  const conn = res.locals.conn
  let {params} = req.body

  let appointmentStats= await conn.request()
    .input('date', sql.Date, params.Date)
    .query(`SELECT 'Total Appointments' AS label, COUNT(1) AS value, 'FaCalendarDay' AS icon
            FROM tblAppointments a
              INNER JOIN tblClinics c ON c.Id = a.ClinicId
              LEFT JOIN tblUsers u ON u.Id = a.UserId
              INNER JOIN tblPatients p ON p.Id = a.PatientId
              INNER JOIN tblAppointmentStatus s ON s.Id = a.StatusId
            WHERE a.Date = @date

            UNION ALL

            SELECT 'Upcoming Appointments', COUNT(1), 'FaClock'
                        FROM tblAppointments a
                        INNER JOIN tblClinics c ON c.Id = a.ClinicId
                        LEFT JOIN tblUsers u ON u.Id = a.UserId
                        INNER JOIN tblPatients p ON p.Id = a.PatientId
                        INNER JOIN tblAppointmentStatus s ON s.Id = a.StatusId
            WHERE a.Date = @date
                AND s.Id = 2

            UNION ALL

            SELECT 'Patients Needing Confirmation', COUNT(1), 'FaExclamationTriangle'
                FROM tblAppointments a
                INNER JOIN tblClinics c ON c.Id = a.ClinicId
                LEFT JOIN tblUsers u ON u.Id = a.UserId
                INNER JOIN tblPatients p ON p.Id = a.PatientId
                INNER JOIN tblAppointmentStatus s ON s.Id = a.StatusId
            WHERE a.Date = @date
                AND s.Id = 1

            UNION ALL

            SELECT 'Sent Reminders', 0, 'FaPaperPlane'
            `)

  res.json({data: appointmentStats.recordset})
})

module.exports = router;