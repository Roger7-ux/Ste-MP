"""Automatic schema migration. On every start the tables are created if they
are missing, and any column a model has gained since the database was made
(the `date` column that enables the daily reset, for example) is added in
place, so an older database keeps working without being deleted."""
from datetime import date, datetime

from sqlalchemy import inspect, text
from sqlalchemy.schema import CreateColumn, CreateIndex

from .extensions import db


def _default_sql(column):
    """A literal for existing rows when a new column must not be empty."""
    default = column.default.arg if column.default is not None and column.default.is_scalar else None
    if isinstance(default, bool):
        return "1" if default else "0"
    if isinstance(default, (int, float)):
        return str(default)
    if isinstance(default, str):
        return "'" + default.replace("'", "''") + "'"
    if not column.nullable:
        python_type = column.type.python_type
        if python_type in (int, float, bool):
            return "0"
        if python_type is str:
            return "''"
    return None


def _backfill_sql(column):
    """Dates cannot have a default in ALTER TABLE, so existing rows are filled
    in afterwards."""
    if column.nullable:
        return None
    python_type = column.type.python_type
    if python_type is date:
        return "CURRENT_DATE"
    if python_type is datetime:
        return "CURRENT_TIMESTAMP"
    return None


def ensure_schema():
    db.create_all()

    engine = db.engine
    inspector = inspect(engine)
    added = []
    with engine.begin() as connection:
        for table in db.metadata.sorted_tables:
            existing = {column["name"] for column in inspector.get_columns(table.name)}
            for column in table.columns:
                if column.name in existing:
                    continue
                # SQLite can only add a NOT NULL column together with a default.
                definition = str(CreateColumn(column).compile(engine)).replace(" NOT NULL", "")
                default = _default_sql(column)
                if default is not None:
                    definition += f" DEFAULT {default}"
                    if not column.nullable:
                        definition += " NOT NULL"
                connection.execute(text(f'ALTER TABLE "{table.name}" ADD COLUMN {definition}'))
                backfill = _backfill_sql(column)
                if backfill:
                    connection.execute(text(f'UPDATE "{table.name}" SET "{column.name}" = {backfill}'))
                added.append(f"{table.name}.{column.name}")

            known = {index["name"] for index in inspector.get_indexes(table.name)}
            for index in table.indexes:
                if index.name not in known:
                    connection.execute(text(str(CreateIndex(index, if_not_exists=True).compile(engine))))
    return added
