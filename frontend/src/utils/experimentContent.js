export const experimentCatalog = [
  {
    id: "sample-count",
    route: "/lab/sample-count",
    title: "样本数量对模型准确率的影响",
    shortName: "样本数量实验",
    objective: "观察样本数量变化对模型准确率和稳定性的影响。",
    question: "样本数量增加后，模型是否会更稳定？",
    variable: "每类训练样本数量",
    controlVariable: "每类训练样本数量",
    operationFocus: "上传不同数量的类别图片，完成训练和测试，比较样本数量变化后的结果。",
    fixedConditions: ["类别数量", "训练轮次", "学习率", "图片尺寸"],
    constants: "类别数量、训练轮次、学习率、图片尺寸",
    metricList: ["测试准确率", "错误样本数", "混淆矩阵"],
    metrics: "测试准确率、错误样本数、混淆矩阵",
    principle: "样本越充分、标签越准确，模型越容易学到稳定特征；样本不足时更容易出现泛化能力弱和错误增多。",
    primaryParameter: "sampleCount",
    parameterHint: "重点补足每类训练样本数量，其余训练参数尽量保持不变。",
    defaultParams: {
      epochs: 20,
      batchSize: 16,
      learningRate: 0.001
    },
    trainingHint: "重点补足每类训练样本数量，其余训练参数尽量保持不变。",
    testingHint: "训练后对同一批测试图片做单图预测和批量测试。",
    resultHint: "观察样本增加后准确率是否更稳定，错误样本是否减少。",
    resultFocus: "观察样本增加后准确率是否更稳定，错误样本是否减少。",
    focus: "观察样本增加后准确率是否更稳定，错误样本是否减少。",
    reportFocus: "样本数量增加是否提升了模型稳定性和测试表现。",
    variables: ["每类训练样本数量"],
    guideSteps: ["准备不同数量的训练样本。", "保持其他条件不变完成训练。", "比较测试准确率、错误样本数和混淆矩阵。"],
    labTips: ["每类至少上传 2 张图片。", "优先增加样本数量，不要同时大幅调整其他参数。"]
  },
  {
    id: "epoch-count",
    route: "/lab/epoch-count",
    title: "训练轮次对模型效果的影响",
    shortName: "训练轮次实验",
    objective: "观察训练轮次变化对模型准确率、损失值和测试表现的影响。",
    question: "训练越久是否一定越好？",
    variable: "训练轮次",
    controlVariable: "训练轮次",
    operationFocus: "保持训练图片不变，重点调整训练轮次，观察准确率和损失值变化。",
    fixedConditions: ["样本数量", "类别数量", "学习率", "图片尺寸"],
    constants: "样本数量、类别数量、学习率、图片尺寸",
    metricList: ["训练准确率", "损失值", "测试准确率"],
    metrics: "训练准确率、损失值、测试准确率",
    principle: "训练轮次过少可能欠拟合，过多可能收益变小甚至出现过拟合，需要结合准确率和损失值一起判断。",
    primaryParameter: "epochs",
    parameterHint: "优先修改训练轮次，不要同时大幅改动其他参数。",
    defaultParams: {
      epochs: 10,
      batchSize: 16,
      learningRate: 0.001
    },
    trainingHint: "优先修改训练轮次，不要同时大幅改动其他参数。",
    testingHint: "比较不同轮次下的预测稳定性和批量测试结果。",
    resultHint: "判断轮次增加后是否继续提升，或已经出现收益变小甚至过拟合。",
    resultFocus: "判断轮次增加后是否继续提升，或已经出现收益变小甚至过拟合。",
    focus: "判断轮次增加后是否继续提升，或已经出现收益变小甚至过拟合。",
    reportFocus: "训练轮次变化对准确率和损失值曲线的影响。",
    variables: ["训练轮次"],
    guideSteps: ["保持训练样本不变。", "逐步调整 epochs。", "比较训练日志、准确率和损失值。"],
    labTips: ["先用默认参数训练一次。", "只突出训练轮次这个变量。"]
  },
  {
    id: "class-similarity",
    route: "/lab/class-similarity",
    title: "类别相似度对分类效果的影响",
    shortName: "类别相似度实验",
    objective: "观察类别越相似时，模型是否更容易混淆。",
    question: "类别越相似，模型是否越容易混淆？",
    variable: "类别相似度",
    controlVariable: "类别相似度",
    operationFocus: "选择更相似的类别进行训练，比较模型在相似类别之间的混淆情况。",
    fixedConditions: ["样本数量", "训练轮次", "学习率", "图片尺寸"],
    constants: "样本数量、训练轮次、学习率、图片尺寸",
    metricList: ["类别准确率", "混淆矩阵", "错误样本数"],
    metrics: "类别准确率、混淆矩阵、错误样本数",
    principle: "当不同类别在颜色、形状或纹理上过于接近时，模型更难学到清晰边界，更容易发生误判。",
    primaryParameter: "classSimilarity",
    parameterHint: "尽量让各类别样本数量接近，把实验重点放在类别是否相似上。",
    defaultParams: {
      epochs: 20,
      batchSize: 16,
      learningRate: 0.001
    },
    trainingHint: "尽量让各类别样本数量接近，把实验重点放在类别是否相似上。",
    testingHint: "重点测试容易混淆的类别，查看高置信度误判。",
    resultHint: "观察哪些类别互相混淆最明显，以及混淆矩阵中的交叉项。",
    resultFocus: "观察哪些类别互相混淆最明显，以及混淆矩阵中的交叉项。",
    focus: "观察哪些类别互相混淆最明显，以及混淆矩阵中的交叉项。",
    reportFocus: "相似类别之间的混淆关系和错误样本特征。",
    variables: ["类别相似度"],
    guideSteps: ["选择更相似的类别组合。", "保持样本数量和参数尽量稳定。", "重点查看混淆矩阵和错误样本。"],
    labTips: ["优先选择视觉特征相近的类别。", "不要让样本数量差异掩盖类别相似度影响。"]
  },
  {
    id: "augmentation",
    route: "/lab/augmentation",
    title: "数据增强对泛化能力的影响",
    shortName: "数据增强实验",
    objective: "观察更丰富的训练样本视角是否能提升模型对新图片的泛化能力。",
    question: "数据增强是否能提升模型对新图片的识别能力？",
    variable: "是否使用更丰富的训练样本视角",
    controlVariable: "是否使用数据增强",
    operationFocus: "上传角度、背景、光照更丰富的训练图片，比较模型对新图片的泛化表现。",
    fixedConditions: ["原始样本数量", "类别数量", "训练轮次"],
    constants: "原始样本数量、类别数量、训练轮次",
    metricList: ["测试准确率", "错误样本数", "泛化表现"],
    metrics: "测试准确率、错误样本数、泛化表现",
    principle: "更丰富的训练样本可以模拟数据增强效果，降低模型对单一背景或拍摄姿态的依赖。",
    primaryParameter: "augmentation",
    parameterHint: "通过更丰富的训练样本模拟数据增强效果，不展示额外增强开关。",
    defaultParams: {
      epochs: 20,
      batchSize: 16,
      learningRate: 0.001
    },
    trainingHint: "通过更丰富的训练样本模拟数据增强效果，不展示额外增强开关。",
    testingHint: "重点测试新背景、新角度或新光照下的图片。",
    resultHint: "观察模型对未见过条件的图片是否更稳定，错误样本是否减少。",
    resultFocus: "观察模型对未见过条件的图片是否更稳定，错误样本是否减少。",
    focus: "观察模型对未见过条件的图片是否更稳定，错误样本是否减少。",
    reportFocus: "更丰富训练样本对模型泛化能力的提升作用。",
    variables: ["是否使用数据增强"],
    guideSteps: ["先用较单一的样本训练。", "再补充更多背景、角度和光照条件的图片。", "比较测试结果和错误样本。"],
    labTips: ["优先补充多角度、多背景的图片。", "通过样本多样性体现增强效果。"]
  }
];

