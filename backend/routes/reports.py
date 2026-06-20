from flask import Blueprint, jsonify

from models import ExperimentRecord, db

reports_bp = Blueprint("reports", __name__, url_prefix="/api/reports")


@reports_bp.get("/demo")
def reports_demo():
    data = {
        "id": 1,
        "title": "数据如何教会 AI：图像分类模型实验报告",
        "experimentName": "样本数量影响实验（模型 1.0）",
        "objective": "探究每类样本数量变化对模型准确率和错误样本数量的影响。通过对比模型 1.0 和模型 2.0，理解数据优化如何提升 AI 识别效果。",
        "principle": "图像分类模型通过样本和标签学习不同类别的视觉特征。样本数量不足时，模型容易只记住少量图片特征，泛化能力较弱。",
        "variables": [
            {"name": "每类样本数量（模型 1.0）", "value": "5 张"},
            {"name": "每类样本数量（模型 2.0）", "value": "20 张"},
            {"name": "训练轮次", "value": "20"},
            {"name": "验证集比例", "value": "8:2"},
        ],
        "process": [
            "模型 1.0：创建 3 个图像类别，每类 5 张训练图。",
            "模型 2.0：增加每类训练图片到 20 张，重新训练。",
            "对比两次训练的准确率、错误样本和混淆矩阵。",
        ],
        "metrics": {"accuracy": 0.91, "loss": 0.18, "classCount": 3, "sampleCount": 90},
        "optimizationPlan": "增加每类训练图片数量，减少背景干扰明显的图片。",
        "reflection": "实验中我发现，当训练图片太少时，模型容易把背景当成判断依据。增加图片后，模型变得更稳定了。",
        "versionCompare": [{"fromVersion": 0, "toVersion": 1, "accuracy": 0.91, "plan": "增加每类训练图片数量到 20 张"}],
        "stemSummary": {"science": "探究了样本数量变化对图像分类模型表现的影响。","tech": "使用 TensorFlow.js 在浏览器端完成图像分类模型训练与测试。","engineering": "从模型 1.0 到模型 2.0，通过增加训练样本数量优化了模型稳定性。","math": "准确率 91%，错误样本 6 个，混淆矩阵显示校园植物与生活用品最容易混淆。"},
        "errorAnalysis": ["部分类别由于背景相似出现混淆。", "样本数量较少时，模型对新图片的置信度不稳定。"],
        "conclusion": "通过模型 1.0 到 2.0 的对比可以发现，适当增加每类样本数量可以提升模型稳定性，但仍需要控制样本质量和类别差异。",
    }
    return jsonify({"code": 200, "msg": "success", "data": data})


@reports_bp.get("/from-record/<record_id>")
def report_from_record(record_id):
    record_model = ExperimentRecord.query.get(record_id)
    if not record_model:
        return jsonify({'code': 404, 'msg': 'record not found', 'data': None}), 404
    record = record_model.to_dict()
    data = {
        "recordId": record["recordId"],
        "title": f"{record['title']}实验报告",
        "source": "record",
        "optimizationPlan": record.get("optimizationPlan", ""),
        "reflection": record.get("reflection", ""),
        "versionCompare": record.get("versionCompare", []),
        "stemSummary": record.get("stemSummary", {}),
        "modelVersion": record.get("modelVersion", 0),
        "sections": [
            {
                "key": "objective",
                "title": "实验目的",
                "content": "探究每类样本数量变化对图像分类模型准确率、错误样本数量和泛化表现的影响。",
            },
            {
                "key": "principle",
                "title": "实验原理",
                "content": "图像分类模型通过带标签样本学习不同类别的视觉特征。通过观察准确率、损失值、混淆矩阵和错误样本，可以分析模型的学习效果与不足。",
            },
            {
                "key": "process",
                "title": "实验过程",
                "content": [
                    f"创建 {record['datasetSummary']['classCount']} 个图像类别并准备 {record['datasetSummary']['totalImages']} 张样本图片。",
                    "设置训练轮次、学习率、批次大小和验证集比例。",
                    "观察训练曲线、混淆矩阵和错误样本，完成结果分析。",
                ],
            },
            {
                "key": "conclusion",
                "title": "实验结论",
                "content": f"本次实验准确率约为 {round(record['summary']['accuracy'] * 100)}%，错误样本数量为 {record['summary']['errorCount']}，说明当前配置已能完成基础分类任务，但仍有优化空间。",
            },
        ],
    }
    return jsonify({"code": 200, "msg": "success", "data": data})
