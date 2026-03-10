import fs from 'fs';
import path from 'path';

async function fetchAllProblems() {
    console.log('正在拉取 LeetCode 题目列表...');

    // LeetCode CN 全局题目列表 API
    const response = await fetch('https://leetcode.cn/api/problems/all/');
    if (!response.ok) {
        throw new Error(`拉取失败，HTTP 状态码: ${response.status}`);
    }

    const data = await response.json();
    const pairs = data.stat_status_pairs;

    // 过滤并提取题目信息
    const problems = pairs.map((p: any) => ({
        id: p.stat.frontend_question_id,
        title: p.stat.question__title,
        slug: p.stat.question__title_slug,
        difficulty: p.difficulty.level, // 1: Easy, 2: Medium, 3: Hard
        paid_only: p.paid_only
    }));

    // 将前端题号转换为数字以便精确排序，如果题号带字母(如剑指Offer)则放后面或特殊处理
    problems.sort((a: any, b: any) => {
        const idA = parseInt(a.id);
        const idB = parseInt(b.id);
        if (!isNaN(idA) && !isNaN(idB)) {
            return idA - idB;
        } else if (isNaN(idA) && !isNaN(idB)) {
            return 1;
        } else if (!isNaN(idA) && isNaN(idB)) {
            return -1;
        } else {
            return a.id.localeCompare(b.id);
        }
    });

    // 生成 CSV 内容
    const csvLines = ['编号,英文slug,标题,难度,是否付费,任务领受Agent编号,当前任务状态'];

    for (const p of problems) {
        let diff = '简单';
        if (p.difficulty === 2) diff = '中等';
        if (p.difficulty === 3) diff = '困难';

        let isPaid = p.paid_only ? '是' : '否';

        // 按照用户要求的列：任务领受Agent编号, 当前任务状态 (未拉取 已拉取 正在解题 已提交-未通过 已提交-已通过 完成)
        // CSV转义双引号
        const safeTitle = p.title.replace(/"/g, '""');

        csvLines.push(`${p.id},${p.slug},"${safeTitle}",${diff},${isPaid},,未拉取`);
    }

    const outputPath = path.join(__dirname, '..', 'LeetCode_Tasks.csv');
    fs.writeFileSync(outputPath, csvLines.join('\n'), 'utf-8');

    console.log(`✅ 成功生成任务清单: ${outputPath}`);
    console.log(`共收集了 ${problems.length} 道题目。`);
}

fetchAllProblems().catch(console.error);
