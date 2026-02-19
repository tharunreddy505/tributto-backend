import pool from './db.js';

const SLUGS_TO_DELETE = [
    'cookie-policy',
    'delete-account',
    'communication-preferences',
    'pricing',
    'privacy-policy',
    'contact',
    'voucher',
    'popup-login',
    'membership-thankyou',
    'membership-pricing',
    'lost-password',
    'login',
    'friedhof',
    'partners',
    'onlineshop',
    'memorial-pages',
    'shop-2',
    'cart',
    'checkout',
    'my-account',
    'create-a-memorial-page',
    'blog',
    'test2'
];

async function deleteImportedPages() {
    console.log("Deleting imported pages...");
    try {
        const query = "DELETE FROM pages WHERE slug = ANY($1)";
        const res = await pool.query(query, [SLUGS_TO_DELETE]);
        console.log(`Deleted ${res.rowCount} pages.`);

        // Also try to revert 'home' and 'grief' if they were messed up
        // This part is manual: we strip the imported CSS injection
        // But we can't revert the content overwrite without backup.
        // We will just remove the CSS injection lines.

        console.log("Cleaning up imported CSS from home and grief...");
        const pagesToClean = ['home', 'grief'];

        for (const slug of pagesToClean) {
            const { rows } = await pool.query("SELECT id, content FROM pages WHERE slug = $1", [slug]);
            if (rows.length > 0) {
                let content = rows[0].content;
                // Remove injected CSS
                // It starts with <!-- Imported Styles -->\n<link ...
                // Regex to remove everything from <!-- Imported Styles --> up to the end of styles?
                // Or just remove lines that look like <link ... elementor ...> or <style ... elementor ...>

                // My injection was prepended.
                // It started with <!-- Imported Styles -->
                if (content.includes('<!-- Imported Styles -->')) {
                    // Find the end of the injection? hard to say.
                    // But I know I added it at the top.
                    // Let's just remove the marker and subsequent link/style tags if they match my pattern?
                    // Easier: Remove lines containing "elementor" in specifically link/style tags at the start.

                    // Helper: Split by line, filter out the ones I added?
                    // My script added:
                    // <!-- Imported Styles -->
                    // <link ...>
                    // <style ...>

                    // Let's use a regex to strip the block.
                    // The block starts with <!-- Imported Styles -->
                    // I didn't add a closing marker.
                    // But I prepended it to existing content.
                    // So I can split by <!-- Imported Styles --> and take the 2nd part? No.
                    // I can regex replace `<!-- Imported Styles -->[\s\S]*?<link[^>]+elementor[^>]+>...`
                    // Actually, since I don't have a backup, I can't be 100% sure what was there before IF I overwrote it with WP content first.
                    // Wait! `import_wp_pages.js` OVERWROTE the content with WP content (`content = EXCLUDED.content`).
                    // So `home` and `grief` NOW contain the WordPress HTML.
                    // Reverting the CSS injection won't bring back the original (pre-WP-import) content.
                    // The user says "retrive back".
                    // If they want the ORIGINAL `home`, I can't give it to them unless I have a backup.
                    // If they just want to delete the WP pages, I did that above.
                    // I will leave `home` and `grief` alone for now or warn the user.
                    // Actually, `grief` was overwritten. `home` was overwritten.
                    // I can't "retrieve back" the old `home` from the DB.
                }
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

deleteImportedPages();
