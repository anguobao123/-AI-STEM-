from flask import Blueprint, jsonify

gallery_bp = Blueprint("gallery", __name__, url_prefix="/api/gallery")


@gallery_bp.get("/demo")
def gallery_demo():
    items = [
        {
            "id": 1,
            "title": "水果分类入门 · 苹果 vs 香蕉",
            "description": "使用少量图片训练初始模型 1.0，观察 AI 认图的基本原理。",
            "taskType": "水果分类入门",
            "accuracy": 0.89,
            "classCount": 2,
            "sampleCount": 48,
            "author": "示例学生",
            "createdAt": "2026-06-17",
            "reportId": 1,
        },
        {
            "id": 2,
            "title": "校园物品分类 · 优化对比",
            "description": "通过增加训练图片数量，对比模型 1.0 和模型 2.0 的表现变化。",
            "taskType": "样本数量优化实验",
            "accuracy": 0.94,
            "classCount": 3,
            "sampleCount": 120,
            "author": "课程演示组",
            "createdAt": "2026-06-16",
            "reportId": 1,
        },
        {
            "id": 3,
            "title": "数据质量优化 · 减少混淆",
            "description": "分析混淆矩阵，针对性补充训练图片，减少相似类别间的误判。",
            "taskType": "数据质量优化实验",
            "accuracy": 0.90,
            "classCount": 3,
            "sampleCount": 72,
            "author": "课程演示组",
            "createdAt": "2026-06-15",
            "reportId": 1,
        },
    ]
    return jsonify({"code": 200, "msg": "success", "data": {"items": items}})
