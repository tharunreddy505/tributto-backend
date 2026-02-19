import express from 'express';
import cors from 'cors';
import pool from './db.js'; // Note .js extension
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Stripe from 'stripe';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import crypto from 'crypto';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Setup Nodemailer Transporter (Use Ethereal for dev if no env vars)
let transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: process.env.SMTP_PORT || 587,
    auth: {
        user: process.env.SMTP_USER || 'ethereal_user',
        pass: process.env.SMTP_PASS || 'ethereal_pass'
    }
});

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- MIDDLEWARES ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: "Access denied. No token provided." });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: "Invalid or expired token." });
        req.user = user;
        next();
    });
};

const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ error: "Access denied. Admin privileges required." });
    }
};

// --- VOUCHER TEMPLATE ROUTES ---
app.get('/api/voucher-templates', authenticateToken, isAdmin, async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM voucher_templates ORDER BY is_default DESC, created_at DESC");
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Server error" });
    }
});

app.get('/api/voucher-templates/default', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM voucher_templates WHERE is_default = TRUE LIMIT 1");
        if (result.rows.length === 0) return res.status(404).json({ error: "No default template" });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Server error" });
    }
});

app.post('/api/voucher-templates', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { name, background_color, background_image, logo_url, elements, is_default } = req.body;
        if (is_default) {
            await pool.query("UPDATE voucher_templates SET is_default = FALSE");
        }
        const result = await pool.query(
            "INSERT INTO voucher_templates (name, background_color, background_image, logo_url, elements, is_default) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
            [name, background_color, background_image, logo_url, JSON.stringify(elements || []), is_default || false]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/voucher-templates/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, background_color, background_image, logo_url, elements, is_default } = req.body;
        if (is_default) {
            await pool.query("UPDATE voucher_templates SET is_default = FALSE WHERE id != $1", [id]);
        }
        const result = await pool.query(
            "UPDATE voucher_templates SET name=$1, background_color=$2, background_image=$3, logo_url=$4, elements=$5, is_default=$6, updated_at=CURRENT_TIMESTAMP WHERE id=$7 RETURNING *",
            [name, background_color, background_image, logo_url, JSON.stringify(elements || []), is_default || false, id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/voucher-templates/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("DELETE FROM voucher_templates WHERE id = $1", [id]);
        res.json({ message: "Template deleted" });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Server error" });
    }
});

