const PostgresAdapter = require('../helpers/pg_adapter')

class Patient extends PostgresAdapter {
    constructor(conn) {
        super(conn)
        this.tableName = 'tbl_patients'
        this.primaryKey = 'id'
        this.modelName = 'Patient'
    }
}

module.exports = Patient