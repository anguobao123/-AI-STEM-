from app import app
from models import ExperimentRecord, db


def seed_sample_record():
    exists = ExperimentRecord.query.filter_by(id=1).first()
    if exists:
        return

    record = ExperimentRecord.from_payload(
        {
            "experimentId": "sample-count",
            "title": "样本数量对模型准确率的影响",
            "objective": "理解样本数量与模型泛化能力之间的关系",
            "status": "completed",
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
                "augmentation": {
                    "flip": True,
                    "crop": False,
                    "brightness": True,
                    "rotation": False,
                },
            },
            "summary": {
                "accuracy": 0.91,
                "loss": 0.18,
                "classCount": 3,
                "sampleCount": 90,
                "errorCount": 6,
            },
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
                }
            ],
            "suggestions": [
                "增加每个类别的样本数量。",
                "减少背景干扰明显的图片。",
            ],
        }
    )
    record.id = 1
    db.session.add(record)
    db.session.commit()


with app.app_context():
    db.create_all()
    seed_sample_record()
    print("Database initialized.")
