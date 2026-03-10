import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { chromium } from 'playwright';

const PROBLEMS_DIR = path.join(__dirname, '..', 'problems');
const TASKS_CSV = path.join(__dirname, '..', 'LeetCode_Tasks.csv');
const RULES_PATH = path.join(__dirname, '..', '.ai-rules.md');
const FLOW_PATH = path.join(__dirname, '..', '.agents', 'workflows', 'leetcode_flow.md');

// Extract the raw text from an LLM response blocks
function extractCodeBlock(text: string, language: string): string | null {
    const regex = new RegExp(`\`\`\`${language}\\s*([\\s\\S]*?)\`\`\``, 'ig');
    let match;
    let lastMatch = null;
    // Find the LAST markdown block in the text in case it produced reasoning blocks
    while ((match = regex.exec(text)) !== null) {
        lastMatch = match[1].trim();
    }
    return lastMatch;
}

// Load tasks from CSV to get the title
function loadTasks(): Record<string, string> {
    const lines = fs.readFileSync(TASKS_CSV, 'utf-8').split('\n');
    const tasks: Record<string, string> = {};
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const cols = lines[i].split(',');
        if (cols.length >= 3) {
            tasks[cols[1]] = cols[2];
        }
    }
    return tasks;
}

const tasksMeta = loadTasks();

function getPendingProblems() {
    if (!fs.existsSync(PROBLEMS_DIR)) return [];

    const dirs = fs.readdirSync(PROBLEMS_DIR, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

    const pending = dirs.filter(dir => {
        const dirPath = path.join(PROBLEMS_DIR, dir);
        const hasProblem = fs.existsSync(path.join(dirPath, 'problem.md'));
        const solutionPath = path.join(dirPath, 'solution.ts');

        let isImplemented = false;

        if (fs.existsSync(solutionPath)) {
            const content = fs.readFileSync(solutionPath, 'utf8');
            if (content.length > 120 && content.includes('{') && !content.includes('return [];\r\n};') && !content.includes('return [];\n};')) {
                isImplemented = true;
            }
        }

        return hasProblem && !isImplemented;
    });

    return pending.sort((a, b) => a.localeCompare(b));
}

async function actAsGeminiAgent(prompt: string, page: any): Promise<string> {
    console.log(`\n💬 Sending prompt to Gemini Web Ui...`);

    // 1. Focus input box
    const inputBoxSelector = 'rich-textarea p, .ql-editor p, textarea, [contenteditable="true"]';
    await page.waitForSelector(inputBoxSelector, { state: 'visible', timeout: 15000 });

    await page.evaluate(({ selector, text }: any) => {
        const els = document.querySelectorAll(selector);
        const el = Array.from(els).find((e: any) => e.offsetHeight > 0 || e.offsetWidth > 0) as any;
        if (!el) return;

        if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
            el.value = text;
            el.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
            el.innerText = text;
            el.dispatchEvent(new InputEvent('input', { bubbles: true }));
        }
    }, { selector: inputBoxSelector, text: prompt });

    // 2. Click send button (Supports English "Send" and Chinese "发送")
    await page.waitForTimeout(1000);
    const clicked = await page.evaluate(() => {
        const btns = document.querySelectorAll('button');
        for (let i = btns.length - 1; i >= 0; i--) {
            const btn = btns[i];
            const label = (btn.getAttribute('aria-label') || btn.getAttribute('mattooltip') || btn.innerText || '').toLowerCase();
            if (label.includes('send') || label.includes('发送') || label.includes('submit')) {
                if (!btn.disabled && btn.offsetHeight > 0) {
                    btn.click();
                    return true;
                }
            }
        }
        return false;
    });

    if (!clicked) {
        await page.keyboard.press('Enter');
        await page.keyboard.press('Control+Enter'); // Fallback for rich editors
    }

    // 3. Wait for response
    console.log(`⏳ Waiting for Gemini to generate response (this may take up to 30s)...`);

    // Check periodically if the 'Stop' generating button goes away OR if the response completes.
    // Instead of waiting for a strict selector, we wait a solid amount of time and poll.
    let codeText = "";
    for (let i = 0; i < 40; i++) { // Poll every 1s, up to 40s
        await page.waitForTimeout(1000);

        // Try to extract the code
        const extracted = await page.evaluate(() => {
            const bodyText = document.body.innerText || '';
            if (bodyText.includes('出了点问题') || bodyText.includes('Something went wrong') || bodyText.includes('Error 13')) {
                return "GEMINI_CRASH_ERROR";
            }

            // Check if generating is in progress (usually there is a 'stop' button)
            const btns = document.querySelectorAll('button');
            const isGenerating = Array.from(btns).some(b => {
                const id = b.getAttribute('data-test-id');
                const label = b.getAttribute('aria-label');
                return (id && id.includes('stop')) || (label && label.includes('stop')) || (label && label.includes('停止'));
            });

            // Wait for it to finish generating
            if (isGenerating) return null;

            // Grab the last <pre> or code block
            const pres = document.querySelectorAll('pre, code-block, .code-block');
            if (pres.length > 0) {
                const text = (pres[pres.length - 1] as HTMLElement).innerText || (pres[pres.length - 1] as HTMLElement).textContent || '';
                if (text.length > 20) {
                    return "\`\`\`typescript\n" + text + "\n\`\`\`";
                }
            }

            // Fallback to text
            const els = document.querySelectorAll('message-content, model-response');
            if (els.length > 0) {
                return (els[els.length - 1] as HTMLElement).innerText;
            }
            return "";
        });

        if (extracted === "GEMINI_CRASH_ERROR") {
            throw new Error("Gemini Web UI crashed with '出了点问题' or 'Something went wrong' (Error 13).");
        }

        // After a minimum wait, if we got good code, break.
        if (extracted && extracted.length > 50 && i > 5) {
            codeText = extracted;
            break;
        }
    }

    if (!codeText) {
        console.warn("[Warning] Fallback: dumping entire body text... (could not find cleanly formatted blocks)");
        codeText = await page.evaluate(() => document.body.innerText);
    }

    return codeText;
}


