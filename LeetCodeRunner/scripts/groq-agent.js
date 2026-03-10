/**
 * Groq API 轻量级模型调用 - 极速+超便宜
 * Llama 3 8B: $0.05/1M tokens (比 GPT-3.5 便宜 10倍)
 * 速度: 1000+ tokens/秒
 */
const https = require('https');

const GROQ_KEY = process.env.GROQ_API_KEY;
const MODEL = process.env.GROQ_MODEL || 'llama3-8b-8192';

function callGroq(prompt, systemPrompt = '') {
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
            hostname: 'api.groq.com',
            path: '/openai/v1/chat/completions',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_KEY}`,
                'Content-Type': 'application/json'
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

// TDD 桩生成专用
async function generateTDDFiles(rawContent, problemNum) {
    const systemPrompt = `你是精确的 TDD 桩生成器。只输出文件内容，用 ---FILE: 文件名 --- 分隔。`;

    const prompt = `为 LeetCode 第 ${problemNum} 题生成 TDD 桩。

原始题目：
${rawContent.substring(0, 2500)}

生成三个文件：
---FILE: problem.md---
（包含：需求探针 LC-Req-${problemNum}-XX 和设计探针 LC-Design-${problemNum}-XX）

---FILE: solution.test.ts---
（Jest 测试，包含示例和边界测试）

---FILE: solution.ts---
（函数空壳，带 @probe_ref 注释）`;

    const response = await callGroq(prompt, systemPrompt);
    return parseFiles(response);
}

function parseFiles(response) {
    const files = {};
    const regex = /---FILE:\s*(\S+)---\s*([\s\S]*?)(?=---FILE:|$)/g;
    let match;
    while ((match = regex.exec(response)) !== null) {
        files[match[1]] = match[2].trim();
    }
    return files;
}

module.exports = { callGroq, generateTDDFiles };
