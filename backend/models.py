import json
from datetime import datetime

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


def _safe_json_loads(value, default):
    if value in (None, ""):
      return default
    try:
      return json.loads(value)
    except (TypeError, ValueError, json.JSONDecodeError):
      return default


def _safe_json_dumps(value, default):
    try:
      return json.dumps(value if value is not None else default, ensure_ascii=False)
    except (TypeError, ValueError):
      return json.dumps(default, ensure_ascii=False)


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False)
    role = db.Column(db.String(32), default="student", nullable=False)


class ExperimentRecord(db.Model):
    __tablename__ = "experiment_records"

    id = db.Column(db.Integer, primary_key=True)
    experiment_id = db.Column(db.String(100), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    objective = db.Column(db.Text, default="")
    status = db.Column(db.String(50), default="completed")
    dataset_summary = db.Column(db.Text, default="{}")
    train_config = db.Column(db.Text, default="{}")
    summary = db.Column(db.Text, default="{}")
    chart_data = db.Column(db.Text, default="{}")
    confusion_matrix = db.Column(db.Text, default="{}")
    error_samples = db.Column(db.Text, default="[]")
    suggestions = db.Column(db.Text, default="[]")
    optimization_plan = db.Column(db.Text, default="")
    reflection = db.Column(db.Text, default="")
    version_compare = db.Column(db.Text, default="[]")
    stem_summary = db.Column(db.Text, default="{}")
    model_version = db.Column(db.Integer, default=0)
    project_name = db.Column(db.String(200), default="")
    group_name = db.Column(db.String(100), default="")
    author_name = db.Column(db.String(100), default="")
    hypothesis = db.Column(db.Text, default="")
    variable_description = db.Column(db.Text, default="")
    dataset_note = db.Column(db.Text, default="")
    conclusion = db.Column(db.Text, default="")
    experiment_log = db.Column(db.Text, default="[]")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "recordId": self.id,
            "experimentId": self.experiment_id,
            "title": self.title,
            "objective": self.objective or "",
            "status": self.status or "completed",
            "summary": _safe_json_loads(self.summary, {}),
            "datasetSummary": _safe_json_loads(self.dataset_summary, {}),
            "trainConfig": _safe_json_loads(self.train_config, {}),
            "chartData": _safe_json_loads(self.chart_data, {}),
            "confusionMatrix": _safe_json_loads(self.confusion_matrix, {}),
            "errorSamples": _safe_json_loads(self.error_samples, []),
            "suggestions": _safe_json_loads(self.suggestions, []),
            "optimizationPlan": self.optimization_plan or "",
            "reflection": self.reflection or "",
            "versionCompare": _safe_json_loads(self.version_compare, []),
            "stemSummary": _safe_json_loads(self.stem_summary, {}),
            "modelVersion": self.model_version or 0,
            "projectName": self.project_name or "",
            "groupName": self.group_name or "",
            "authorName": self.author_name or "",
            "hypothesis": self.hypothesis or "",
            "variableDescription": self.variable_description or "",
            "datasetNote": self.dataset_note or "",
            "conclusion": self.conclusion or "",
            "experimentLog": _safe_json_loads(self.experiment_log, []),
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
        }

    @staticmethod
    def from_payload(payload):
        payload = payload or {}
        return ExperimentRecord(
            experiment_id=payload.get("experimentId", ""),
            title=payload.get("title", ""),
            objective=payload.get("objective", ""),
            status=payload.get("status", "completed"),
            dataset_summary=_safe_json_dumps(payload.get("datasetSummary"), {}),
            train_config=_safe_json_dumps(payload.get("trainConfig"), {}),
            summary=_safe_json_dumps(payload.get("summary"), {}),
            chart_data=_safe_json_dumps(payload.get("chartData"), {}),
            confusion_matrix=_safe_json_dumps(payload.get("confusionMatrix"), {}),
            error_samples=_safe_json_dumps(payload.get("errorSamples"), []),
            suggestions=_safe_json_dumps(payload.get("suggestions"), []),
            optimization_plan=payload.get("optimizationPlan", ""),
            reflection=payload.get("reflection", ""),
            version_compare=_safe_json_dumps(payload.get("versionCompare"), []),
            stem_summary=_safe_json_dumps(payload.get("stemSummary"), {}),
            model_version=payload.get("modelVersion", 0),
            project_name=payload.get("projectName", ""),
            group_name=payload.get("groupName", ""),
            author_name=payload.get("authorName", ""),
            hypothesis=payload.get("hypothesis", ""),
            variable_description=payload.get("variableDescription", ""),
            dataset_note=payload.get("datasetNote", ""),
            conclusion=payload.get("conclusion", ""),
            experiment_log=_safe_json_dumps(payload.get("experimentLog"), []),
        )


class Report(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(128), nullable=False)
    conclusion = db.Column(db.Text, default="")


class GalleryProject(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(128), nullable=False)
    task_name = db.Column(db.String(128), nullable=False)
    accuracy = db.Column(db.Float, default=0.0)


class CommunityShare(db.Model):
    __tablename__ = "community_shares"

    id = db.Column(db.Integer, primary_key=True)
    record_id = db.Column(db.Integer, nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)
    experiment_id = db.Column(db.String(100), nullable=False)
    experiment_title = db.Column(db.String(200), nullable=False)
    summary = db.Column(db.Text, default="{}")
    accuracy = db.Column(db.Float, default=0.0)
    class_count = db.Column(db.Integer, default=0)
    sample_count = db.Column(db.Integer, default=0)
    report_snapshot = db.Column(db.Text, default="{}")
    model_included = db.Column(db.Boolean, default=False)
    model_metadata = db.Column(db.Text, default="{}")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "shareId": self.id,
            "recordId": self.record_id,
            "title": self.title,
            "experimentId": self.experiment_id,
            "experimentTitle": self.experiment_title,
            "summary": _safe_json_loads(self.summary, {}),
            "accuracy": self.accuracy or 0,
            "classCount": self.class_count or 0,
            "sampleCount": self.sample_count or 0,
            "reportSnapshot": _safe_json_loads(self.report_snapshot, {}),
            "modelIncluded": bool(self.model_included),
            "modelMetadata": _safe_json_loads(self.model_metadata, {}),
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }

    @staticmethod
    def from_payload(payload):
        payload = payload or {}
        return CommunityShare(
            record_id=payload.get("recordId", 0),
            title=payload.get("title", ""),
            experiment_id=payload.get("experimentId", ""),
            experiment_title=payload.get("experimentTitle", ""),
            summary=_safe_json_dumps(payload.get("summary"), {}),
            accuracy=payload.get("accuracy", 0) or 0,
            class_count=payload.get("classCount", 0) or 0,
            sample_count=payload.get("sampleCount", 0) or 0,
            report_snapshot=_safe_json_dumps(payload.get("reportSnapshot"), {}),
            model_included=bool(payload.get("modelIncluded", False)),
            model_metadata=_safe_json_dumps(payload.get("modelMetadata"), {}),
        )
