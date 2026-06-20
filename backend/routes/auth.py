from flask import Blueprint, jsonify

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.get("/demo")
def auth_demo():
    return jsonify({"code": 200, "msg": "success", "data": {"enabled": False}})
