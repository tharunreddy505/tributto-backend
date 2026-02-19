
async function inspectPage() {
    const url = 'https://www.tributoo.com/';
    console.log(`Fetching ${url}...`);
    try {
        const res = await fetch(url);
        const html = await res.text();

        // Simple regex to find css links
        const linkRegex = /<link[^>]+href=["']([^"']+\.css[^"']*)["'][^>]*>/g;
        let match;
        console.log("Found CSS links:");
        while ((match = linkRegex.exec(html)) !== null) {
            const cssUrl = match[1];
            if (cssUrl.includes('elementor')) {
                console.log(`[Elementor] ${cssUrl}`);
            } else {
                // console.log(`[Other] ${cssUrl}`);
            }
        }

        // Also look for inline styles ID'd as elementor
        const styleRegex = /<style[^>]+id=["'](elementor-[^"']+)["'][^>]*>([\s\S]*?)<\/style>/g;
        while ((match = styleRegex.exec(html)) !== null) {
            console.log(`[Inline Style] ID: ${match[1]}, Length: ${match[2].length}`);
        }

    } catch (e) {
        console.error(e);
    }
}

inspectPage();
