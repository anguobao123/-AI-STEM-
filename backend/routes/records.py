import json
from datetime import datetime

from flask import Blueprint, jsonify, request

from models import ExperimentRecord, db

records_bp = Blueprint("records", __name__, url_prefix="/api")


LAB_DEMO = {
    "experimentId": "sample-count",
    "title": "样本数量对模型准确率的影响",
    "objective": "理解样本数量与模型泛化能力之间的关系",
    "currentStep": 0,
    "steps": [
        {"key": "task", "title": "选择实验任务", "description": "明确本次实验目标、变量和观察指标。"},
        {"key": "dataset", "title": "准备数据集", "description": "按类别准备图像样本，并检查样本数量。"},
        {"key": "config", "title": "设置实验变量", "description": "设置训练轮次、学习率、批次大小和数据增强。"},
        {"key": "training", "title": "开始训练", "description": "观察模型训练过程中的准确率和损失变化。"},
        {"key": "testing", "title": "测试模型", "description": "上传测试图片，查看预测类别和置信度。"},
        {"key": "save", "title": "保存记录", "description": "保存实验结果，进入结果分析页面。"},
    ],
    "variables": [
        {"name": "每类样本数量", "value": "5 / 20 / 50", "description": "用于观察样本数量变化对模型效果的影响。"},
        {"name": "训练轮次", "value": "20", "description": "控制模型完整学习数据集的次数。"},
        {"name": "验证集比例", "value": "20%", "description": "用于评估模型在未参与训练数据上的表现。"},
    ],
    "datasetSummary": {
        "classCount": 3,
        "totalImages": 90,
        "classes": [
            {"name": "校园植物", "imageCount": 30, "trainCount": 24, "valCount": 6},
            {"name": "生活用品", "imageCount": 30, "trainCount": 24, "valCount": 6},
            {"name": "动物图片", "imageCount": 30, "trainCount": 24, "valCount": 6},
        ],
    },
    "trainConfig": {
        "epochs": 20,
        "learningRate": 0.001,
        "batchSize": 16,
        "validationSplit": 0.2,
        "augmentation": {"flip": True, "crop": False, "brightness": True, "rotation": False},
    },
    "mockRecordId": 1,
}


RECORD_DEMO = {
    "recordId": 1,
    "experimentId": "sample-count",
    "title": "样本数量对模型准确率的影响",
    "objective": "理解样本数量与模型泛化能力之间的关系",
    "status": "completed",
    "summary": {
        "accuracy": 0.91,
        "loss": 0.18,
        "classCount": 3,
        "sampleCount": 90,
        "errorCount": 6,
    },
    "datasetSummary": LAB_DEMO["datasetSummary"],
    "trainConfig": LAB_DEMO["trainConfig"],
    "chartData": {
        "epochs": [1, 5, 10, 15, 20],
        "accuracy": [0.42, 0.58, 0.74, 0.86, 0.91],
        "valAccuracy": [0.38, 0.52, 0.68, 0.8, 0.86],
        "loss": [1.28, 0.96, 0.61, 0.33, 0.18],
        "valLoss": [1.36, 1.04, 0.78, 0.46, 0.29],
    },
    "confusionMatrix": {
        "labels": ["校园植物", "生活用品", "动物图片"],
        "matrix": [[18, 1, 1], [2, 17, 1], [0, 1, 19]],
    },
    "errorSamples": [
        {
            "id": 1,
            "imageName": "plant_08.jpg",
            "trueLabel": "校园植物",
            "predictedLabel": "生活用品",
            "confidence": 0.67,
            "reason": "背景中出现桌面和物品，模型可能更关注背景特征。",
        },
        {
            "id": 2,
            "imageName": "object_11.jpg",
            "trueLabel": "生活用品",
            "predictedLabel": "校园植物",
            "confidence": 0.61,
            "reason": "图像中绿色面积较大，与植物类别特征相近。",
        },
    ],
    "suggestions": [
        "增加每个类别的样本数量。",
        "减少背景干扰明显的图片。",
        "为容易混淆的类别补充更多不同角度的样本。",
        "后续可以对比开启和关闭数据增强后的效果。",
    ],
}


def get_mock_record(record_id):
    return {**RECORD_DEMO, "recordId": int(record_id)}


@records_bp.get("/lab/demo/<experiment_id>")
def lab_demo(experiment_id):
    data = {**LAB_DEMO, "experimentId": experiment_id}
    return jsonify({"code": 200, "msg": "success", "data": data})


@records_bp.get("/records/demo/<record_id>")
def record_demo(record_id):
    return jsonify({"code": 200, "msg": "success", "data": get_mock_record(record_id)})


@records_bp.post("/records")
def create_record():
    payload = request.get_json(silent=True) or {}
    experiment_id = payload.get("experimentId")
    title = payload.get("title")

    if not experiment_id or not title:
        return (
            jsonify({"code": 400, "msg": "experimentId and title are required", "data": None}),
            400,
        )

    record = ExperimentRecord.from_payload(payload)
    db.session.add(record)
    db.session.commit()
    return jsonify({"code": 200, "msg": "success", "data": {"recordId": record.id}})