// --- STRIPE ROUTES ---
app.post('/api/create-payment-intent', async (req, res) => {
    try {
        const { amount } = req.body;

        // Create a PaymentIntent with the order amount and currency
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Stripe expects amount in cents
            currency: 'eur',
            automatic_payment_methods: {
                enabled: true,
            },
        });

        res.send({
            clientSecret: paymentIntent.client_secret,
        });
    } catch (error) {
        console.error("Stripe Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/orders', async (req, res) => {
    try {
        const { email, firstName, lastName, address, city, zipCode, total, paymentIntentId, items } = req.body;

        console.log(`\n📦 New Order Received`);
        console.log(`📧 Customer Email (from checkout): ${email}`);
        console.log(`👤 Customer Name: ${firstName} ${lastName}`);

        const customerName = `${firstName} ${lastName}`.trim();
        const fullAddress = { address, city, zipCode };

        const newOrder = await pool.query(
            "INSERT INTO orders (customer_email, customer_name, address, total_amount, stripe_payment_intent_id, status) VALUES ($1, $2, $3, $4, $5, 'paid') RETURNING id",
            [email, customerName, JSON.stringify(fullAddress), total, paymentIntentId]
        );

        const orderId = newOrder.rows[0].id;
        const processedItems = [];

        for (const item of items) {
            // Check if product is a voucher
            const productRes = await pool.query("SELECT is_voucher, name, price FROM products WHERE id = $1", [item.id]);
            const product = productRes.rows[0];
            let metadata = item.metadata || {};

            if (product && product.is_voucher) {
                const codes = [];
                const attachments = [];

                // Load the default voucher template
                let template = null;
                try {
                    const tplRes = await pool.query("SELECT * FROM voucher_templates WHERE is_default = TRUE LIMIT 1");
                    if (tplRes.rows.length > 0) template = tplRes.rows[0];
                } catch (e) { console.error("Template load error:", e.message); }

                // Generate a code and PDF for EACH item in quantity
                const count = item.quantity || 1;
                const expiryDate = new Date();
                expiryDate.setMonth(expiryDate.getMonth() + 12);
                const expiryStr = expiryDate.toLocaleDateString('de-CH');

                for (let i = 0; i < count; i++) {
                    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
                    codes.push(code);

                    // Shortcode replacements — all dynamic from real order data
                    // Message comes ONLY from the product page (item.metadata.message)
                    const orderDate = new Date();
                    const recipientMessage = (item.metadata && item.metadata.message && item.metadata.message.trim())
                        ? item.metadata.message.trim()
                        : `Dear ${customerName}, thank you for your purchase!`;

                    const replacements = {
                        '[voucher_code]': code,
                        '[coupon_code]': code,
                        '[recipient_message]': recipientMessage,
                        '[expiry_date]': expiryStr,
                        '[product_name]': product.name,
                        '[voucher_value]': `€${parseFloat(product.price).toFixed(2)}`,
                        '[customer_email]': email,
                        '[customer_name]': customerName,
                        '[order_date]': orderDate.toLocaleDateString('de-CH'),
                    };

                    const applyShortcodes = (text) => {
                        let result = text || '';
                        for (const [key, val] of Object.entries(replacements)) {
                            result = result.split(key).join(val);
                        }
                        return result;
                    };

                    // Generate PDF Buffer using template
                    const PAGE_W = 595.28; // A4 width in pts
                    const PAGE_H = 841.89; // A4 height in pts
                    const doc = new PDFDocument({ size: 'A4', margin: 0 });
                    let buffers = [];
                    doc.on('data', buffers.push.bind(buffers));

                    if (template) {
                        const elements = Array.isArray(template.elements) ? template.elements : JSON.parse(template.elements || '[]');

                        // Background color
                        doc.rect(0, 0, PAGE_W, PAGE_H).fill(template.background_color || '#1a1a1a');

                        // Background image (base64 or URL)
                        if (template.background_image && template.background_image.startsWith('data:image')) {
                            try {
                                const base64Data = template.background_image.split(',')[1];
                                const imgBuffer = Buffer.from(base64Data, 'base64');
                                doc.image(imgBuffer, 0, 0, { width: PAGE_W, height: PAGE_H });
                            } catch (imgErr) { console.error("BG image error:", imgErr.message); }
                        }

                        // Logo
                        if (template.logo_url && template.logo_url.startsWith('data:image')) {
                            try {
                                const base64Data = template.logo_url.split(',')[1];
                                const imgBuffer = Buffer.from(base64Data, 'base64');
                                doc.image(imgBuffer, PAGE_W / 2 - 60, 30, { width: 120 });
                            } catch (logoErr) { console.error("Logo error:", logoErr.message); }
                        }

                        // Render each element
                        for (const el of elements) {
                            const xPt = (el.x / 100) * PAGE_W;
                            const yPt = (el.y / 100) * PAGE_H;
                            const widthPt = ((el.width || 80) / 100) * PAGE_W;
                            const text = applyShortcodes(el.content || '');
                            const color = el.color || '#ffffff';
                            const fontSize = el.fontSize || 12;
                            const align = el.align || 'center';

                            doc.fillColor(color)
                                .fontSize(fontSize)
                                .font(el.fontWeight === 'bold' ? 'Helvetica-Bold' : 'Helvetica')
                                .text(text, xPt - widthPt / 2, yPt, {
                                    width: widthPt,
                                    align: align,
                                });
                        }
                    } else {
                        // Fallback basic layout
                        doc.rect(0, 0, PAGE_W, PAGE_H).fill('#1a1a1a');
                        doc.fillColor('#D4AF37').fontSize(28).font('Helvetica-Bold').text('Tributoo Voucher', 0, 120, { width: PAGE_W, align: 'center' });
                        doc.fillColor('#ffffff').fontSize(14).font('Helvetica').text(product.name, 0, 170, { width: PAGE_W, align: 'center' });
                        doc.fillColor('#D4AF37').fontSize(12).font('Helvetica-Bold').text('VOUCHER CODE', 0, 240, { width: PAGE_W, align: 'center' });
                        doc.fillColor('#D4AF37').fontSize(32).font('Helvetica-Bold').text(code, 0, 265, { width: PAGE_W, align: 'center' });
                        doc.fillColor('#aaaaaa').fontSize(11).font('Helvetica').text(`Value: €${parseFloat(product.price).toFixed(2)}`, 0, 320, { width: PAGE_W, align: 'center' });
                        doc.fillColor('#888888').fontSize(9).text(`Valid until: ${expiryStr}`, 0, 360, { width: PAGE_W, align: 'center' });
                    }

                    doc.end();

                    const pdfBuffer = await new Promise((resolve) => {
                        doc.on('end', () => {
                            resolve(Buffer.concat(buffers));
                        });
                    });

                    attachments.push({
                        filename: `Voucher-${code}.pdf`,
                        content: pdfBuffer
                    });
                }

                // Store all codes in metadata
                metadata = { ...metadata, voucher_codes: codes };

                // Send Email with all attachments
                try {
                    await transporter.sendMail({
                        from: `"Tributoo" <${process.env.SMTP_USER}>`,
                        to: email,
                        subject: 'Your Tributoo Voucher Codes',
                        text: `Thank you for your purchase! Your voucher codes are: ${codes.join(', ')}. Please find the vouchers attached.`,
                        html: `<h3>Thank you for your purchase!</h3><p>Your voucher codes are:</p><ul>${codes.map(c => `<li><strong>${c}</strong></li>`).join('')}</ul><p>Please find the vouchers attached.</p>`,
                        attachments: attachments
                    });
                    console.log(`✅ Voucher email sent to ${email} with ${codes.length} codes`);
                } catch (emailErr) {
                    console.error("Failed to send voucher email:", emailErr);
                }
            }

            await pool.query(
                "INSERT INTO order_items (order_id, product_id, product_name, quantity, price, metadata) VALUES ($1, $2, $3, $4, $5, $6)",
                [orderId, item.id, item.name, item.quantity, item.price, JSON.stringify(metadata)]
            );
        }

        res.json({ success: true, orderId });
    } catch (err) {
        console.error("Create Order Error:", err.message);
        res.status(500).json({ error: "Failed to create order" });
    }
});

