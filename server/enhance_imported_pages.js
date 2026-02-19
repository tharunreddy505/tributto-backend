import pool from './db.js';

const BASE_URL = 'https://www.tributoo.com';

async function enhancePages() {
    console.log("Starting Page Enhancement (CSS Injection)...");

    try {
        // Get all pages
        const { rows: pages } = await pool.query("SELECT id, slug, content FROM pages");

        for (const page of pages) {
            let targetUrl = `${BASE_URL}/${page.slug}`;
            if (page.slug === 'home') targetUrl = BASE_URL; // Handle home

            console.log(`Processing [${page.slug}] -> ${targetUrl}`);

            try {
                const res = await fetch(targetUrl);
                if (!res.ok) {
                    console.log(`  Failed to fetch live page: ${res.status}`);
                    continue;
                }

                const html = await res.text();

                // Extract CSS links
                const cssLinks = [];
                const linkRegex = /<link[^>]+href=["']([^"']+)["'][^>]*>/g;
                let match;

                while ((match = linkRegex.exec(html)) !== null) {
                    const href = match[1];
                    // We want Elementor related CSS
                    if (href.includes('elementor') || href.includes('upload') || href.includes('font')) {
                        // Avoid duplicates if multiple regex matches
                        if (!cssLinks.includes(href)) {
                            cssLinks.push(href);
                        }
                    }
                }

                // Construct the HTML to prepend
                let cssHeader = '<!-- Imported Styles -->\n';
                cssLinks.forEach(link => {
                    cssHeader += `<link rel="stylesheet" href="${link}">\n`;
                });

                // Extract Elementor related inline styles too (often strict settings)
                const styleRegex = /<style[^>]+id=["'](elementor-[^"']+)["'][^>]*>([\s\S]*?)<\/style>/g;
                while ((match = styleRegex.exec(html)) !== null) {
                    cssHeader += `<style id="${match[1]}">${match[2]}</style>\n`;
                }

                // Check if we already injected (avoid double injection if script runs twice)
                if (page.content.includes('<!-- Imported Styles -->')) {
                    console.log('  Skipping: Already enhanced.');
                    continue;
                }

                const newContent = cssHeader + page.content;

                // Update DB
                await pool.query("UPDATE pages SET content = $1 WHERE id = $2", [newContent, page.id]);
                console.log(`  -> Injected ${cssLinks.length} stylesheets.`);

            } catch (err) {
                console.error(`  Error processing ${page.slug}:`, err.message);
            }
        }

    } catch (error) {
        console.error("Enhancement failed:", error);
    } finally {
        await pool.end();
    }
}

enhancePages();
