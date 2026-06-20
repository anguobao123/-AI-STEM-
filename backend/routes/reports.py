from flask import Blueprint, jsonify

from .records import get_mock_record

reports_bp = Blueprint("reports", __name__, url_prefix="/api/reports")


@reports_bp.get("/demo")
def reports_demo():
    data = {
        "id": 1,
        "title": "样本数量对图像分类模型准确率的影响实验报告",
        "experimentName": "样本数量影响实验",
        "objective": "探究每类样本数量变化对模型准确率和错误样本数量的影响。",
        "principle": "图像分类模型通过样本和标签学习不同类别的视觉特征。样本数量不足时，模型容易只记住少量图片特征，泛化能力较弱。",
        "variables": [
            {"name": "每类样本数量", "value": "5 / 20 / 50"},
            {"name": "训练轮次", "value": "20"},
            {"name": "验证集比例", "value": "8:2"},
        ],
        "process": [
            "创建 3 个图像类别。",
            "分别使用不同样本数量进行训练。",
            "观察训练曲线、验证准确率和错误样本。",
        ],
        "metrics": {"accuracy": 0.91, "loss": 0.18, "classCount": 3, "sampleCount": 90},
        "errorAnalysis": ["部分类别由于背景相似出现混淆。", "样本数量较少时，模型对新图片的置信度不稳定。"],
        "conclusion": "适当增加每类样本数量可以提升模型稳定性，但仍需要控制样本质量和类别差异。",
    }
    return jsonify({"code": 200, "msg": "success", "data": data})


@reports_bp.get("/from-record/<record_id>")
def report_from_record(record_id):
    record = get_mock_record(record_id)
    data = {
        "recordId": record["recordId"],
        "title": f"{record['title']}实验报告",
        "source": "record",
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
