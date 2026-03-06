import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

async function testPost() {
    const token = jwt.sign(
        { id: 1, role: 'private', is_super_admin: false, permissions: [] },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
    );
    try {
        const res = await fetch('http://localhost:5000/api/tributes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name: 'trial5',
                dates: 'Jan 1, 1990 - Dec 31, 2020',
                slug: 'trial5-' + Date.now()
            })
        });
        console.log("Status:", res.status);
        if (!res.ok) {
            console.log("Error:", await res.text());
        } else {
            console.log("Success POST:", await res.json());
        }
    } catch (e) {
        console.error(e);
    }
}
testPost();
