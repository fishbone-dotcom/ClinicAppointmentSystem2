class PostgresAdapter {
  constructor(db) {
    this._db = db; // This is your pool or db helper
    this.tableName = '';
    this.primaryKey = '';
    this.modelName = '';
  }

  getConnection() {
    return this._db;
  }

  async insert(attributes) {
    delete attributes[this.primaryKey];

    const columns = Object.keys(attributes);
    const values = Object.values(attributes);

    const placeholders = columns.map((_, idx) => `$${idx + 1}`);

    const insertSQL = `
      INSERT INTO ${this.tableName} (${columns.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING ${this.primaryKey};
    `;

    const result = await this._db.query(insertSQL, values);

    if (result.rows.length > 0) {
      attributes[this.primaryKey] = result.rows[0][this.primaryKey];
    }

    return attributes;
  }

  async update(id, attributes, whereCondition) {
    delete attributes[this.primaryKey];

    const columns = Object.keys(attributes);
    const values = Object.values(attributes);

    const setClauses = columns.map((col, idx) => `${col} = $${idx + 1}`);
    const params = [...values];

    let updateSQL = `UPDATE ${this.tableName} SET ${setClauses.join(', ')}`;

    if (whereCondition) {
      updateSQL += ` WHERE ${whereCondition}`;
    } else {
      updateSQL += ` WHERE ${this.primaryKey} = $${params.length + 1}`;
      params.push(id);
    }

    await this._db.query(updateSQL, params);
  }

  async delete(id, whereCondition) {
    let deleteSQL = `DELETE FROM ${this.tableName}`;
    let params = [];

    if (whereCondition) {
      deleteSQL += ` WHERE ${whereCondition}`;
      // Ids must be already part of the condition’s params if needed
    } else {
      deleteSQL += ` WHERE ${this.primaryKey} = $1`;
      params = [id];
    }

    await this._db.query(deleteSQL, params);
  }

  async checkDuplicate(id, attributes) {
    delete attributes[this.primaryKey];

    const columns = Object.keys(attributes);
    const values = Object.values(attributes);

    const whereClauses = columns.map((col, idx) => `${col} = $${idx + 1}`);
    const params = [...values];

    let whereSQL = whereClauses.join(' AND ');
    whereSQL += ` AND ${this.primaryKey} <> $${params.length + 1}`;
    params.push(id);

    const result = await this._db.query(
      `SELECT * FROM ${this.tableName} WHERE ${whereSQL}`,
      params
    );

    if (result.rows.length > 0 && columns.length > 0) {
      throw new Error(
        `${this.modelName} ${columns[0]} is already being used in the database.`
      );
    }
  }
}

module.exports = PostgresAdapter;
