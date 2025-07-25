const express = require('express');
const router = express.Router();
const {isBlank} = require('../helpers/common')
const Appointment = require('../models/appointments')
const Email = require('../models/emails')
const sql = require('mssql');

router.post('/data_by_id', async (req, res) => {
  const conn = res.locals.conn
  let {id} = req.body

  let result = await conn.request()
    .input('id', sql.Int, id)
    .query(`SELECT Id, UserId, ClinicId, PatientId, Date, Time, StatusId, Notes
            FROM tblAppointments
            WHERE Id = @id`)

  res.json({data: result.recordset[0]})
})

router.post('/details', async (req, res) => {
  const conn = res.locals.conn
  let {params} = req.body
  let {ClinicId, PatientId, StatusId} = params

  let result = await conn.request()
    .input('clinic_id', sql.Int, ClinicId)
    .input('patient_id', sql.Int, PatientId)
    .input('status_id', sql.Int, StatusId)
    .query(`
            SELECT a.Id, c.Name AS Clinic, ISNULL(u.FormalName, '') AS [Doctor], p.FormalName AS [Patient], s.Name AS [Status], dbo.fnFormatDate('mm/dd/yyyy', a.[Date]) AS [Date], dbo.fnFormatTime(a.Time, '12', 1) AS [Time], a.Notes
            FROM tblAppointments a
              INNER JOIN tblClinics c ON c.Id = a.ClinicId
              LEFT JOIN tblUsers u ON u.Id = a.UserId
              INNER JOIN tblPatients p ON p.Id = a.PatientId
              INNER JOIN tblAppointmentStatus s ON s.Id = a.StatusId
            WHERE (@clinic_id = 0 OR a.ClinicId = @clinic_id)
              AND (@patient_id = 0 OR a.PatientId = @patient_id)
              AND (@status_id = 0 OR a.StatusId = @status_id)
    `)

  res.json({data: result.recordset})
})

router.post('/save', async (req, res) => {
  const conn = res.locals.conn
  let {id, patientId, clinicId, statusId, date, time, reason} = req.body

  let errorMessage
  const transaction = await conn.transaction()
  await transaction.begin()
  try {
      let appointment = new Appointment(transaction)
      let email = new Email(transaction)
      let data = {
            PatientId: patientId,
            ClinicId: clinicId,
            StatusId: statusId,
            Date: date,
            Time: time,
            Notes: reason
        }

      if(isBlank(id)){
        console.log('test')
        let result = await appointment.insert(data)
        id = result.Id
        await appointment.checkDuplicate(id, data)
      }
      else{
        const params = [
            { name: 'id', type: sql.Int, value: id }
        ]

        await appointment.update(params, data, 'Id = @id')
      }

      let appointmentResult = await transaction.request()
      .input('id', sql.Int, id)
      .query(`
              SELECT s.IsSendEmail, s.Name AS Status, u.Email AS SenderEmail, p.Email AS RecipientEmail, a.[Date], a.[Time]
              FROM tblAppointments a
                INNER JOIN tblUsers u ON u.Id = a.UserId
                INNER JOIN tblPatients p ON p.Id = a.PatientId
                INNER JOIN tblAppointmentStatus s ON s.Id = a.StatusId
              WHERE a.Id = @id
      `)

      if (appointmentResult.recordset.length > 0){

        let {IsSendEmail, Status, SenderEmail, RecipientEmail, Date, Time} = appointmentResult.recordset[0]

        if(IsSendEmail){
          let emailData = {
            "AppointmentId": id,
            "SenderEmail": RecipientEmail,
            "RecipientEmail": SenderEmail,
            "Subject": `Your Appointment is ${Status}`,
            "Body": `Dear Patient, your appointment with HealthFirst Medical Center has been ${Status} for ${Date} at ${Time}.`
          }

          await email.insert(emailData)
        }
      }

      await transaction.commit()
  } catch (error) {
    console.log('error: ', error);
      errorMessage = error.message
      await transaction.rollback()
  }
  finally{
      res.json({error_message: errorMessage})
  }
});

router.post('/delete', async (req, res) => {
    const conn = res.locals.conn
    let {id} = req.body
    let errorMessage
    const transaction = await conn.transaction()
    await transaction.begin()
    try {
        let appointment = new Appointment(transaction)

        await appointment.delete(id)
        await transaction.commit()
    } catch (error) {
        errorMessage = error.message
        await transaction.rollback()
    }
    finally{
        res.json({error_message: errorMessage})
    }
});

router.get('/get_appointment_look_ups', async (req, res) => {
  const conn = res.locals.conn

  let appointmentStatus = await conn.request()
    .query(`SELECT Id AS id, Name  AS value
            FROM tblAppointmentStatus`)

  res.json({data: appointmentStatus.recordset})
})

module.exports = router;