@records_bp.get("/records/<record_id>")
def get_record(record_id):
    record = ExperimentRecord.query.get(record_id)
    if not record:
        return jsonify({"code": 404, "msg": "record not found", "data": None}), 404
    return jsonify({"code": 200, "msg": "success", "data": record.to_dict()})


@records_bp.delete("/records/<record_id>")
def delete_record(record_id):
    record = ExperimentRecord.query.get(record_id)
    if not record:
        return jsonify({"code": 404, "msg": "record not found", "data": None}), 404

    db.session.delete(record)
    db.session.commit()
    return jsonify({"code": 200, "msg": "success", "data": {"recordId": int(record_id), "deleted": True}})


@records_bp.put("/records/<record_id>")
def update_record(record_id):
    record = ExperimentRecord.query.get(record_id)
    if not record:
        return jsonify({"code": 404, "msg": "record not found", "data": None}), 404

    payload = request.get_json(silent=True) or {}
    # Only update text-type fields that students can edit
    for field, attr in [
        ("projectName", "project_name"),
        ("groupName", "group_name"),
        ("authorName", "author_name"),
        ("objective", "objective"),
        ("hypothesis", "hypothesis"),
        ("variableDescription", "variable_description"),
        ("datasetNote", "dataset_note"),
        ("conclusion", "conclusion"),
        ("optimizationPlan", "optimization_plan"),
        ("reflection", "reflection"),
    ]:
        if field in payload:
            setattr(record, attr, payload[field])
    if "stemSummary" in payload:
        record.stem_summary = json.dumps(payload["stemSummary"], ensure_ascii=False)
    if "title" in payload:
        record.title = payload["title"]
    log_items = record.to_dict().get("experimentLog", [])
    log_items.append(
        {
            "time": datetime.utcnow().isoformat(),
            "step": "保存后编辑",
            "event": "edit_record",
            "action": "保存后编辑实验记录",
            "detail": "更新可编辑文本字段",
            "modelVersion": record.model_version or 0,
        }
    )
    record.experiment_log = json.dumps(log_items, ensure_ascii=False)
    db.session.commit()
    return jsonify({"code": 200, "msg": "success", "data": record.to_dict()})


@records_bp.get("/records")
def list_records():
    items = []
    records = ExperimentRecord.query.order_by(ExperimentRecord.created_at.desc()).all()
    for record in records:
        record_data = record.to_dict()
        summary = record_data.get("summary", {}) or {}
        train_config = record_data.get("trainConfig", {}) or {}
        confusion_matrix = record_data.get("confusionMatrix", {}) or {}
        dataset_summary = record_data.get("datasetSummary", {}) or {}
        model_info = summary.get("modelInfo", {}) or {}
        model_key = model_info.get("modelKey")
        class_names = (
            model_info.get("classNames")
            or confusion_matrix.get("labels")
            or [item.get("name") for item in dataset_summary.get("classes", []) if item.get("name")]
            or []
        )
        items.append(
            {
                "recordId": record_data["recordId"],
                "experimentId": record_data["experimentId"],
                "title": record_data["title"],
                "objective": record_data.get("objective", ""),
                "status": record_data["status"],
                "accuracy": summary.get("accuracy", 0),
                "testAccuracy": summary.get("testAccuracy", summary.get("accuracy", 0)),
                "loss": summary.get("loss", 0),
                "sampleCount": summary.get("sampleCount", 0),
                "classCount": summary.get("classCount", 0),
                "classNames": class_names,
                "errorCount": summary.get("errorCount", 0),
                "createdAt": record_data.get("createdAt"),
                "hasLocalModel": bool(model_key),
                "modelKey": model_key,
                "modelStorage": train_config.get("modelStorage", {}),
                "modelCreatedAt": model_info.get("createdAt") or model_info.get("savedAt"),
                "optimizationPlan": record_data.get("optimizationPlan", ""),
                "modelVersion": record_data.get("modelVersion", 0),
                "hasVersionCompare": bool(record_data.get("versionCompare", [])),
                "reflection": record_data.get("reflection", ""),
                "stemSummary": record_data.get("stemSummary", {}),
                "projectName": record_data.get("projectName", ""),
                "groupName": record_data.get("groupName", ""),
                "authorName": record_data.get("authorName", ""),
                "hypothesis": record_data.get("hypothesis", ""),
                "variableDescription": record_data.get("variableDescription", ""),
                "datasetNote": record_data.get("datasetNote", ""),
                "conclusion": record_data.get("conclusion", ""),
                "experimentLog": record_data.get("experimentLog", []),
            }
        )
    return jsonify({"code": 200, "msg": "success", "data": {"items": items}})
