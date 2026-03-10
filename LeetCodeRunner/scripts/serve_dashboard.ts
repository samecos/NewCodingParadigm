import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = 3000;
const PROBLEMS_DIR = path.join(__dirname, '..', 'problems');
const HTML_PATH = path.join(__dirname, '..', 'dashboard', 'index.html');

function getStatus() {
    if (!fs.existsSync(PROBLEMS_DIR)) return [];

    const dirs = fs.readdirSync(PROBLEMS_DIR, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

    const stats = dirs.map(dir => {
        const dirPath = path.join(PROBLEMS_DIR, dir);
        const hasRaw = fs.existsSync(path.join(dirPath, 'raw.md'));
        const hasProblem = fs.existsSync(path.join(dirPath, 'problem.md'));
        const hasTest = fs.existsSync(path.join(dirPath, 'solution.test.ts'));
        const solutionPath = path.join(dirPath, 'solution.ts');

        let hasSolution = false;
        let isImplemented = false;

        if (fs.existsSync(solutionPath)) {
            hasSolution = true;
            const content = fs.readFileSync(solutionPath, 'utf8');
            // Stub is usually around 50-80 bytes. If it's over 100 bytes and has logic, we consider it implemented.
            // Also checking if it's not just returning an empty array/null.
            if (content.length > 120 && content.includes('{') && !content.includes('return [];\r\n};') && !content.includes('return [];\n};')) {
                isImplemented = true;
            }
        }

        let state = '等待分配 (Pending)';
        let color = '#6b7280'; // gray
        let statusId = 0;

        if (isImplemented) {
            state = '实现完成 (Implemented)';
            color = '#10b981'; // green
            statusId = 3;
        } else if (hasTest) {
            state = '测试就绪 (TDD Red)';
            color = '#f59e0b'; // yellow
            statusId = 2;
        } else if (hasProblem) {
            state = '探针生成 (Probed)';
            color = '#3b82f6'; // blue
            statusId = 1;
        }

        return {
            id: dir,
            state,
            color,
            statusId,
            hasRaw,
            hasProblem,
            hasTest,
            isImplemented
        };
    });

    // Sort by statusId desc, then by id asc
    stats.sort((a, b) => {
        if (a.statusId !== b.statusId) return b.statusId - a.statusId;
        return a.id.localeCompare(b.id);
    });

    return stats;
}

const server = http.createServer((req, res) => {
    if (req.url === '/api/status' && req.method === 'GET') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        try {
            const data = getStatus();
            res.writeHead(200);
            res.end(JSON.stringify(data));
        } catch (e) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: String(e) }));
        }
    } else if (req.url === '/' || req.url === '/index.html') {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        try {
            const html = fs.readFileSync(HTML_PATH, 'utf8');
            res.writeHead(200);
            res.end(html);
        } catch (e) {
            res.writeHead(500);
            res.end('Dashboard HTML not found');
        }
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

server.listen(PORT, () => {
    console.log(`\n================================`);
    console.log(`🚀 可视化监控面板已启动: http://localhost:${PORT}`);
    console.log(`================================\n`);
});
