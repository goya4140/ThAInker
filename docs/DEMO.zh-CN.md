# ThAInker 离线演示

该模式用于产品展示、前端体验和完整流程验收，不需要服务器 GPU、真实数据集、Codex 登录或模型额度。它使用现有五模块的任务管理器、交接代码和 Web 页面，并提供独立演示控制台。

## 启动

在仓库根目录运行：

```bash
uv venv --python 3.12 .venv
uv pip install --python .venv/bin/python -e '.[demo]'
.venv/bin/python -m workbench.demo --port 8769
```

已有 Python 3.11+ 环境也可以使用 `python -m pip install -e '.[demo]'`。需要本机已有 `latexmk`、`pdflatex` 或 Tectonic；演示优先选择 latexmk，也支持通过 `LATEX_COMPILER` 显式指定。不会自动安装系统编译器。

打开 <http://127.0.0.1:8769/demo.html>。页面打开和刷新均不会自动创建任务。

## 推荐讲解顺序

1. 在演示控制台说明案例和“模拟数据”标记，点击开始。可选自动选题，或选择“由我选择候选 Idea”。
2. 查看两张模拟文献卡和候选方案；人工模式下选择一个 Idea，交接到实验模块。
3. 实验模块真实执行本地 CPU 模拟器。模拟器输出两种方法、三个 seed 共六条预定 Dice 数据，原汇总代码检查记录完整性并计算均值与样本标准差。
4. 写作模块按原有依赖顺序生成六章节与模拟引用，调用真实 LaTeX 编译器。若勾选了故障恢复，在 Method 步骤停下，点击“继续当前步骤”，复用此前章节。
5. 表格模块接收论文副本，保留模拟数值，完成编译和预置复核。
6. 在第五阶段确认三张参考图。主图使用固定模板生成原生 PPTX、向量 PDF 与 PNG，局部插入论文，再次真实编译并执行原生对象检查。
7. 下载含图论文 PDF、可编辑 PPTX、LaTeX ZIP 和完整交付包。原模块页面和 Research Journey 可查看各任务及事件。

一次性故障只在对应写作项目首次生成 Method 时注入；后续继续不会再次注入。重新演示创建新的流程，历史产物保留。暂停与恢复沿用现有模块语义；服务重启后需显式继续原演示。

## 执行边界

| 内容 | 演示中的处理 |
| --- | --- |
| 文献、来源和数据集 | 预置虚构示例，链接使用 example.org；没有真实检索或数据下载 |
| Idea 和评审分数 | 预置模拟响应；不声明新颖性或独立评审结论 |
| GPU 训练和实验数据 | 不申请 GPU；本地模拟器写出预定数据，带 simulation 标记 |
| 调度、状态门与交接 | 使用现有 PipelineManager 和模块任务管理器真实执行 |
| 结果完整性、均值和样本标准差 | 原有确定性代码真实计算 |
| 正文与参考文献 | 预置模拟英文内容；参考文献全部明确标为 DEMO |
| LaTeX、PDF 与下载 | 真实源码、真实编译和真实文件下载 |
| 方法主图 | 固定模板生成，未调用 FigureCrafter 模型；PDF/PPTX 按相同几何分别生成，不声称经过 LibreOffice 渲染 |
| 审计和论文复核 | 预置演示响应；不能作为科学验证或独立模型审查 |

为覆盖既有状态门，模拟流程使用现有状态词和契约字段，包括 COMPLETE、PASS 和 CLAIM_BEARING。它们仅表示演示内部的结构与路由，不能改变 simulation 标记或被解释为真实科学证据。模拟数值、预置审计及正式训练结果不得混用。

## 数据隔离与恢复

默认演示根目录为 `assets/output/demo/`，正式工作台仍使用 `assets/output/workbench/`。演示只绑定本机 `127.0.0.1`；不会改动全局 Codex 配置、登录信息或正式模型调用逻辑。

可使用 `--data-dir assets/output/demo-session-2` 创建另一个隔离目录，使用 `--delay 0.6` 调整每次模拟模型步骤的停留时间。数据目录必须为空或含 `.thainker-demo.json` 标记，避免误将模拟内容写入正式任务目录。重启时使用相同目录会保留任务身份、历史和产物，不自动重跑。

适配器仅由 `python -m workbench.demo` 在自己的进程内安装；`python -m workbench` 和五个独立模块维持原有实际执行方式。演示目录由 Git 忽略，模拟产物不上传。

## 验收

```bash
uv pip install --python .venv/bin/python -e '.[dev,demo]'
PYTHONPATH=src:auto_search .venv/bin/python -m pytest workbench/tests/test_demo.py -q
node --check workbench/web/demo.js
```

端到端测试使用真实 HTTP、CPU 模拟器、原有结果校验、LaTeX 编译、PPTX 对象检查与文件下载，覆盖人工选题、暂停恢复、一次性写作故障、参考图确认、目录隔离和重启恢复。没有真实 LaTeX 编译器时端到端用例会跳过，不能据此宣称编译验收通过。
