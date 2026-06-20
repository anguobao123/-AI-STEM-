from flask import Blueprint, jsonify

experiments_bp = Blueprint("experiments", __name__, url_prefix="/api/experiments")


@experiments_bp.get("/demo")
def experiment_demo():
    items = [
        {
            "id": "intro-classification",
            "title": "认识图像分类",
            "subtitle": "通过可视化流程理解图像分类任务的基本组成",
            "difficulty": "基础",
            "duration": "10-15 分钟",
            "objective": "理解样本、标签、训练结果与分类任务之间的关系",
            "variables": ["图像类别数量", "样本示例", "预测结果展示方式"],
            "metrics": ["分类准确率", "类别数量", "错误样本数量"],
            "route": "/lab/intro-classification",
        },
        {
            "id": "sample-count",
            "title": "样本数量对模型准确率的影响",
            "subtitle": "观察每类样本数量变化对模型效果的影响",
            "difficulty": "基础",
            "duration": "15-20 分钟",
            "objective": "理解样本数量与模型泛化能力之间的关系",
            "variables": ["每类样本数量", "训练轮次", "验证集比例"],
            "metrics": ["训练准确率", "验证准确率", "错误样本数量"],
            "route": "/lab/sample-count",
        },
        {
            "id": "training-epochs",
            "title": "训练轮次对模型效果的影响",
            "subtitle": "对比不同训练轮次下准确率和损失变化趋势",
            "difficulty": "进阶",
            "duration": "15-20 分钟",
            "objective": "理解训练不足、合适训练和过度训练的差异",
            "variables": ["训练轮次", "学习进度", "样本数量"],
            "metrics": ["训练损失", "验证准确率", "收敛趋势"],
            "route": "/lab/training-epochs",
        },
        {
            "id": "class-similarity",
            "title": "类别相似度对分类效果的影响",
            "subtitle": "比较相似类别条件下模型误判分布的变化",
            "difficulty": "进阶",
            "duration": "20 分钟",
            "objective": "理解类别边界清晰度与混淆错误之间的联系",
            "variables": ["类别相似度", "类别数量", "背景复杂度"],
            "metrics": ["混淆矩阵", "错误样本数量", "类别准确率"],
            "route": "/lab/class-similarity",
        },
        {
            "id": "data-augmentation",
            "title": "数据增强对泛化能力的影响",
            "subtitle": "观察翻转、裁剪等增强策略对验证结果的影响",
            "difficulty": "进阶",
            "duration": "20-25 分钟",
            "objective": "理解数据增强对模型稳健性和泛化能力的提升作用",
            "variables": ["增强策略", "样本数量", "训练轮次"],
            "metrics": ["验证准确率", "损失值", "泛化表现"],
            "route": "/lab/data-augmentation",
        },
    ]
    return jsonify({"code": 200, "msg": "success", "data": {"items": items}})
