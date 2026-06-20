import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  createPersistableLabSession,
  createVersion1Snapshot,
  findDatasetOverlaps,
  getLabStepTargetId,
  getVersion2EntryReason,
  metricTrend
} from "../src/utils/labWorkflow.js";

test("进入模型 2.0 前按训练、批量测试和优化方案顺序拦截", () => {
  assert.match(getVersion2EntryReason({ modelVersion: 0, trainState: "idle", hasModel: false, testCount: 0, optimizationPlan: "" }), /训练/);
  assert.match(getVersion2EntryReason({ modelVersion: 0, trainState: "completed", hasModel: true, testCount: 0, optimizationPlan: "" }), /批量测试/);
  assert.match(getVersion2EntryReason({ modelVersion: 0, trainState: "completed", hasModel: true, testCount: 4, optimizationPlan: "" }), /优化方案/);
  assert.equal(getVersion2EntryReason({ modelVersion: 0, trainState: "completed", hasModel: true, testCount: 4, optimizationPlan: "补充多角度样本" }), "");
});

test("持久化会话保留进入模型 2.0 所需的基础信息", () => {
  const session = createPersistableLabSession({
    projectName: "校园植物分类", groupName: "第三组", authorName: "小林",
    objective: "比较样本数量", hypothesis: "样本更多会更稳定", variableType: "样本数量",
    variableDescription: "每类图片数量", controlledConditions: "轮次不变", expectedChange: "准确率提高",
    datasetNote: "训练集与测试集独立", optimizationPlan: "补充背景变化", conclusion: "有效",
    reflection: "继续扩大测试集", modelVersion: 1, activeStepKey: "train", versionHistory: [],
    experimentLog: [{ event: "switch_version" }], form: { epochs: 20 }, batchTestResult: null,
    testResults: [], classDefinitions: [{ id: "a", name: "苹果" }],
    runtimeModelInfo: { modelKey: "session-v2", modelVersion: 1 },
    runtimeTrainingResult: { summary: { accuracy: 0.9 } }
  });
  assert.equal(session.projectName, "校园植物分类");
  assert.equal(session.groupName, "第三组");
  assert.equal(session.optimizationPlan, "补充背景变化");
  assert.equal(session.modelVersion, 1);
  assert.equal(session.runtimeModelInfo.modelKey, "session-v2");
});

test("模型 1.0 快照是深拷贝，不会被模型 2.0 结果覆盖", () => {
  const batchTestResult = { summary: { testAccuracy: 0.75 }, classMetrics: [{ className: "苹果", accuracy: 0.5 }] };
  const snapshot = createVersion1Snapshot({
    testCount: 4, correctCount: 3, errorCount: 1, accuracy: 0.75,
    batchTestResult, classMetrics: batchTestResult.classMetrics
  });
  batchTestResult.summary.testAccuracy = 1;
  batchTestResult.classMetrics[0].accuracy = 1;
  assert.equal(snapshot.batchTestResult.summary.testAccuracy, 0.75);
  assert.equal(snapshot.classMetrics[0].accuracy, 0.5);
});

test("顶部步骤导航映射到页面中的对应区域", () => {
  const labPath = fileURLToPath(new URL("../src/views/Lab.vue", import.meta.url));
  const source = readFileSync(labPath, "utf8");
  for (const key of ["project", "variable", "dataset", "train", "test", "iterate"]) {
    assert.match(source, new RegExp(`id=["']${getLabStepTargetId(key)}["']`));
  }
  assert.match(source, /@click="scrollToStep\(step\.key\)"/);
});

test("训练集与测试集的同名同大小文件会被提示", () => {
  const repeated = { name: "apple-01.png", size: 128 };
  const overlaps = findDatasetOverlaps(
    [{ name: "苹果", files: [{ file: repeated }] }],
    [{ name: "苹果测试", files: [{ file: { ...repeated } }] }]
  );
  assert.equal(overlaps.length, 1);
  assert.equal(overlaps[0].fileName, "apple-01.png");
});

test("版本指标明确判断改善、下降和不变", () => {
  assert.equal(metricTrend(0.7, 0.8, true), "改善");
  assert.equal(metricTrend(2, 3, false), "下降");
  assert.equal(metricTrend(4, 4, false), "不变");
});
