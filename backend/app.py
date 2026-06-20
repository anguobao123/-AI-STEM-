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

    @app.get("/api/health")
    def health():
        return jsonify({"code": 200, "msg": "success", "data": {"status": "ok"}})

    return app


app = create_app()


if __name__ == "__main__":
    app.run(debug=True)