export const guideKnowledge = [
  {
    index: "1",
    title: "什么是图像分类",
    explanation: "图像分类是让模型判断一张图片属于哪个类别。输入是图片，输出是类别名称以及每个类别对应的置信度。",
    example: "输入一张水果图片，模型可能输出“苹果”或“香蕉”，并给出各自的概率。",
    experimentRelation: "四个实验的共同目标，都是观察什么因素会让分类结果更好或更差。",
    experimentFocus: ["理解输入、输出和预测类别", "理解单图预测为什么要看置信度"]
  },
  {
    index: "2",
    title: "样本与标签",
    explanation: "训练图片叫样本，每张图片必须对应正确标签。样本质量越高、数量越充足，模型越容易学到稳定特征。",
    example: "苹果图片必须标成苹果，香蕉图片必须标成香蕉；模糊、错误标注或重复过多的图片都会影响训练。",
    experimentRelation: "样本数量实验直接观察样本多少的影响，其他实验也都依赖样本质量。",
    experimentFocus: ["训练前先确认类别命名正确", "每类至少准备 2 张以上训练图片"]
  },
  {
    index: "3",
    title: "训练集与测试集",
    explanation: "训练集用于让模型学习，测试集用于检验模型面对新图片时是否还能正确分类。",
    example: "训练时上传多张苹果和香蕉图片，测试时再上传一张训练中没见过的新水果图片做预测。",
    experimentRelation: "Lab 页面里的真实训练、单图预测和批量测试，分别对应训练集学习和测试集检验。",
    experimentFocus: ["不要用同一张图同时当训练图和测试图", "批量测试比单图预测更能反映整体效果"]
  },
  {
    index: "4",
    title: "控制变量法",
    explanation: "一次实验只改变一个关键变量，其余条件尽量保持不变，这样才能判断结果变化到底是由什么引起的。",
    example: "只改变训练轮次，不改变样本数量、学习率和图片尺寸。",
    experimentRelation: "四个实验分别固定大部分条件，只突出一个变量进行观察。",
    experimentFocus: ["样本数量实验只改样本数量", "训练轮次实验只改 epochs", "类别相似度实验只改类别组合", "数据增强实验只改样本多样性"]
  },
  {
    index: "5",
    title: "训练参数",
    explanation: "常见训练参数包括训练轮次、批处理大小、学习率和图片尺寸。它们会影响训练速度、收敛过程和最终效果。",
    example: "轮次太少可能没学会，轮次太多可能过拟合；学习率太大可能震荡，太小可能学得很慢。",
    experimentRelation: "Lab 页面中栏保留这些参数，让学生在真实训练中观察参数变化。",
    experimentFocus: ["训练轮次实验重点看 epochs", "其他实验建议少改动非核心参数"]
  },
  {
    index: "6",
    title: "模型测试",
    explanation: "模型测试包括单图预测和批量测试。单图预测看某一张图的类别和概率，批量测试看整体正确率和错误分布。",
    example: "单图预测可以观察一张图片的最高概率类别，批量测试可以看一整批图片中错了多少张。",
    experimentRelation: "Lab 页面右栏保留单图预测和批量测试入口，不再放教学大段说明。",
    experimentFocus: ["查看预测类别", "查看类别概率条", "查看批量测试汇总"]
  },
  {
    index: "7",
    title: "评价指标",
    explanation: "准确率表示预测正确的比例，损失值反映模型训练误差，错误样本数反映模型在哪些图片上仍然不稳定。",
    example: "如果准确率提高、损失值下降、错误样本减少，通常说明模型效果在变好。",
    experimentRelation: "不同实验关注的指标略有不同，但都需要用指标来支持结论，而不是只看感觉。",
    experimentFocus: ["样本数量实验看准确率和错误样本数", "训练轮次实验看准确率与损失值"]
  },
  {
    index: "8",
    title: "混淆矩阵与错误分析",
    explanation: "混淆矩阵可以显示哪些类别最容易互相误判，错误分析可以帮助改进数据集，例如补充更有区分度的样本。",
    example: "如果苹果经常被预测成梨，说明这两个类别之间的边界不清晰，需要补充更能区分它们的图片。",
    experimentRelation: "类别相似度实验和数据增强实验尤其依赖混淆矩阵与错误样本分析。",
    experimentFocus: ["查看相似类别之间的误判", "根据错误样本补充数据集"]
  }
];

