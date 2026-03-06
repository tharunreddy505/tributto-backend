import fs from 'fs';
import readline from 'readline';

async function countInSql(tableName) {
    try {
        const fileStream = fs.createReadStream('tributoo.sql');
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });

        let inTable = false;
        let count = 0;
        for await (const line of rl) {
            if (line.startsWith(`COPY public.${tableName} `)) {
                inTable = true;
                continue;
            }
            if (inTable) {
                if (line === '\\.') {
                    inTable = false;
                    continue;
                }
                count++;
            }
        }
        console.log(`Total ${tableName} in SQL backup: ${count}`);
    } catch (e) {
        console.error("Error:", e);
    }
}

async function run() {
    await countInSql('tributes');
    await countInSql('comments');
    await countInSql('users');
}
run();