async function runTddSubagentPlaywright(dirName: string, title: string) {
    const dirPath = path.join(PROBLEMS_DIR, dirName);
    const problemPath = path.join(dirPath, 'problem.md');
    const testPath = path.join(dirPath, 'solution.test.ts');
    const solutionPath = path.join(dirPath, 'solution.ts');

    const rules = fs.readFileSync(RULES_PATH, 'utf8');
    const flow = fs.readFileSync(FLOW_PATH, 'utf8');
    const problemContext = fs.readFileSync(problemPath, 'utf8');

    let solutionStub = '';
    if (fs.existsSync(solutionPath)) {
        solutionStub = fs.readFileSync(solutionPath, 'utf8');
    }

    console.log(`\n🔌 Connecting to existing Chrome Profile (port 9222)...`);

    let browser;
    try {
        // First fetch the debugging URL natively to bypass Playwright's HTTP connection issues
        const res = await fetch('http://127.0.0.1:9222/json/version');
        const data = await res.json();
        const wsUrl = data.webSocketDebuggerUrl;
        console.log(`[CDP] Discovered WebSocket URL: ${wsUrl}`);

        browser = await chromium.connectOverCDP(wsUrl);
    } catch (e: any) {
        throw new Error(`\n❌ Failed to connect to Chrome. \nDid you start Chrome with: \n"chrome.exe --remote-debugging-port=9222 --user-data-dir='C:\\chrome-debug-profile' --remote-allow-origins=*" ?\nError: ${e.message}`);
    }

    const context = browser.contexts()[0];
    const page = await context.newPage();

    console.log(`🌐 Navigating to Gemini...`);
    await page.goto('https://gemini.google.com/app');

    // Handle potential crash screen from the get-go ("出了点问题13" renders a Reload button)
    console.log(`🧹 Checking for active crash screens...`);
    await page.waitForTimeout(2000); // Let the SPA hydrate
    await page.evaluate(() => {
        const bodyText = document.body.innerText || '';
        if (bodyText.includes('出了点问题') || bodyText.includes('Something went wrong')) {
            // Find and click the reload button
            const btns = document.querySelectorAll('button');
            for (let i = 0; i < btns.length; i++) {
                const text = (btns[i].innerText || '').toLowerCase();
                if (text.includes('reload') || text.includes('重新加载') || text.includes('刷新')) {
                    btns[i].click();
                }
            }
        }
    });

    // Wait for the UI to be ready
    await page.waitForSelector('rich-textarea p, .ql-editor p, textarea, [contenteditable="true"]', { timeout: 15000 });

    console.log(`🧹 Clearing previous context (clicking 'New Chat') to prevent Error 13...`);
    await page.evaluate(() => {
        // Find the "New chat" button which links to /app
        const els = document.querySelectorAll('a, button, div[role="button"]');
        for (let i = 0; i < els.length; i++) {
            const el = els[i] as HTMLElement;
            const text = (el.innerText || '').toLowerCase();
            const aria = (el.getAttribute('aria-label') || '').toLowerCase();
            const href = el.getAttribute('href');
            if (text.includes('new chat') || text.includes('新聊天') || aria.includes('new chat') || aria.includes('新聊天') || href === '/app' || href === 'https://gemini.google.com/app') {
                el.click();
                break;
            }
        }
    });
    // Give it a moment to reset the UI and generate a clean ID
    await page.waitForTimeout(3000);

    console.log(`🤖 connected to Gemini 3.0 Web UI to write tests for [${dirName}]...`);

    // Step 1: Write Tests
    const testPrompt = `
You are an expert Test-Driven Development AI using TypeScript and Jest.
Global Rules:
${rules}

Workflow:
${flow}

Task: Write the Jest tests for ${title}.
Context (Problem Description & Probes):
${problemContext}

Given the above probes, write the complete 'solution.test.ts'.
Rules:
1. Output ONLY a \`\`\`typescript\`\`\` block containing the complete code for solution.test.ts. DO NOT output conversational text.
2. Ensure you import the target function correctly from './solution'.
3. Embed @probe_ref comments above tests to link to the Requirement/Design probes.
`;

    const testResponseText = await actAsGeminiAgent(testPrompt, page);
    const testCode = extractCodeBlock(testResponseText, 'typescript') || testResponseText;

    if (!extractCodeBlock(testResponseText, 'typescript')) {
        console.warn(`[WARNING] Failed to extract testing code block exactly, writing raw text...`);
    }

    fs.writeFileSync(testPath, testCode);
    console.log(`✅ Wrote solution.test.ts`);

    // Step 2: Implement Solution
    console.log(`🤖 Asking Gemini to implement solution for [${dirName}] to pass the tests...`);

    const implementPrompt = `
You are an expert algorithm developer AI using TypeScript.
Global Rules:
${rules}

Task: Implement the solution for ${title} to make the tests pass.
Problem Context & Probes:
${problemContext}

Current stub:
${solutionStub}

Please write the complete 'solution.ts' implementation.
Rules:
1. Output ONLY a \`\`\`typescript\`\`\` block containing the complete code for solution.ts. DO NOT output conversational text.
2. Embed the @probe_ref comments linking back to the Probes.
3. Write a pure function with no side effects and appropriate complexity.
`;

    const implResponseText = await actAsGeminiAgent(implementPrompt, page);
    const implCode = extractCodeBlock(implResponseText, 'typescript') || implResponseText;

    fs.writeFileSync(solutionPath, implCode);
    console.log(`✅ Wrote solution.ts`);

    await page.close();
    await browser.close();

    // Step 3: Run Tests
    console.log(`🧪 Running tests for [${dirName}]...`);
    try {
        const testOutput = execSync(`npx jest problems/${dirName}/solution.test.ts`, { encoding: 'utf8', stdio: 'pipe' });
        console.log(`✅ Tests Passed! (Green state)`);
        return true;
    } catch (error: any) {
        console.error(`❌ Tests Failed!`);
        console.error(error.stderr || error.stdout || error.message);
        return false;
    }
}

