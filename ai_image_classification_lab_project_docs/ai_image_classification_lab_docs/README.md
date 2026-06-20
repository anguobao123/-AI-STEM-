# AI 图像分类虚拟实验室文档包

本压缩包用于在后续新聊天、Codex 开发、项目验收中快速迁移上下文。

## 项目定位

项目名称：AI 图像分类虚拟实验室：从样本到模型的可视化训练实验

项目目标：面向高校非计算机专业学生，围绕图像分类模型训练过程，构建一个零代码、可视化、可操作的虚拟实验系统。项目重点不是做大型教育平台，而是做一个实验目标明确、变量可控、结果可分析、报告可生成的虚拟实验作品。

## 工作模式

1. GPT 负责整合需求、生成开发提示词、拆分任务、检查 Codex 输出。
2. Codex 负责根据提示词修改或生成项目代码。
3. 用户负责运行项目、页面验收、反馈问题。
4. GPT 根据验收反馈继续生成下一轮 Codex 修复提示词。

## 推荐使用方式

新聊天中可先上传本压缩包，再发送 `00_new_chat_transfer_prompt.md` 的内容，让新聊天继承项目上下文。

## 文件说明

- `00_new_chat_transfer_prompt.md`：新聊天迁移提示词。
- `docs/01_project_positioning.md`：项目定位说明书。
- `docs/02_experiment_teaching_design.md`：虚拟实验教学设计文档。
- `docs/03_experiment_scripts.md`：实验内容脚本文档。
- `docs/04_web_structure_design.md`：网页结构设计文档。
- `docs/05_page_prototype_spec.md`：页面原型说明文档。
- `docs/06_interaction_flow.md`：交互流程设计文档。
- `docs/07_technical_architecture.md`：技术架构设计文档。
- `docs/08_dataset_design.md`：数据集设计文档。
- `docs/09_report_template.md`：实验报告模板文档。
- `docs/10_test_acceptance.md`：测试与验收文档。
- `docs/11_project_workflow_gpt_codex.md`：GPT + Codex + 人工验收工作流。
- `prompts/01_codex_global_context.md`：每次发给 Codex 的全局上下文。
- `prompts/02_codex_task_prompt_template.md`：Codex 单任务提示词模板。
- `prompts/03_codex_debug_fix_template.md`：Codex 问题修复提示词模板。
- `checklists/acceptance_checklist.md`：阶段验收清单。
- `checklists/codex_output_review_checklist.md`：Codex 输出审查清单。
