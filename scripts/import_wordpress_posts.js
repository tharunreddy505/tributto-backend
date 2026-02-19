import fetch from 'node-fetch';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;

// Database Connection
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const WP_API_URL = 'https://www.tributoo.com/wp-json/wp/v2/posts?per_page=100&_embed';

async function downloadToBase64(url) {
    if (!url) return null;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Status ${response.status}`);
        const buffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type');
        const base64 = Buffer.from(buffer).toString('base64');
        return `data:${contentType};base64,${base64}`;
    } catch (e) {
        console.error(`\nFailed to download image ${url}:`, e.message);
        return null;
    }
}

async function importPosts() {
    try {
        console.log(`Fetching posts from ${WP_API_URL}...`);
        const response = await fetch(WP_API_URL);

        if (!response.ok) {
            throw new Error(`Failed to fetch posts: ${response.statusText}`);
        }

        const posts = await response.json();
        console.log(`Found ${posts.length} posts. Starting import...`);

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            for (const post of posts) {
                const {
                    id: wp_id,
                    date_gmt,
                    modified_gmt,
                    slug,
                    status,
                    type,
                    link,
                    title: { rendered: title },
                    content: { rendered: content },
                    excerpt: { rendered: excerpt },
                    featured_media,
                    _embedded
                } = post;

                // Map WP status to your app status if needed (publish -> published)
                const mappedStatus = status === 'publish' ? 'published' : 'draft';

                // Get URL from embedded data
                let sourceUrl = null;
                if (_embedded && _embedded['wp:featuredmedia'] && _embedded['wp:featuredmedia'][0]) {
                    sourceUrl = _embedded['wp:featuredmedia'][0].source_url;
                }

                // Download and convert to base64
                let featuredImage = null;
                if (sourceUrl) {
                    process.stdout.write(` [Image for ${slug}] `);
                    featuredImage = await downloadToBase64(sourceUrl);
                }

                // INSERT OR UPDATE based on slug (or you could add a wp_id column to track)
                // Here we use slug as unique identifier logic
                const queryText = `
                    INSERT INTO posts (title, slug, content, excerpt, status, user_id, created_at, updated_at, featured_image)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    ON CONFLICT (slug) 
                    DO UPDATE SET
                        title = EXCLUDED.title,
                        content = EXCLUDED.content,
                        excerpt = EXCLUDED.excerpt,
                        status = EXCLUDED.status,
                        updated_at = EXCLUDED.updated_at,
                        featured_image = EXCLUDED.featured_image
                    RETURNING id;
                `;

                // Using Admin ID (assuming '1' or you can fetch an admin user)
                // Let's assume user_id 1 exists and is admin.
                // Replace 1 with a valid user ID from your users table.
                const userId = 1;

                await client.query(queryText, [
                    title,
                    slug,
                    content,
                    excerpt,
                    mappedStatus,
                    userId,
                    date_gmt,
                    modified_gmt,
                    featuredImage
                ]);

                // Also insert into media table if image exists
                if (featuredImage) {
                    const mediaQuery = `
                        INSERT INTO media (type, url, user_id)
                        SELECT 'image', $1, $2
                        WHERE NOT EXISTS (SELECT 1 FROM media WHERE url = $1)
                    `;
                    await client.query(mediaQuery, [featuredImage, userId]);
                }

                process.stdout.write('.');
            }

            await client.query('COMMIT');
            console.log('\nImport completed successfully!');
            console.log('Posts and their featured images are now stored locally in your database.');

        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Error importing posts:', error);
    } finally {
        await pool.end();
    }
}

importPosts();