async function runDispatcher() {
    console.log('🔍 Scanning for pending problems...');
    const pending = getPendingProblems();

    if (pending.length === 0) {
        console.log('✅ All fetched problems are implemented!');
        return;
    }

    console.log(`\nFound ${pending.length} problems waiting for implementation.`);

    // Process sequentially so we don't overwhelm the browser or the local testing execution
    for (const targetDir of pending) {
        const slug = targetDir.substring(5); // e.g., 0002_add-two-numbers -> add-two-numbers
        const title = tasksMeta[slug] || targetDir;

        console.log(`\n================================================================`);
        console.log(`🚀 Dispatching Web Playwright Subagent Loop for [${targetDir}] (${title})...`);
        console.log(`================================================================`);

        try {
            await runTddSubagentPlaywright(targetDir, title);
            console.log(`🎉 Finished processing ${targetDir}.`);
        } catch (error: any) {
            console.error(`\n❌ Critical Subagent Error for [${targetDir}]:`, error.message);
            console.log(`⏩ Skipping to the next problem in queue...`);
        }

        // Add a polite delay between problems (5 seconds) to let things settle
        console.log(`⏳ Waiting 5 seconds before launching the next problem...`);
        await new Promise(r => setTimeout(r, 5000));
    }

    console.log(`\n🏁 Batch processing loop complete. Check Dashboard for final stats!`);
}

runDispatcher().catch(console.error);
