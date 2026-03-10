import fs from 'fs';
import path from 'path';

const CSV_PATH = path.join(__dirname, '..', 'LeetCode_Tasks.csv');

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function parseCSV(content: string): string[][] {
    const lines = content.trim().split('\n');
    return lines.map(line => {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[line.length > i ? i : 0]; // safely
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current);
        return result;
    });
}

function stringifyCSV(rows: string[][]): string {
    return rows.map(row =>
        row.map(field => {
            const strField = String(field);
            if (strField.includes(',') || strField.includes('"') || strField.includes('\n')) {
                return `"${strField.replace(/"/g, '""')}"`;
            }
            return strField;
        }).join(',')
    ).join('\n');
}

async function fetchLeetCodeProblem(titleSlug: string) {
    const query = `
      query getQuestionDetail($titleSlug: String!) {
        question(titleSlug: $titleSlug) {
          questionId
          questionFrontendId
          title
          titleSlug
          content
          translatedTitle
          translatedContent
          difficulty
          codeSnippets {
            langSlug
            code
          }
        }
      }
    `;

    const response = await fetch('https://leetcode.cn/graphql/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0'
        },
        body: JSON.stringify({
            query: query,
            variables: { titleSlug },
        }),
    });

    if (!response.ok) {
        throw new Error(`HTTP 状态码: ${response.status}`);
    }

    const result = await response.json();
    if (result.errors) {
        throw new Error(JSON.stringify(result.errors));
    }
    return result.data?.question;
}

async function main() {
    if (!fs.existsSync(CSV_PATH)) {
        console.error('任务清单不存在，请先运行 init_task_list.ts');
        process.exit(1);
    }

    const content = fs.readFileSync(CSV_PATH, 'utf-8');
    const rows = parseCSV(content);
    const header = rows[0];
    const dataRows = rows.slice(1);

    const slugIdx = header.indexOf('英文slug');
    const statusIdx = header.indexOf('当前任务状态');

    let count = 0;
    console.log(`\n================================`);
    console.log(`🤖 开始全量批量拉取题目 Raw 数据 (带限流保护)...`);
    console.log(`================================\n`);

    for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const status = row[statusIdx];
        const slug = row[slugIdx];

        // 仅拉取 "未拉取" 和 "拉取失败" 的题
        if (status !== '未拉取' && status !== '拉取失败') {
            continue;
        }

        try {
            console.log(`[${i + 1}/${dataRows.length}] ⬇️ 正在拉取: ${slug}`);

            const problem = await fetchLeetCodeProblem(slug);
            if (!problem) {
                console.error(`   ❌ 接口未返回此题数据: ${slug}`);
                row[statusIdx] = '拉取失败';
                continue;
            }

            const folderName = `${problem.questionFrontendId.padStart(4, '0')}_${slug}`;
            const folderPath = path.join(__dirname, '..', 'problems', folderName);

            if (!fs.existsSync(folderPath)) {
                fs.mkdirSync(folderPath, { recursive: true });
            }

            const rawMarkdown = `
# ${problem.questionFrontendId}. ${problem.translatedTitle || problem.title} (${problem.difficulty})

## 题目描述

${problem.translatedContent || problem.content}

---
请基于此文档生成包含数据探针的 \`problem.md\`。
`.trim();

            fs.writeFileSync(path.join(folderPath, 'raw.md'), rawMarkdown);

            const tsSnippet = problem.codeSnippets?.find((s: any) => s.langSlug === 'typescript')?.code || '';
            if (tsSnippet) {
                fs.writeFileSync(path.join(folderPath, 'solution.ts'), tsSnippet + '\n');
            }

            // 更新状态
            row[statusIdx] = '已拉取';
            count++;

            // 每拉取 10 道题保存一次，防止意外中断
            if (count % 10 === 0) {
                fs.writeFileSync(CSV_PATH, stringifyCSV([header, ...dataRows]), 'utf-8');
                console.log(`   💾 已持久化保存当前进度至 CSV`);
            }

            // 限速：每次请求间隔 1000 毫秒，防止触发 API 抗DDoS 封锁
            await delay(1000);

        } catch (error: any) {
            console.error(`   ❌ 请求 ${slug} 异常: ${error.message}`);
            row[statusIdx] = '拉取失败';
            fs.writeFileSync(CSV_PATH, stringifyCSV([header, ...dataRows]), 'utf-8');
            // 异常时多等待 3 秒
            await delay(3000);
        }
    }

    // 最终保存
    fs.writeFileSync(CSV_PATH, stringifyCSV([header, ...dataRows]), 'utf-8');

    console.log(`\n================================`);
    console.log(`🏁 批量拉取结束。本次共成功拉取 ${count} 道题目。`);
    console.log(`================================\n`);
}

main().catch(console.error);
