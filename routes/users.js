const express = require('express');
const router = express.Router();
const {isBlank} = require('../helpers/common')
const User = require('../models/users')
const sql = require('mssql');
const bcrypt = require('bcrypt');

router.post('/data_by_id', async (req, res) => {
  const conn = res.locals.conn
  let {id} = req.body

  let result = await conn.request()
    .input('id', sql.Int, id)
    .query(`SELECT Id, ClinicId, FirstName, LastName, Email, Password, RoleId
            FROM tblUsers
            WHERE Id = @id`)

  res.json({data: result.recordset[0]})
})

router.post('/save', async (req, res) => {
    const conn = res.locals.conn
    let {masterFormData, id} = req.body
    let errorMessage
    const transaction = await conn.transaction()
    await transaction.begin()
    try {
        let user = new User(transaction)

        if (masterFormData.Password) {
            const hashedPassword = await bcrypt.hash(masterFormData.Password, 10);
            masterFormData.Password = hashedPassword;
        }

        if(isBlank(id)){
            let result = await user.insert(masterFormData)
            id = result.Id
            await user.checkDuplicate(id, masterFormData)
        }
        else{
            const params = [
                { name: 'id', type: sql.Int, value: id }
            ]

            await user.update(params, masterFormData, 'Id = @id')
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
        let user = new User(transaction)

        await user.delete(id)
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