app.get('/api/orders', authenticateToken, isAdmin, async (req, res) => {
    try {
        const ordersResult = await pool.query("SELECT * FROM orders ORDER BY created_at DESC");
        const orders = ordersResult.rows;

        // Fetch items for each order
        for (let order of orders) {
            const itemsResult = await pool.query("SELECT * FROM order_items WHERE order_id = $1", [order.id]);
            order.items = itemsResult.rows;
        }

        res.json(orders);
    } catch (err) {
        console.error("Get Orders Error:", err.message);
        res.status(500).json({ error: "Failed to fetch orders" });
    }
});

// --- AUTH ROUTES ---
app.post('/api/auth/check-email', async (req, res) => {
    try {
        const { email } = req.body;
        const userExists = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (userExists.rows.length > 0) {
            return res.json({ exists: true });
        }
        res.json({ exists: false });
    } catch (err) {
        console.error("Check Email Error:", err.message);
        res.status(500).json({ error: "Server Error" });
    }
});
app.post('/api/auth/check-username', async (req, res) => {
    try {
        const { username } = req.body;
        const userExists = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
        if (userExists.rows.length > 0) {
            return res.json({ exists: true });
        }
        res.json({ exists: false });
    } catch (err) {
        console.error("Check Username Error:", err.message);
        res.status(500).json({ error: "Server Error" });
    }
});
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password, role, companyName, description, isVisible, logoUrl } = req.body;

        // Check if user exists
        const userExists = await pool.query("SELECT * FROM users WHERE email = $1 OR username = $2", [email, username]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ error: "User with this email or username already exists" });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Insert user
        const newUser = await pool.query(
            "INSERT INTO users (username, email, password_hash, role, company_name, company_description, is_visible, logo_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, username, email, role",
            [username || companyName, email, passwordHash, role, companyName, description, isVisible === 'Yes', logoUrl]
        );

        // Create JWT
        const token = jwt.sign(
            { id: newUser.rows[0].id, role: newUser.rows[0].role },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({ token, user: newUser.rows[0] });
    } catch (err) {
        console.error("Register Error:", err.message);
        res.status(500).json({ error: "Server Error" });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Check user
        const userRes = await pool.query("SELECT * FROM users WHERE username = $1 OR email = $1", [username]);
        if (userRes.rows.length === 0) {
            return res.status(400).json({ error: "Invalid credentials" });
        }

        const user = userRes.rows[0];

        // Check password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ error: "Invalid credentials" });
        }

        // Create JWT
        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (err) {
        console.error("Login Error:", err.message);
        res.status(500).json({ error: "Server Error" });
    }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const userRes = await pool.query("SELECT id, username, email, role, company_name, company_description, logo_url FROM users WHERE id = $1", [req.user.id]);
        if (userRes.rows.length === 0) return res.status(404).json({ error: "User not found" });
        res.json(userRes.rows[0]);
    } catch (err) {
        console.error("Get Me Error:", err.message);
        res.status(500).json({ error: "Server Error" });
    }
});

