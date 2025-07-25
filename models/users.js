const PostgresAdapter = require('../helpers/pg_adapter')

class User extends PostgresAdapter {
    constructor(conn) {
        super(conn)
        this.tableName = 'tbl_users'
        this.primaryKey = 'id'
        this.modelName = 'User'
    }
}

module.exports = User