import fs from 'fs';
import readline from 'readline';

async function countCommentsInSql() {
    try {
        const fileStream = fs.createReadStream('tributoo.sql');
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });

        let inComments = false;
        let count = 0;
        for await (const line of rl) {
            if (line.startsWith('COPY public.comments ')) {
                inComments = true;
                continue;
            }
            if (inComments) {
                if (line === '\\.') {
                    inComments = false;
                    break;
                }
                count++;
            }
        }
        console.log(`Total comments in SQL backup: ${count}`);
    } catch (e) {
        console.error("Error:", e);
    }
}

countCommentsInSql();
