const PostgresAdapter = require('../helpers/pg_adapter');

class Clinic extends PostgresAdapter {
  constructor(db) {
    super(db);
    this.tableName = 'tbl_clinics'; // ✅ use snake_case for Postgres
    this.primaryKey = 'id';
    this.modelName = 'Clinic';
  }
}

module.exports = Clinic;
