/**
 * 轻量级模型调用脚本 - 供子 Agent 使用
 * 适合简单任务：格式转换、文本提取、模板填充
 */
const https = require('https');

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = process.env.LIGHT_MODEL || 'gpt-3.5-turbo';

function callLightModel(prompt, systemPrompt = '') {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            model: MODEL,
            messages: [
                ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
                { role: 'user', content: prompt }
            ],
            temperature: 0.3,
            max_tokens: 2000
        });

        const options = {
            hostname: 'openrouter.ai',
            path: '/api/v1/chat/completions',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://leetcode-runner.local',
                'X-Title': 'LeetCode TDD Generator'
            }
        };

        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => responseData += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(responseData);
                    resolve(json.choices?.[0]?.message?.content || '');
                } catch (e) {
                    reject(new Error('Parse error: ' + responseData.substring(0, 200)));
                }
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

// 针对 TDD 桩生成的专用函数
async function generateProblemFiles(rawContent, problemNumber) {
    const systemPrompt = `你是一个精确的 TDD 桩生成器。根据 LeetCode raw.md 内容，生成三个文件：
1. problem.md - 包含需求探针和设计探针
2. solution.test.ts - Jest 测试文件
3. solution.ts - 函数空壳

只输出文件内容，不要额外解释。`;

    const prompt = `为第 ${problemNumber} 题生成 TDD 桩文件。

原始内容：
${rawContent.substring(0, 3000)}

请生成以下内容（用 ---FILE: filename--- 分隔）：
---FILE: problem.md---
---FILE: solution.test.ts---
---FILE: solution.ts---`;

    const response = await callLightModel(prompt, systemPrompt);
    return parseGeneratedFiles(response);
}

function parseGeneratedFiles(response) {
    const files = {};
    const regex = /---FILE:\s*(\S+)---\s*([\s\S]*?)(?=---FILE:|$)/g;
    let match;
    while ((match = regex.exec(response)) !== null) {
        files[match[1]] = match[2].trim();
    }
    return files;
}

module.exports = { callLightModel, generateProblemFiles };
