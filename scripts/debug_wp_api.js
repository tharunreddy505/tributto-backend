
import fetch from 'node-fetch';

const WP_API_URL = 'https://www.tributoo.com/wp-json/wp/v2/posts?per_page=1&_embed';

async function debugPost() {
    try {
        const response = await fetch(WP_API_URL);
        const posts = await response.json();
        const post = posts[0];

        console.log('Post ID:', post.id);
        console.log('Featured Media ID:', post.featured_media);
        console.log('Embedded keys:', post._embedded ? Object.keys(post._embedded) : 'No _embedded');

        if (post._embedded && post._embedded['wp:featuredmedia']) {
            console.log('Featured Media object:', JSON.stringify(post._embedded['wp:featuredmedia'][0], null, 2));
        } else {
            console.log('No wp:featuredmedia found in _embedded');
        }

    } catch (err) {
        console.error(err);
    }
}

debugPost();
