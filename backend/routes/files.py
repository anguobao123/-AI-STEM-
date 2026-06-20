from flask import Blueprint, jsonify

files_bp = Blueprint("files", __name__, url_prefix="/api/files")


@files_bp.get("/demo")
def files_demo():
    return jsonify(
        {
            "code": 200,
            "msg": "success",
            "data": {"message": "阶段 0 暂未开放真实文件上传。"},
        }
    )
