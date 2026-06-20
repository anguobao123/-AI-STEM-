from flask import Blueprint, jsonify, request

from models import CommunityShare, ExperimentRecord, db

community_bp = Blueprint("community", __name__, url_prefix="/api")


def _class_names(record_data):
    summary = record_data.get("summary", {}) or {}
    model_info = summary.get("modelInfo", {}) or {}
    if isinstance(model_info.get("classNames"), list) and model_info.get("classNames"):
        return model_info.get("classNames")

    confusion_matrix = record_data.get("confusionMatrix", {}) or {}
    if isinstance(confusion_matrix.get("labels"), list) and confusion_matrix.get("labels"):
        return confusion_matrix.get("labels")

    dataset_summary = record_data.get("datasetSummary", {}) or {}
    classes = dataset_summary.get("classes", []) or []
    return [item.get("name") for item in classes if item.get("name")]


def _build_model_metadata(record_data):
    summary = record_data.get("summary", {}) or {}
    train_config = record_data.get("trainConfig", {}) or {}
    model_info = summary.get("modelInfo", {}) or {}
    model_storage = train_config.get("modelStorage", {}) or {}
    model_key = model_info.get("modelKey") or model_storage.get("modelKey")

    if not model_key:
        return {}

    metadata = {
        **model_info,
        "modelKey": model_key,
        "storage": model_info.get("storage") or model_storage.get("storage") or "indexeddb",
        "localOnly": model_info.get("localOnly", model_storage.get("localOnly", True)),
        "classNames": model_info.get("classNames") or _class_names(record_data),
        "imageSize": model_info.get("imageSize") or train_config.get("imageSize"),
        "availabilityNote": "模型文件不会自动同步到社区，需后续模型上传/导出支持。",
    }
    return metadata


def _build_report_snapshot(record_data, experiment_title):
    summary = record_data.get("summary", {}) or {}
    dataset_summary = record_data.get("datasetSummary", {}) or {}
    confusion_matrix = record_data.get("confusionMatrix", {}) or {}

    return {
        "recordId": record_data.get("recordId"),
        "title": record_data.get("title") or experiment_title,
        "experimentTitle": experiment_title,
        "objective": record_data.get("objective", ""),
        "summary": {
            "accuracy": summary.get("accuracy", 0),
            "testAccuracy": summary.get("testAccuracy", summary.get("accuracy", 0)),
            "loss": summary.get("loss", 0),
            "classCount": summary.get("classCount", dataset_summary.get("classCount", 0)),
            "sampleCount": summary.get("sampleCount", dataset_summary.get("totalImages", 0)),
            "errorCount": summary.get("errorCount", 0),
            "testCount": summary.get("testCount", 0),
            "testCorrectCount": summary.get("testCorrectCount", 0),
        },
        "datasetSummary": {
            "classCount": dataset_summary.get("classCount", 0),
            "totalImages": dataset_summary.get("totalImages", 0),
            "classes": dataset_summary.get("classes", []),
        },
        "confusionMatrix": confusion_matrix,
        "suggestions": record_data.get("suggestions", []),
        "createdAt": record_data.get("createdAt"),
        "privacyNote": "社区分享不包含原始训练图片。",
    }


def _build_share_payload(record, payload):
    record_data = record.to_dict()
    summary = record_data.get("summary", {}) or {}
    dataset_summary = record_data.get("datasetSummary", {}) or {}
    experiment_title = payload.get("experimentTitle") or payload.get("sourceExperiment") or record_data.get("title", "")
    class_count = summary.get("classCount", dataset_summary.get("classCount", 0)) or 0
    sample_count = summary.get("sampleCount", dataset_summary.get("totalImages", 0)) or 0
    accuracy = summary.get("testAccuracy", summary.get("accuracy", 0)) or 0
    model_metadata = _build_model_metadata(record_data)

    return {
        "recordId": record_data.get("recordId"),
        "title": payload.get("title") or record_data.get("title") or experiment_title,
        "experimentId": record_data.get("experimentId", ""),
        "experimentTitle": experiment_title,
        "summary": {
            **summary,
            "classNames": _class_names(record_data),
        },
        "accuracy": accuracy,
        "classCount": class_count,
        "sampleCount": sample_count,
        "reportSnapshot": _build_report_snapshot(record_data, experiment_title),
        "modelIncluded": bool(model_metadata),
        "modelMetadata": model_metadata,
    }


@community_bp.post("/community/shares")
def create_community_share():
    payload = request.get_json(silent=True) or {}
    record_id = payload.get("recordId")
    if not record_id:
        return jsonify({"code": 400, "msg": "recordId is required", "data": None}), 400

    record = ExperimentRecord.query.get(record_id)
    if not record:
        return jsonify({"code": 404, "msg": "record not found", "data": None}), 404

    share_payload = _build_share_payload(record, payload)
    share = CommunityShare.from_payload(share_payload)
    db.session.add(share)
    db.session.commit()
    return jsonify({"code": 200, "msg": "success", "data": share.to_dict()})


@community_bp.get("/community/shares")
def list_community_shares():
    shares = CommunityShare.query.order_by(CommunityShare.created_at.desc()).all()
    items = []
    for share in shares:
        data = share.to_dict()
        items.append(
            {
                "shareId": data["shareId"],
                "recordId": data["recordId"],
                "title": data["title"],
                "experimentId": data["experimentId"],
                "experimentTitle": data["experimentTitle"],
                "accuracy": data["accuracy"],
                "classCount": data["classCount"],
                "sampleCount": data["sampleCount"],
                "modelIncluded": data["modelIncluded"],
                "modelMetadata": data["modelMetadata"],
                "createdAt": data["createdAt"],
            }
        )
    return jsonify({"code": 200, "msg": "success", "data": {"items": items}})


@community_bp.get("/community/shares/<share_id>")
def get_community_share(share_id):
    share = CommunityShare.query.get(share_id)
    if not share:
        return jsonify({"code": 404, "msg": "share not found", "data": None}), 404
    return jsonify({"code": 200, "msg": "success", "data": share.to_dict()})
