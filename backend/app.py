from flask import Flask, jsonify
from flask_cors import CORS

from config import Config
from models import db
from routes import auth_bp, community_bp, experiments_bp, files_bp, gallery_bp, records_bp, reports_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app)
    db.init_app(app)

    app.register_blueprint(auth_bp)
    app.register_blueprint(experiments_bp)
    app.register_blueprint(reports_bp)
    app.register_blueprint(files_bp)
    app.register_blueprint(gallery_bp)
    app.register_blueprint(records_bp)
    app.register_blueprint(community_bp)

    with app.app_context():
        db.create_all()
        _ensure_columns(app)

    @app.get("/api/health")
    def health():
        return jsonify({"code": 200, "msg": "success", "data": {"status": "ok"}})

    return app


def _ensure_columns(app):
    """Lightweight migration: add missing columns to existing tables."""
    import sqlite3
    from sqlalchemy import text

    uri = app.config.get("SQLALCHEMY_DATABASE_URI", "")
    if not uri or not uri.startswith("sqlite"):
        return

    db_path = uri.replace("sqlite:///", "", 1)
    if not db_path:
        return

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.execute("PRAGMA table_info(experiment_records)")
        existing = {row[1] for row in cursor.fetchall()}
        conn.close()
    except Exception:
        return

    needed = {
        "optimization_plan": "TEXT DEFAULT ''",
        "reflection": "TEXT DEFAULT ''",
        "version_compare": "TEXT DEFAULT '[]'",
        "stem_summary": "TEXT DEFAULT '{}'",
        "model_version": "INTEGER DEFAULT 0",
        "project_name": "TEXT DEFAULT ''",
        "group_name": "TEXT DEFAULT ''",
        "author_name": "TEXT DEFAULT ''",
        "hypothesis": "TEXT DEFAULT ''",
        "variable_description": "TEXT DEFAULT ''",
        "dataset_note": "TEXT DEFAULT ''",
        "conclusion": "TEXT DEFAULT ''",
        "experiment_log": "TEXT DEFAULT '[]'",
    }

    for col_name, col_def in needed.items():
        if col_name not in existing:
            try:
                db.session.execute(text(f"ALTER TABLE experiment_records ADD COLUMN {col_name} {col_def}"))
                db.session.commit()
            except Exception:
                db.session.rollback()


app = create_app()


if __name__ == "__main__":
    app.run(debug=True)
