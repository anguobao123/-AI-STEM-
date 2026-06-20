from flask import Blueprint, jsonify

gallery_bp = Blueprint("gallery", __name__, url_prefix="/api/gallery")


@gallery_bp.get("/demo")
def gallery_demo():
    items = [
        {
            "id": 1,
            "title": "校园植物识别实验",
            "description": "基于叶片图片训练三分类模型，观察样本数量对准确率的影响。",
            "taskType": "样本数量实验",
            "accuracy": 0.91,
            "classCount": 3,
            "sampleCount": 90,
            "author": "示例学生",
            "createdAt": "2026-06-17",
            "reportId": 1,
        },
        {
            "id": 2,
            "title": "交通标志识别实验",
            "description": "对比训练轮次变化对交通标志分类模型稳定性的影响。",
            "taskType": "训练轮次实验",
            "accuracy": 0.93,
            "classCount": 5,
            "sampleCount": 150,
            "author": "课程演示组",
            "createdAt": "2026-06-16",
            "reportId": 1,
        },
        {
            "id": 3,
            "title": "水果分类增强实验",
            "description": "引入翻转和裁剪增强策略后，对比模型在新样本上的识别效果。",
            "taskType": "数据增强实验",
            "accuracy": 0.95,
            "classCount": 4,
            "sampleCount": 120,
            "author": "实验助教",
            "createdAt": "2026-06-15",
            "reportId": 1,
        },
    ]
    return jsonify({"code": 200, "msg": "success", "data": {"items": items}})
