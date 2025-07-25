const express = require('express');
const router = express.Router();
const {isBlank} = require('../helpers/common')
const Patient = require('../models/patients')
const sql = require('mssql');

router.post('/data_by_id', async (req, res) => {
  const conn = res.locals.conn
  let {id} = req.body

  let result = await conn.request()
    .input('id', sql.Int, id)
    .query(`SELECT Id, FirstName, LastName, Email, Phone
            FROM tblPatients
            WHERE Id = @id`)

  res.json({data: result.recordset[0]})
})

router.post('/details', async (req, res) => {
  const conn = res.locals.conn

  let result = await conn.request()
    .query(`SELECT Id, FormalName, Email, Phone
            FROM tblPatients
            ORDER BY FormalName`)

  res.json({data: result.recordset})
})

router.get('/get_patient_look_ups', async (req, res) => {
  const conn = res.locals.conn

  let result = await conn.request()
    .query(`SELECT Id AS id, FormalName AS value
            FROM tblPatients
            ORDER BY FormalName`)

  res.json({data: result.recordset})
})

router.post('/save', async (req, res) => {
    const conn = res.locals.conn
    let {id, firstName, lastName, email, phone} = req.body
    console.log('req.body: ', req.body);
    let errorMessage
    const transaction = await conn.transaction()
    await transaction.begin()
    try {
        let patient = new Patient(transaction)
        let data = {
            FirstName: firstName,
            LastName: lastName,
            Email: email,
            Phone: phone
        }

        if(isBlank(id)){
            let result = await patient.insert(data)
            id = result.Id
            await patient.checkDuplicate(id, data)
        }
        else{
            const params = [
                { name: 'id', type: sql.Int, value: id }
            ]

            await patient.update(params, data, 'Id = @id')
        }

        await transaction.commit()
    } catch (error) {
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
        let patient = new Patient(transaction)

        await patient.delete(id)
        await transaction.commit()
    } catch (error) {
        errorMessage = error.message
        await transaction.rollback()
    }
    finally{
        res.json({error_message: errorMessage})
    }
});

module.exports = router;
