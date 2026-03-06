import fs from 'fs';
import readline from 'readline';

async function searchSql() {
    try {
        const fileStream = fs.createReadStream('tributoo.sql');
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });

        let tables = new Set();
        for await (const line of rl) {
            const lowerLine = line.toLowerCase();
            if (lowerLine.startsWith('copy ')) {
                const match = line.match(/copy\s+["`]?(\w+)["`]?/i);
                if (match) {
                    tables.add(match[1]);
                }
            }
        }
        console.log("Tables found in SQL COPY:", Array.from(tables).join(', '));
    } catch (e) {
        console.error("Error:", e);
    }
}

searchSql();
