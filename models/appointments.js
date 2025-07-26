const PostgresAdapter = require('../helpers/pg_adapter');
class Appointment extends PostgresAdapter {
  constructor(db) {
    super(db);
    this.tableName = 'tbl_appointments'; // ✅ use snake_case sa Postgres
    this.primaryKey = 'id';
    this.modelName = 'Appointment';
  }
}

module.exports = Appointment;