app.put('/api/auth/profile', authenticateToken, async (req, res) => {
    try {
        const { username, email } = req.body;

        // Basic validation
        if (!username || !email) return res.status(400).json({ error: "Username and email are required" });

        // Check if username/email already taken by another user
        const check = await pool.query("SELECT id FROM users WHERE (username = $1 OR email = $2) AND id != $3", [username, email, req.user.id]);
        if (check.rows.length > 0) return res.status(400).json({ error: "Username or email already taken" });

        await pool.query("UPDATE users SET username = $1, email = $2 WHERE id = $3", [username, email, req.user.id]);
        res.json({ message: "Profile updated" });
    } catch (err) {
        console.error("Update Profile Error:", err.message);
        res.status(500).json({ error: "Server Error" });
    }
});

app.put('/api/auth/change-password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) return res.status(400).json({ error: "Both current and new passwords are required" });

        const userRes = await pool.query("SELECT password_hash FROM users WHERE id = $1", [req.user.id]);
        if (userRes.rows.length === 0) return res.status(404).json({ error: "User not found" });

        const user = userRes.rows[0];

        const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isMatch) return res.status(400).json({ error: "Incorrect current password" });

        const salt = await bcrypt.genSalt(10);
        const newPasswordHash = await bcrypt.hash(newPassword, salt);

        await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [newPasswordHash, req.user.id]);
        res.json({ message: "Password updated successfully" });
    } catch (err) {
        console.error("Change Password Error:", err.message);
        res.status(500).json({ error: "Server Error" });
    }
});

app.get('/api/users', authenticateToken, isAdmin, async (req, res) => {
    try {
        const result = await pool.query("SELECT id, username, email, role, created_at, company_name FROM users ORDER BY created_at DESC");
        res.json(result.rows);
    } catch (err) {
        console.error("Fetch Users Error:", err.message);
        res.status(500).send("Server Error");
    }
});

// Helper function to map database row to frontend object
const mapTribute = (row) => ({
    id: row.id,
    userId: row.user_id,
    name: row.name,
    dates: row.dates,
    birthDate: row.birth_date,
    passingDate: row.passing_date,
    bio: row.bio,
    text: row.bio, // redundancy for frontend
    photo: row.photo_url,
    image: row.photo_url,
    slug: row.slug,
    views: row.views,
    coverUrl: row.cover_url,
    createdAt: row.created_at,
    videoUrls: row.video_urls || [],
    images: [],
    videos: [],
    comments: []
});

