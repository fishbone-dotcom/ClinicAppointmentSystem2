const PostgresAdapter = require('../helpers/pg_adapter')

class Email extends PostgresAdapter {
    constructor(conn) {
        super(conn)
        this.tableName = 'tbl_emails'
        this.primaryKey = 'id'
        this.modelName = 'Email'
    }
}

module.exports = Email