export const demoAchievements = [
  {
    title: "苹果香蕉图像分类模型",
    sourceExperiment: "样本数量对模型准确率的影响",
    trainingMode: "示例成果",
    classLabel: "苹果 / 香蕉",
    classCount: 2,
    sampleCount: 48,
    accuracy: 0.89,
    modelNote: "随着样本量提升，模型对常见水果的判断更稳定。",
    reportId: 1
  },
  {
    title: "校园植物识别分类模型",
    sourceExperiment: "数据增强对泛化能力的影响",
    trainingMode: "示例成果",
    classLabel: "叶片 / 花朵 / 枝干",
    classCount: 3,
    sampleCount: 84,
    accuracy: 0.91,
    modelNote: "拍摄视角更丰富后，模型在不同背景下的识别更稳定。",
    reportId: 1
  },
  {
    title: "相似水果区分分类模型",
    sourceExperiment: "类别相似度对分类效果的影响",
    trainingMode: "示例成果",
    classLabel: "苹果 / 梨 / 桃子",
    classCount: 3,
    sampleCount: 72,
    accuracy: 0.86,
    modelNote: "相似类别之间仍有混淆，但混淆矩阵能清楚反映问题边界。",
    reportId: 1
  }
];

export function getExperimentMeta(experimentId = "sample-count") {
  return experimentCatalog.find((item) => item.id === experimentId) || experimentCatalog[0];
}
