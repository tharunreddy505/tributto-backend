import fs from 'fs';
import readline from 'readline';

async function searchSql() {
    try {
        if (!fs.existsSync('tributoo.sql')) {
            console.error("File tributoo.sql not found");
            return;
        }
        const fileStream = fs.createReadStream('tributoo.sql');
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });

        let count = 0;
        for await (const line of rl) {
            const lowerLine = line.toLowerCase();
            if (lowerLine.includes('insert into') && (lowerLine.includes('comments') || lowerLine.includes('condolence'))) {
                console.log("Found insert line:");
                console.log(line.substring(0, 500) + "...");
                count++;
                if (count > 5) break;
            }
        }
        if (count === 0) console.log("No relevant inserts found in SQL.");
    } catch (e) {
        console.error("Error:", e);
    }
}

searchSql();