app.get('/api/tributes', async (req, res) => {
    try {
        console.log("Fetching all tributes...");
        const tributeRes = await pool.query('SELECT * FROM tributes ORDER BY created_at DESC');
        const tributes = tributeRes.rows.map(mapTribute);

        for (let tribute of tributes) {
            // Fetch media with IDs, ordered by position
            const mediaRes = await pool.query('SELECT id, type, url FROM media WHERE tribute_id = $1 ORDER BY position ASC, created_at ASC', [tribute.id]);
            mediaRes.rows.forEach(m => {
                const mediaObj = { id: m.id, url: m.url };
                if (m.type === 'image') tribute.images.push(mediaObj);
                if (m.type === 'video') tribute.videos.push(mediaObj);
            });
            console.log(`Tribute ID ${tribute.id} (${tribute.name}): ${tribute.images.length} images, ${tribute.videos.length} videos`);

            // Fetch comments
            const commentsRes = await pool.query('SELECT * FROM comments WHERE tribute_id = $1 ORDER BY created_at DESC', [tribute.id]);
            tribute.comments = commentsRes.rows.map(c => ({
                id: c.id,
                name: c.name,
                text: c.content,
                date: new Date(c.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
            }));
        }

        res.json(tributes);
    } catch (err) {
        console.error("API Get Tributes Error:", err.message);
        res.status(500).send("Server Error");
    }
});

app.post('/api/tributes', authenticateToken, async (req, res) => {
    console.log("Receive POST request to /api/tributes. Body size approx:", JSON.stringify(req.body).length);
    try {
        const { name, dates, birthDate, passingDate, bio, photo, coverUrl, slug, userId, videoUrls } = req.body;

        // Validation (basic)
        if (!name) return res.status(400).json({ error: "Name is required" });

        const newTribute = await pool.query(
            "INSERT INTO tributes (name, dates, birth_date, passing_date, bio, photo_url, cover_url, slug, user_id, video_urls) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *",
            [name, dates, birthDate, passingDate, bio, photo, coverUrl || null, slug, userId || null, JSON.stringify(videoUrls || [])]
        );
        console.log("Database Insert Success:", newTribute.rows[0].id);
        res.json(mapTribute(newTribute.rows[0]));
    } catch (err) {
        console.error("Database Insert Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/tributes/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { views, comments, ...updates } = req.body;

        // Check ownership (unless admin)
        const check = await pool.query("SELECT user_id FROM tributes WHERE id = $1", [id]);
        if (check.rows.length === 0) return res.status(404).json({ error: "Tribute not found" });
        if (req.user.role !== 'admin' && check.rows[0].user_id !== req.user.id) {
            return res.status(403).json({ error: "Access denied. You don't own this tribute." });
        }

        const fields = [];
        const values = [];
        let queryIndex = 1;

        console.log(`Updating tribute ${id} with:`, Object.keys(updates));

        if (updates.name !== undefined) { fields.push(`name = $${queryIndex++}`); values.push(updates.name); }
        if (updates.dates !== undefined) { fields.push(`dates = $${queryIndex++}`); values.push(updates.dates); }
        if (updates.bio !== undefined || updates.text !== undefined) {
            fields.push(`bio = $${queryIndex++}`);
            values.push(updates.bio !== undefined ? updates.bio : updates.text);
        }
        if (updates.photo !== undefined || updates.image !== undefined) {
            fields.push(`photo_url = $${queryIndex++}`);
            values.push(updates.photo !== undefined ? updates.photo : updates.image);
        }
        if (updates.birthDate !== undefined) {
            fields.push(`birth_date = $${queryIndex++}`);
            values.push(updates.birthDate === '' ? null : updates.birthDate);
        }
        if (updates.passingDate !== undefined) {
            fields.push(`passing_date = $${queryIndex++}`);
            values.push(updates.passingDate === '' ? null : updates.passingDate);
        }
        if (updates.slug !== undefined) { fields.push(`slug = $${queryIndex++}`); values.push(updates.slug); }
        if (updates.coverUrl !== undefined) { fields.push(`cover_url = $${queryIndex++}`); values.push(updates.coverUrl); }
        if (updates.videoUrls !== undefined) { fields.push(`video_urls = $${queryIndex++}`); values.push(JSON.stringify(updates.videoUrls || [])); }

        if (fields.length > 0) {
            const query = `UPDATE tributes SET ${fields.join(', ')} WHERE id = $${queryIndex}`;
            values.push(id);
            console.log("Executing Query:", query);
            await pool.query(query, values);
        }

        if (views !== undefined) {
            await pool.query("UPDATE tributes SET views = $1 WHERE id = $2", [views, id]);
        }

        res.json({ message: "Updated", success: true });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

app.delete('/api/tributes/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Check ownership (unless admin)
        const check = await pool.query("SELECT user_id FROM tributes WHERE id = $1", [id]);
        if (check.rows.length === 0) return res.status(404).json({ error: "Tribute not found" });
        if (req.user.role !== 'admin' && check.rows[0].user_id !== req.user.id) {
            return res.status(403).json({ error: "Access denied. You don't own this tribute." });
        }

        await pool.query("DELETE FROM tributes WHERE id = $1", [id]);
        res.json({ message: "Tribute deleted" });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

app.post('/api/tributes/:id/comments', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, text } = req.body;
        const newComment = await pool.query(
            "INSERT INTO comments (tribute_id, name, content) VALUES($1, $2, $3) RETURNING *",
            [id, name, text]
        );
        res.json(newComment.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Condolence/Comments Global Management
app.get('/api/comments', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT c.*, t.name as tribute_name 
            FROM comments c 
            JOIN tributes t ON c.tribute_id = t.id 
            ORDER BY c.created_at DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

app.delete('/api/comments/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("DELETE FROM comments WHERE id = $1", [id]);
        res.json({ message: "Comment deleted" });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

app.put('/api/comments/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, content } = req.body;
        await pool.query(
            "UPDATE comments SET name = $1, content = $2 WHERE id = $3",
            [name, content, id]
        );
        res.json({ message: "Comment updated" });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

app.post('/api/tributes/:id/media', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { type, url } = req.body;

        console.log(`Media Uploading to Tribute ${id}: Type=${type}, Size=${url?.length || 0}`);

        if (!url) {
            return res.status(400).json({ error: "No URL/Base64 provided" });
        }

        const existing = await pool.query(
            "SELECT id FROM media WHERE tribute_id = $1 AND url = $2",
            [id, url]
        );

        if (existing.rows.length > 0) {
            console.log(`Media already exists, skipping...`);
            return res.json(existing.rows[0]);
        }

        // Get max position
        const maxPosRes = await pool.query("SELECT MAX(position) as max_pos FROM media WHERE tribute_id = $1", [id]);
        const nextPos = (maxPosRes.rows[0].max_pos || 0) + 1;

        const result = await pool.query(
            "INSERT INTO media (tribute_id, type, url, position) VALUES($1, $2, $3, $4) RETURNING *",
            [id, type, url, nextPos]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Media Upload Error:", err.message);
        res.status(500).send("Server Error: " + err.message);
    }
});

app.delete('/api/media/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("DELETE FROM media WHERE id = $1", [id]);
        res.json({ message: "Media deleted" });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

app.put('/api/tributes/:id/media/reorder', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { order } = req.body; // Array of media IDs

        console.log(`Reordering media for Tribute ${id}:`, order);

        for (let i = 0; i < order.length; i++) {
            await pool.query(
                "UPDATE media SET position = $1 WHERE id = $2 AND tribute_id = $3",
                [i, order[i], id]
            );
        }
        res.json({ message: "Media reordered successfully" });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Media Global API
app.get('/api/media', authenticateToken, isAdmin, async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM media ORDER BY created_at DESC");
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

app.post('/api/media', authenticateToken, async (req, res) => {
    try {
        const { type, url, tribute_id, userId } = req.body;
        const result = await pool.query(
            "INSERT INTO media (type, url, tribute_id, user_id) VALUES ($1, $2, $3, $4) RETURNING *",
            [type, url, tribute_id || null, userId || null]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Settings API
app.get('/api/settings', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM settings");
        const settings = {};
        result.rows.forEach(row => {
            settings[row.key] = row.value;
        });
        res.json(settings);
    } catch (err) {
        console.error("Fetch Settings Error:", err.message);
        res.status(500).send("Server Error");
    }
});

app.post('/api/settings', authenticateToken, isAdmin, async (req, res) => {
    try {
        const settings = req.body; // { key: value }
        for (const [key, value] of Object.entries(settings)) {
            await pool.query(
                "INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
                [key, value]
            );
        }
        res.json({ message: "Settings updated" });
    } catch (err) {
        console.error("Update Settings Error:", err.message);
        res.status(500).send("Server Error");
    }
});

// Pages API
app.get('/api/pages', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM pages ORDER BY created_at DESC");
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

app.post('/api/pages', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { title, content, slug, status } = req.body;
        const result = await pool.query(
            "INSERT INTO pages (title, content, slug, status) VALUES($1, $2, $3, $4) RETURNING *",
            [title, content, slug, status || 'published']
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

app.put('/api/pages/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, slug, status } = req.body;
        console.log(`Updating page ${id}: ${title}`);
        const result = await pool.query(
            "UPDATE pages SET title = $1, content = $2, slug = $3, status = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *",
            [title, content, slug, status || 'published', id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Update Page Error:", err.message);
        res.status(500).send("Server Error");
    }
});

app.delete('/api/pages/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("DELETE FROM pages WHERE id = $1", [id]);
        res.json({ message: "Page deleted" });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Posts API
app.get('/api/posts', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM posts ORDER BY created_at DESC");
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

app.post('/api/posts', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { title, content, slug, status, featured_image, categories, tags } = req.body;
        const result = await pool.query(
            "INSERT INTO posts (title, content, slug, status, featured_image, categories, tags) VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING *",
            [title, content, slug, status || 'published', featured_image, JSON.stringify(categories || []), JSON.stringify(tags || [])]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

app.put('/api/posts/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, slug, status, featured_image, categories, tags } = req.body;
        console.log(`Updating post ${id}: ${title}`);
        const result = await pool.query(
            "UPDATE posts SET title = $1, content = $2, slug = $3, status = $4, featured_image = $5, categories = $6, tags = $7, updated_at = CURRENT_TIMESTAMP WHERE id = $8 RETURNING *",
            [title, content, slug, status || 'published', featured_image, JSON.stringify(categories || []), JSON.stringify(tags || []), id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Update Post Error:", err.message);
        res.status(500).send("Server Error");
    }
});

app.delete('/api/posts/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("DELETE FROM posts WHERE id = $1", [id]);
        res.json({ message: "Post deleted" });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Server error" });
    }
});

app.get('/api/categories', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM categories ORDER BY name ASC");
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Server error" });
    }
});

app.post('/api/categories', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { name } = req.body;
        // Generate a simple slug
        let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        if (!slug) slug = 'cat-' + Date.now(); // Fallback if slug becomes empty

        const result = await pool.query(
            "INSERT INTO categories (name, slug) VALUES($1, $2) ON CONFLICT (name) DO NOTHING RETURNING *",
            [name, slug]
        );

        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            // Already exists, fetch and return it
            const existing = await pool.query("SELECT * FROM categories WHERE name = $1", [name]);
            res.json(existing.rows[0]);
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Server error" });
    }
});

// Menus API
app.get('/api/menus', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM menus ORDER BY created_at DESC");
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

app.get('/api/menus/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const menuResult = await pool.query("SELECT * FROM menus WHERE id = $1", [id]);
        if (menuResult.rows.length === 0) return res.status(404).json({ error: "Menu not found" });

        const itemsResult = await pool.query(
            "SELECT * FROM menu_items WHERE menu_id = $1 ORDER BY item_order ASC",
            [id]
        );

        res.json({
            ...menuResult.rows[0],
            items: itemsResult.rows
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

app.post('/api/menus', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { name, location } = req.body;

        // If location is provided and already exists, clear it from other menus
        if (location) {
            await pool.query("UPDATE menus SET location = NULL WHERE location = $1", [location]);
        }

        const result = await pool.query(
            "INSERT INTO menus (name, location) VALUES($1, $2) RETURNING *",
            [name, location || null]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

app.put('/api/menus/:id', authenticateToken, isAdmin, async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { name, location, items } = req.body;

        console.log(`Updating menu ${id}:`, { name, location, itemsCount: items?.length });

        await client.query('BEGIN');

        // Update menu details
        if (location) {
            console.log(`Clearing other menus for location ${location}`);
            await client.query("UPDATE menus SET location = NULL WHERE location = $1 AND id != $2", [location, id]);
        }

        console.log(`Updating menus table for id ${id}`);
        await client.query(
            "UPDATE menus SET name = $1, location = $2 WHERE id = $3",
            [name, location || null, id]
        );

        // Update items: Easier to delete and re-insert for ordering
        console.log(`Deleting old items for menu ${id}`);
        await client.query("DELETE FROM menu_items WHERE menu_id = $1", [id]);

        if (items && items.length > 0) {
            console.log(`Inserting ${items.length} new items`);
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                // Ensure object_id is a number or null, not an empty string
                const objectId = (item.object_id === '' || item.object_id === undefined) ? null : item.object_id;

                await client.query(
                    "INSERT INTO menu_items (menu_id, title, url, item_order, type, object_id, indent, translations) VALUES($1, $2, $3, $4, $5, $6, $7, $8)",
                    [id, item.title, item.url, i, item.type, objectId, item.indent || 0, JSON.stringify(item.translations || {})]
                );
            }
        }

        await client.query('COMMIT');
        console.log(`Menu ${id} updated successfully`);
        res.json({ message: "Menu updated successfully" });
    } catch (err) {
        if (client) await client.query('ROLLBACK');
        console.error("MENU UPDATE ERROR:", err.message);
        res.status(500).send("Server Error: " + err.message);
    } finally {
        if (client) client.release();
    }
});

app.delete('/api/menus/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("DELETE FROM menus WHERE id = $1", [id]);
        res.json({ message: "Menu deleted" });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Helper to get primary menu for frontend
app.get('/api/menus/location/:location', async (req, res) => {
    try {
        const { location } = req.params;
        const menuResult = await pool.query("SELECT * FROM menus WHERE location = $1", [location]);
        if (menuResult.rows.length === 0) return res.json(null);

        const itemsResult = await pool.query(
            "SELECT * FROM menu_items WHERE menu_id = $1 ORDER BY item_order ASC",
            [menuResult.rows[0].id]
        );

        res.json({
            ...menuResult.rows[0],
            items: itemsResult.rows
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Translation API
// --- MEDIA LIBRARY ROUTES ---
app.get('/api/media', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM media ORDER BY created_at DESC");
        res.json(result.rows);
    } catch (err) {
        console.error("Get Media Error:", err.message);
        res.status(500).json({ error: "Server Error" });
    }
});

app.post('/api/media', authenticateToken, async (req, res) => {
    try {
        const { type, url, userId } = req.body;
        const result = await pool.query(
            "INSERT INTO media (type, url, user_id) VALUES ($1, $2, $3) RETURNING *",
            [type, url, userId || req.user.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Upload Media Error:", err.message);
        res.status(500).json({ error: "Server Error" });
    }
});

app.delete('/api/media/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        if (req.user.role !== 'admin') {
            const check = await pool.query("SELECT user_id FROM media WHERE id = $1", [id]);
            if (check.rows.length > 0 && check.rows[0].user_id !== req.user.id) {
                return res.status(403).json({ error: "Access denied" });
            }
        }
        await pool.query("DELETE FROM media WHERE id = $1", [id]);
        res.json({ message: "Media deleted" });
    } catch (err) {
        console.error("Delete Media Error:", err.message);
        res.status(500).json({ error: "Server Error" });
    }
});

import { translate } from 'google-translate-api-x';

app.post('/api/translate', async (req, res) => {
    try {
        const { text, targetLang } = req.body;
        console.log(`Translating: "${text?.substring(0, 20)}..." to ${targetLang}`);

        if (!text || !targetLang) {
            return res.status(400).json({ error: "Missing text or targetLang" });
        }

        // Fetch API key from settings
        // const settingsRes = await pool.query("SELECT value FROM settings WHERE key = 'googleTranslateApiKey'");
        // const apiKey = settingsRes.rows[0]?.value;

        // Note: google-translate-api-x doesn't require an API Key (it uses the web interface).
        // If we wanted to use the official Google Cloud Translation API, we would need 'google-cloud/translate'.
        // For now, we stick to the library which is free but rate-limited.
        // We ensure we handle 'en' vs 'de' vs 'it' codes correctly.

        const result = await translate(text, { to: targetLang });
        console.log("Translation success:", result.text?.substring(0, 20));
        res.json({
            translatedText: result.text,
            sourceText: text,
            targetLang
        });

    } catch (err) {
        console.error("Translation Error Details:", err);
        res.status(500).json({ error: "Translation failed", details: err.message });
    }
});


// Settings API
app.get('/api/settings/:key', async (req, res) => {
    try {
        const { key } = req.params;
        const result = await pool.query("SELECT value FROM settings WHERE key = $1", [key]);
        if (result.rows.length > 0) {
            res.json({ value: result.rows[0].value });
        } else {
            res.json({ value: '' });
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Server error" });
    }
});

// --- SHOP / PRODUCTS ROUTES ---
app.get('/api/products', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM products ORDER BY created_at DESC");
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Server error" });
    }
});

app.get('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query("SELECT * FROM products WHERE id = $1 OR slug = $2", [id, id]);
        if (result.rows.length === 0) return res.status(404).json({ error: "Product not found" });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Server error" });
    }
});

app.post('/api/products', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { name, description, price, image_url, category, stock, slug, is_virtual, is_downloadable, download_url, stock_type, is_voucher } = req.body;
        const result = await pool.query(
            "INSERT INTO products (name, description, price, image_url, category, stock, slug, is_virtual, is_downloadable, download_url, stock_type, is_voucher) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *",
            [name, description, price, image_url, category, stock, slug, is_virtual || false, is_downloadable || false, download_url || null, stock_type || 'limited', is_voucher || false]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/products/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, price, image_url, category, stock, slug, is_virtual, is_downloadable, download_url, stock_type, is_voucher } = req.body;
        const result = await pool.query(
            "UPDATE products SET name = $1, description = $2, price = $3, image_url = $4, category = $5, stock = $6, slug = $7, is_virtual = $8, is_downloadable = $9, download_url = $10, stock_type = $11, is_voucher = $12 WHERE id = $13 RETURNING *",
            [name, description, price, image_url, category, stock, slug, is_virtual, is_downloadable, download_url, stock_type, is_voucher, id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/products/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("DELETE FROM products WHERE id = $1", [id]);
        res.json({ message: "Product deleted" });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Server error" });
    }
});


// Global error handler
app.use((err, req, res, next) => {
    if (err.type === 'entity.too.large') {
        console.error("Critical: Payload too large for server limits.");
        return res.status(413).send("The file you are trying to upload is too large for the server. (Limit: 500MB)");
    }
    console.error("SERVER ERROR:", err);
    res.status(500).send("Internal Server Error: " + err.message);
});

app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});
