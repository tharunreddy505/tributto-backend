import pool from './db.js';

const WP_API_URL = 'https://www.tributoo.com/wp-json/wp/v2/pages?per_page=100';

async function importPages() {
    console.log("Starting WordPress Pages Import...");

    try {
        const response = await fetch(WP_API_URL);
        if (!response.ok) {
            throw new Error(`Failed to fetch from WP: ${response.statusText}`);
        }

        const pages = await response.json();
        console.log(`Found ${pages.length} pages to import.`);

        for (const page of pages) {
            const title = page.title.rendered || 'Untitled';
            const content = page.content.rendered || '';
            const slug = page.slug;
            const status = page.status === 'publish' ? 'published' : 'draft';
            const date = new Date(page.date);

            console.log(`Importing: ${title} (${slug})`);

            // Check if page exists to log it
            const existing = await pool.query("SELECT id FROM pages WHERE slug = $1", [slug]);

            if (existing.rows.length > 0) {
                console.log(`  -> Update existing page ID ${existing.rows[0].id}`);
            } else {
                console.log(`  -> Creating new page`);
            }

            // Upsert page
            await pool.query(`
                INSERT INTO pages (title, content, slug, status, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, NOW())
                ON CONFLICT (slug) 
                DO UPDATE SET 
                    title = EXCLUDED.title,
                    content = EXCLUDED.content,
                    status = EXCLUDED.status,
                    updated_at = NOW();
            `, [title, content, slug, status, date]);
        }

        console.log("Import completed successfully!");

    } catch (error) {
        console.error("Import failed:", error);
    } finally {
        await pool.end();
    }
}

importPages();
