import fs from 'fs';
import path from 'path';

// Usage: npx tsx scripts/fetch_problem.ts <slug>
// 示例：npx tsx scripts/fetch_problem.ts two-sum

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
          stats
          hints
          topicTags {
            name
            slug
            translatedName
          }
          codeSnippets {
            lang
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
        },
        body: JSON.stringify({
            query: query,
            variables: { titleSlug },
        }),
    });

    const result = await response.json();
    return result.data?.question;
}

async function main() {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.error('请提供题目的 slug (例如: npx tsx scripts/fetch_problem.ts two-sum)');
        process.exit(1);
    }

    const slug = args[0];
    console.log(`正在拉取题目: ${slug}...`);

    const problem = await fetchLeetCodeProblem(slug);
    if (!problem) {
        console.error('拉取失败，未找到该题目，请确保 slug 拼写正确且存在于中文站。');
        process.exit(1);
    }

    const { questionFrontendId, title, translatedTitle, translatedContent, content, difficulty } = problem;
    const folderName = `${questionFrontendId.padStart(4, '0')}_${slug}`;
    const folderPath = path.join(__dirname, '..', 'problems', folderName);

    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
    }

    const rawMarkdown = `
# ${questionFrontendId}. ${translatedTitle || title} (${difficulty})

## 题目描述

${translatedContent || content}

---
请基于此文档生成包含数据探针的 \`problem.md\`。
`.trim();

    const rawPath = path.join(folderPath, 'raw.md');
    fs.writeFileSync(rawPath, rawMarkdown);

    // 生成对应的基础代码示例 (如果有TS，则抓取 TS 代码模板)
    const tsSnippet = problem.codeSnippets?.find((s: any) => s.langSlug === 'typescript')?.code || '';
    if (tsSnippet) {
        const solutionPath = path.join(folderPath, 'solution.ts');
        if (!fs.existsSync(solutionPath)) {
            fs.writeFileSync(solutionPath, tsSnippet + '\n');
        }
    }

    console.log(`✅ 拉取成功！文件已存放在: problems/${folderName}`);
    console.log(`下一步：请代理阅读 raw.md，将其转换为严格的探针格式 problem.md，并编写对应的测试用例。`);
}

main().catch(console.error);
