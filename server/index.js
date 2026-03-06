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
import { handleMediaUpload, deleteMediaFromStorage } from './upload_manager.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

dotenv.config();

// Ensure uploads folder exists
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads', { recursive: true });
}

// Multer Setup for standard File/FormData uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const now = new Date();
        const year = now.getFullYear().toString();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const dir = path.join('uploads', year, month);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const cleanName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        cb(null, uniqueSuffix + '-' + cleanName);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Setup Nodemailer Transporter (Use Ethereal for dev if no env vars)
// Setup Nodemailer Transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: process.env.SMTP_PORT || 587,
    auth: {
        user: process.env.SMTP_USER || 'ethereal_user',
        pass: process.env.SMTP_PASS || 'ethereal_pass'
    }
});

// --- EMAIL HELPER ---
const getEmailTemplate = async (slug, language = 'en') => {
    try {
        const lang = (language || 'en').toLowerCase();
        const result = await pool.query("SELECT * FROM email_templates WHERE slug = $1 AND language = $2", [slug, lang]);
        if (result.rows.length > 0) return result.rows[0];

        // Fallback to English if requested language template not found
        const fallback = await pool.query("SELECT * FROM email_templates WHERE slug = $1 AND language = 'en'", [slug]);
        return fallback.rows[0];
    } catch (err) {
        console.error("Error fetching email template:", err.message);
        return null;
    }
};

const commonEmailHeader = `
<div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e0e0e0;">
    <div style="background-color: #1a1a1a; padding: 20px 20px; text-align: center; position: relative; border-radius: 0;">
        <img src="https://www.tributoo.com/wp-content/uploads/2025/05/tributoo-icon.png" alt="Tributoo" style="width: 70px; margin-bottom: 10px;">
        <h1 style="color: #ffffff; font-size: 28px; margin: 0; font-weight: normal; letter-spacing: 1px;">[header_title]</h1>
        <div style="text-align: right; margin-top: 0; padding-right: 15px;">
            <img src="https://www.tributoo.com/wp-content/uploads/2024/10/tributoo-w.png" alt="Tributoo Logo" style="width: 80px;">
        </div>
    </div>
    <div style="padding: 40px; color: #444444; line-height: 1.6; font-size: 16px;">
`;

const commonEmailFooter = `
    </div>
    <div style="background-color: #f9f9f9; padding: 20px; text-align: center; border-top: 1px solid #eee;">
        <p style="color: #999; font-size: 12px; margin: 0;">Tributoo · Keeping Memories Alive</p>
    </div>
</div>
`;

const sendTemplatedEmail = async (to, templateSlug, data = {}, attachments = [], language = 'en') => {
    let fullHtml = '';
    let subject = '';
    let templateName = templateSlug;
    try {
        const template = await getEmailTemplate(templateSlug, language);
        if (!template) throw new Error(`Template ${templateSlug} not found`);

        subject = template.subject;
        templateName = template.name || templateSlug;
        let body = template.body;

        // Header/Footer logic
        fullHtml = '';
        if (template.header_enabled !== false) {
            fullHtml += commonEmailHeader.replace('[header_title]', data.header_title || template.name);
        }
        fullHtml += body;
        if (template.footer_enabled !== false) {
            fullHtml += commonEmailFooter;
        }

        // Replace shortcodes in subject and fullHtml
        const allShortcodes = { ...data };
        for (const [key, val] of Object.entries(allShortcodes)) {
            const regex = new RegExp(`\\[${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`, 'g');
            subject = subject.replace(regex, val);
            fullHtml = fullHtml.replace(regex, val);
        }

        const mailOptions = {
            from: `"Tributoo" <${process.env.SMTP_USER}>`,
            to,
            subject,
            html: fullHtml,
            attachments
        };

        const result = await transporter.sendMail(mailOptions);

        // ── Log success ────────────────────────────────────────────────────
        try {
            await pool.query(
                `INSERT INTO email_logs (template_slug, template_name, recipient_email, recipient_name, subject, html_body, language, status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, 'sent')`,
                [templateSlug, templateName, to, data.user_name || '', subject, fullHtml, (language || 'en').substring(0, 10)]
            );
        } catch (_) { /* table may not exist yet */ }

        return result;
    } catch (err) {
        console.error(`Error sending email (${templateSlug}):`, err.message);
        // ── Log failure ────────────────────────────────────────────────────
        try {
            await pool.query(
                `INSERT INTO email_logs (template_slug, template_name, recipient_email, recipient_name, subject, html_body, language, status, error_message)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, 'failed', $8)`,
                [templateSlug, templateName, to, data.user_name || '', subject, fullHtml, (language || 'en').substring(0, 10), err.message]
            );
        } catch (_) { /* safe to skip */ }
        throw err;
    }
};

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static('uploads'));

const isS3Enabled = () => {
    return process.env.USE_S3 === 'true' || process.env.USE_S3 === true;
};

if (isS3Enabled()) {
    console.log("--- AWS S3 MODE ENABLED ---");
    console.log("Bucket:", process.env.AWS_S3_BUCKET);
    console.log("Region:", process.env.AWS_REGION);
} else {
    console.log("--- LOCAL/BASE64 MODE ENABLED (USE_S3 is not true) ---");
}

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
    const isAdminAccount = req.user && (
        req.user.role === 'admin' ||
        req.user.role === 'superadmin' ||
        req.user.is_super_admin ||
        req.user.username === 'admin' ||
        req.user.email === 'admin@tributo'
    );

    if (isAdminAccount) {
        next();
    } else {
        res.status(403).json({ error: "Access denied. Admin privileges required." });
    }
};

const isSuperAdmin = (req, res, next) => {
    const isSuper = req.user && (req.user.is_super_admin || req.user.role === 'superadmin');
    if (isSuper) {
        next();
    } else {
        res.status(403).json({ error: "Access denied. Super Admin privileges required." });
    }
};

const hasPermission = (permission) => {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ error: "Unauthorized" });
        if (req.user.is_super_admin || req.user.role === 'superadmin') return next();

        const permissions = Array.isArray(req.user.permissions) ? req.user.permissions : [];
        if (permissions.includes(permission)) return next();

        res.status(403).json({ error: `Access denied. Missing permission: ${permission}` });
    };
};

// --- VOUCHER TEMPLATE ROUTES ---
app.get('/api/voucher-templates', authenticateToken, hasPermission('products'), async (req, res) => {
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

app.post('/api/voucher-templates', authenticateToken, hasPermission('products'), async (req, res) => {
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

app.put('/api/voucher-templates/:id', authenticateToken, hasPermission('products'), async (req, res) => {
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

app.delete('/api/voucher-templates/:id', authenticateToken, hasPermission('products'), async (req, res) => {
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

// --- VOUCHER VALIDATION ---
app.post('/api/vouchers/validate', async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) return res.status(400).json({ error: "Code is required" });

        const result = await pool.query("SELECT * FROM vouchers WHERE code = $1", [code.toUpperCase()]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Invalid coupon code" });
        }

        const voucher = result.rows[0];
        if (voucher.is_used) {
            return res.status(400).json({ error: "Already coupon used" });
        }

        if (voucher.expiry_date && new Date(voucher.expiry_date) < new Date()) {
            return res.status(400).json({ error: "Coupon code has expired" });
        }

        res.json({
            success: true,
            code: voucher.code,
            value: voucher.value,
            message: "Coupon applied successfully"
        });
    } catch (err) {
        console.error("Voucher Validation Error:", err.message);
        res.status(500).json({ error: "Server error" });
    }
});

app.post('/api/orders', async (req, res) => {
    try {
        const {
            email, firstName, lastName, companyName, country, address, apartment, city, state, zipCode, phone, orderNotes,
            shipToDifferentAddress,
            shippingFirstName, shippingLastName, shippingCompanyName, shippingCountry, shippingAddress,
            shippingApartment, shippingCity, shippingState, shippingZipCode,
            total, paymentIntentId, items
        } = req.body;

        console.log(`\n📦 New Order Received`);
        console.log(`📧 Customer Email (from checkout): ${email}`);
        console.log(`👤 Customer Name: ${firstName} ${lastName}`);

        const customerName = `${firstName} ${lastName}`.trim();
        let fullAddress = { companyName, country, address, apartment, city, state, zipCode, phone, orderNotes };

        if (shipToDifferentAddress) {
            fullAddress = {
                ...fullAddress,
                shipToDifferentAddress: true,
                shippingInfo: {
                    firstName: shippingFirstName,
                    lastName: shippingLastName,
                    companyName: shippingCompanyName,
                    country: shippingCountry,
                    address: shippingAddress,
                    apartment: shippingApartment,
                    city: shippingCity,
                    state: shippingState,
                    zipCode: shippingZipCode
                }
            };
        }

        const newOrder = await pool.query(
            "INSERT INTO orders (customer_email, customer_name, address, total_amount, stripe_payment_intent_id, status) VALUES ($1, $2, $3, $4, $5, 'paid') RETURNING id",
            [email, customerName, JSON.stringify(fullAddress), total, paymentIntentId]
        );

        const orderId = newOrder.rows[0].id;

        // Mark applied coupon as used if any
        if (req.body.couponCode) {
            await pool.query(
                "UPDATE vouchers SET is_used = TRUE, used_at = CURRENT_TIMESTAMP WHERE code = $1",
                [req.body.couponCode.toUpperCase()]
            );
        }
        const processedItems = [];

        for (const item of items) {
            // Check if product is a voucher
            const productRes = await pool.query("SELECT is_voucher, name, price, is_lifetime FROM products WHERE id = $1", [item.id]);
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
                let expiryStr = '';

                if (product.is_lifetime) {
                    expiryStr = "Never Expires (Lifetime)";
                } else {
                    const expiryDate = new Date();
                    expiryDate.setMonth(expiryDate.getMonth() + 12);
                    expiryStr = expiryDate.toLocaleDateString('de-CH');
                }

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

                    // Save to vouchers table
                    try {
                        const expiryDate = new Date();
                        expiryDate.setMonth(expiryDate.getMonth() + 12);
                        await pool.query(
                            "INSERT INTO vouchers (code, order_id, product_id, value, expiry_date) VALUES ($1, $2, $3, $4, $5)",
                            [code, orderId, item.id, product.price, product.is_lifetime ? null : expiryDate]
                        );
                    } catch (vErr) { console.error("Voucher save error:", vErr.message); }
                }

                // Store all codes in metadata
                metadata = { ...metadata, voucher_codes: codes };

                // Send Email with all attachments
                try {
                    await sendTemplatedEmail(email, 'voucher_delivery', {
                        voucher_codes_list: codes.map(c => `<li><strong>${c}</strong></li>`).join('')
                    }, attachments);
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

        // Send General Payment Confirmation Email (Styled like the requested template)
        try {
            const hasMemorial = items.some(item => item.metadata && item.metadata.memorial_id);
            const memorialItem = items.find(item => item.metadata && item.metadata.memorial_id);
            let memorialLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin/memorials`;

            if (memorialItem && memorialItem.metadata.memorial_id) {
                const tribRes = await pool.query('SELECT slug FROM tributes WHERE id = $1', [memorialItem.metadata.memorial_id]);
                if (tribRes.rows.length > 0 && tribRes.rows[0].slug) {
                    memorialLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/memorial/${tribRes.rows[0].slug}`;
                }
            }

            const memorialInfo = hasMemorial ? `
                <p>Your memorial page will remain <strong>active and permanently accessible</strong>.</p>
                <p>Here is the link to the page:<br>
                <a href="${memorialLink}" style="color: #c59d5f; font-weight: bold; text-decoration: underline;">To the memorial page.</a></p>
            ` : `
                <p>Your order has been processed successfully. If you purchased vouchers, you will receive them in a separate email shortly.</p>
            `;

            await sendTemplatedEmail(email, 'payment_confirmation', {
                user_name: firstName || 'Customer',
                order_id_info: `for Order #${orderId}`,
                memorial_info: memorialInfo
            });
        } catch (mailErr) {
            console.error("Order confirmation email failed:", mailErr);
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

        // Upload logo if base64
        let finalLogoUrl = logoUrl;
        if (logoUrl && logoUrl.startsWith('data:')) {
            try {
                finalLogoUrl = await handleMediaUpload(logoUrl, `user_logo_${username || Date.now()}`);
            } catch (uploadErr) { console.error("Logo upload failed:", uploadErr); }
        }

        // Insert user
        const newUser = await pool.query(
            "INSERT INTO users (username, email, password_hash, role, company_name, company_description, is_visible, logo_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, username, email, role",
            [username || companyName, email, passwordHash, role, companyName, description, isVisible === 'Yes', finalLogoUrl]
        );

        // Create JWT
        const token = jwt.sign(
            {
                id: newUser.rows[0].id,
                role: newUser.rows[0].role,
                is_super_admin: false,
                permissions: []
            },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        // ── Send welcome / registration email ──────────────────────────────────
        try {
            const siteUrl = process.env.SITE_URL || 'https://www.tributoo.com';
            await sendTemplatedEmail(
                email,
                'user_registration',
                {
                    user_name: newUser.rows[0].username,
                    user_email: email,
                    account_link: `${siteUrl}/my-account/`,
                    header_title: 'Welcome to Tributoo'
                }
            );
            console.log(`📧 Registration email sent to ${email}`);
        } catch (emailErr) {
            // Don't fail registration if email fails
            console.error('Registration email failed:', emailErr.message);
        }

        res.json({ token, user: { ...newUser.rows[0], is_super_admin: false, permissions: [] } });
    } catch (err) {
        console.error("Register Error:", err.message);
        res.status(500).json({ error: "Server Error" });
    }
});


// ── Forgot Password ────────────────────────────────────────────────────────
app.post('/api/auth/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    try {
        // Always return success to avoid email enumeration
        const userRes = await pool.query('SELECT id, username, email FROM users WHERE email = $1', [email]);
        if (userRes.rows.length === 0) {
            return res.json({ message: 'If this email exists, a reset link has been sent.' });
        }
        const user = userRes.rows[0];

        // Create table if it doesn't exist
        await pool.query(`
            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                token VARCHAR(64) NOT NULL UNIQUE,
                expires_at TIMESTAMPTZ NOT NULL,
                used BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        // Delete any existing tokens for this user
        await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [user.id]);

        // Generate secure random token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        await pool.query(
            'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
            [user.id, token, expiresAt]
        );

        const siteUrl = process.env.SITE_URL || 'https://www.tributoo.com';
        const resetLink = `${siteUrl}/reset-password?token=${token}`;

        try {
            await sendTemplatedEmail(user.email, 'password_reset', {
                user_name: user.username,
                reset_link: resetLink,
                header_title: 'Password Reset'
            });
            console.log(`📧 Password reset email sent to ${user.email}`);
        } catch (mailErr) {
            console.error('Password reset email failed:', mailErr.message);
        }

        res.json({ message: 'If this email exists, a reset link has been sent.' });
    } catch (err) {
        console.error('Forgot password error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// ── Reset Password ─────────────────────────────────────────────────────────
app.post('/api/auth/reset-password', async (req, res) => {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token and password are required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    try {
        const tokenRes = await pool.query(
            `SELECT prt.*, u.username, u.email
             FROM password_reset_tokens prt
             JOIN users u ON u.id = prt.user_id
             WHERE prt.token = $1 AND prt.used = FALSE AND prt.expires_at > NOW()`,
            [token]
        );
        if (tokenRes.rows.length === 0) {
            return res.status(400).json({ error: 'This reset link is invalid or has expired.' });
        }
        const record = tokenRes.rows[0];

        // Hash new password and update
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, record.user_id]);

        // Mark token as used
        await pool.query('UPDATE password_reset_tokens SET used = TRUE WHERE id = $1', [record.id]);

        res.json({ message: 'Password updated successfully.' });
    } catch (err) {
        console.error('Reset password error:', err.message);
        res.status(500).json({ error: 'Server error' });
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
            {
                id: user.id,
                role: user.role,
                is_super_admin: user.is_super_admin,
                permissions: user.permissions || []
            },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                is_super_admin: user.is_super_admin,
                permissions: user.permissions || []
            }
        });
    } catch (err) {
        console.error("Login Error:", err.message);
        res.status(500).json({ error: "Server Error" });
    }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const userRes = await pool.query("SELECT id, username, email, role, company_name, company_description, logo_url, is_super_admin, permissions FROM users WHERE id = $1", [req.user.id]);
        const user = userRes.rows[0];
        user.logo_url = formatMediaUrl(user.logo_url, req);
        res.json(user);
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

// ── Public Author Profile ──────────────────────────────────────────────────
app.get('/api/author/:username', async (req, res) => {
    try {
        const { username } = req.params;

        // Fetch user profile (public fields only)
        const userRes = await pool.query(
            `SELECT id, username, email, role, created_at, company_name, logo_url, is_visible, company_description
             FROM users
             WHERE username = $1`,
            [username]
        );
        if (userRes.rows.length === 0) {
            return res.status(404).json({ error: 'Author not found' });
        }
        const user = userRes.rows[0];

        // Fetch their public/active memorials
        const tributesRes = await pool.query(
            `SELECT t.id, t.name, t.slug, t.photo_url, t.cover_url, t.birth_date, t.passing_date, t.created_at,
                    t.status,
                    s.status as subscription_status, s.is_lifetime, s.trial_end, s.paid_end
             FROM tributes t
             LEFT JOIN subscriptions s ON t.id = s.memorial_id
             WHERE t.user_id = $1
               AND (t.status = 'public' OR t.status = 'private' OR t.status IS NULL)
             ORDER BY t.created_at DESC`,
            [user.id]
        );

        const memorials = tributesRes.rows.map(t => {
            // All memorials are now considered active/public indefinitely (no trial)
            return t;
        });

        res.json({
            user: {
                id: user.id,
                username: user.username,
                displayName: user.company_name || user.username,
                role: user.role,
                logo_url: formatMediaUrl(user.logo_url, req),
                description: user.company_description,
                joined: user.created_at,
                is_visible: user.is_visible
            },
            memorials: memorials.map(m => ({ ...m, photo_url: formatMediaUrl(m.photo_url, req), cover_url: formatMediaUrl(m.cover_url, req) })),
            totalActive: memorials.length
        });
    } catch (err) {
        console.error('Author profile error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// ── Send Direct Message to Author ──────────────────────────────────────────
app.post('/api/author/:username/message', async (req, res) => {
    try {
        const { username } = req.params;
        const { message } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Fetch user profile to get their email
        const userRes = await pool.query(
            `SELECT id, username, email, company_name FROM users WHERE username = $1`,
            [username]
        );
        if (userRes.rows.length === 0) {
            return res.status(404).json({ error: 'Author not found' });
        }

        const user = userRes.rows[0];
        const authorName = user.company_name || user.username;

        // Send email to author
        const mailOptions = {
            from: process.env.SMTP_FROM || '"Tributoo" <noreply@tributoo.de>',
            to: user.email,
            subject: `New Direct Message from Tributoo`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <img src="https://backend.tributoo.de/uploads/tributoo-logo.png" alt="Tributoo" style="max-height: 40px;" />
                    </div>
                    <div style="background: #ffffff; padding: 30px; border-radius: 12px; border: 1px solid #eaeaea;">
                        <h2 style="color: #2c3338; margin-top: 0; font-size: 20px;">Hello ${authorName},</h2>
                        <p style="font-size: 15px; line-height: 1.6; color: #555;">
                            You have received a new direct message via your Tributoo author profile.
                        </p>
                        <div style="background: #f9f9fa; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #D4AF37;">
                            <p style="white-space: pre-wrap; margin: 0; font-size: 15px; color: #222;">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
                        </div>
                        <p style="color: #888; font-size: 13px; margin-top: 30px; text-align: center;">
                            This message was sent securely through the Tributoo platform.
                        </p>
                    </div>
                </div>
            `
        };

        if (transporter && mailOptions.to) {
            await transporter.sendMail(mailOptions);
        }

        res.json({ success: true, message: "Message sent" });
    } catch (err) {
        console.error('Author direct message error:', err.message);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

app.get('/api/users', authenticateToken, isAdmin, async (req, res) => {

    try {
        const result = await pool.query("SELECT id, username, email, role, created_at, company_name, is_super_admin, permissions FROM users ORDER BY created_at DESC");
        res.json(result.rows);
    } catch (err) {
        console.error("Fetch Users Error:", err.message);
        res.status(500).send("Server Error");
    }
});

app.post('/api/users', authenticateToken, isSuperAdmin, async (req, res) => {
    try {
        const { username, email, password, role, is_super_admin, permissions } = req.body;

        const userExists = await pool.query("SELECT * FROM users WHERE email = $1 OR username = $2", [email, username]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ error: "User already exists" });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const result = await pool.query(
            "INSERT INTO users (username, email, password_hash, role, is_super_admin, permissions) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username, email, role, is_super_admin, permissions, created_at",
            [username, email, passwordHash, role || 'private', is_super_admin === true, JSON.stringify(permissions || [])]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error("Create User Error:", err.message);
        res.status(500).json({ error: "Server Error" });
    }
});

// Bulk update users — MUST be before /:id to avoid 'bulk' being treated as an ID
app.put('/api/users/bulk', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { userIds, role, is_super_admin, permissions } = req.body;

        if (!Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ error: "No user IDs provided" });
        }

        if (is_super_admin === true && !req.user.is_super_admin) {
            return res.status(403).json({ error: "Only super admins can grant super admin status." });
        }

        const updates = [];
        const values = [];
        let idx = 1;

        if (role !== undefined) { updates.push(`role = $${idx++}`); values.push(role); }
        if (is_super_admin !== undefined) { updates.push(`is_super_admin = $${idx++}`); values.push(is_super_admin === true); }
        if (permissions !== undefined) { updates.push(`permissions = $${idx++}`); values.push(JSON.stringify(permissions)); }

        if (updates.length === 0) {
            return res.status(400).json({ error: "Nothing to update" });
        }

        const idPlaceholders = userIds.map((_, i) => `$${idx + i}`).join(', ');
        values.push(...userIds);

        const query = `UPDATE users SET ${updates.join(', ')} WHERE id IN (${idPlaceholders}) RETURNING id, username, email, role, is_super_admin, permissions`;
        const result = await pool.query(query, values);
        res.json(result.rows);
    } catch (err) {
        console.error("Bulk Update Users Error:", err.message);
        res.status(500).json({ error: "Server Error" });
    }
});

app.put('/api/users/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { role, is_super_admin, permissions, username, email } = req.body;

        if (is_super_admin && !req.user.is_super_admin) {
            return res.status(403).json({ error: "Only super admins can grant super admin status." });
        }

        const result = await pool.query(
            "UPDATE users SET role = $1, is_super_admin = $2, permissions = $3, username = COALESCE($4, username), email = COALESCE($5, email) WHERE id = $6 RETURNING id, username, email, role, is_super_admin, permissions",
            [role, is_super_admin === true, JSON.stringify(permissions || []), username, email, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error("Update User Error:", err.message);
        res.status(500).json({ error: "Server Error" });
    }
});

app.delete('/api/users/:id', authenticateToken, isSuperAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        // Prevent deleting yourself
        if (id == req.user.id) {
            return res.status(400).json({ error: "You cannot delete your own account" });
        }
        await pool.query("DELETE FROM users WHERE id = $1", [id]);
        res.json({ message: "User deleted successfully" });
    } catch (err) {
        console.error("Delete User Error:", err.message);
        res.status(500).json({ error: "Server Error" });
    }
});

const formatMediaUrl = (url, req) => {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    return `${protocol}://${req.get('host')}${url.startsWith('/') ? '' : '/'}${url}`;
};

// Helper function to map database row to frontend object
const mapTribute = (row, req) => ({
    id: row.id,
    userId: row.user_id,
    name: row.name,
    dates: row.dates,
    birthDate: row.birth_date,
    passingDate: row.passing_date,
    bio: row.bio,
    text: row.bio, // redundancy for frontend
    photo: formatMediaUrl(row.photo_url, req),
    image: formatMediaUrl(row.photo_url, req),
    slug: row.slug,
    views: row.views,
    coverUrl: formatMediaUrl(row.cover_url, req),
    createdAt: row.created_at,
    videoUrls: row.video_urls || [],
    status: row.status || 'public',
    images: [],
    videos: [],
    comments: []
});

app.get('/api/tributes', async (req, res) => {
    try {
        // Optional auth: check if user is logged in to show them their own drafts
        let currentUser = null;
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (token) {
            try {
                currentUser = jwt.verify(token, process.env.JWT_SECRET);
            } catch (jwtErr) {
                // Invalid token, treat as public
            }
        }

        const isAdminUser = currentUser && (
            currentUser.role === 'admin' ||
            currentUser.role === 'superadmin' ||
            currentUser.is_super_admin
        );

        console.log("Fetching tributes...");

        // Query remains similar but we'll handle filtering in JS for simplicity with current structure,
        // or we could add WHERE clause. Let's handle it in the mapping for consistency with previous logic.
        const tributeRes = await pool.query(`
            SELECT t.*, 
                   s.status as subscription_status, s.is_lifetime, s.trial_end, s.paid_end,
                   u.username as author_name, 
                   p.name as product_name
            FROM tributes t
            LEFT JOIN subscriptions s ON t.id = s.memorial_id
            LEFT JOIN users u ON t.user_id = u.id
            LEFT JOIN products p ON s.product_id = p.id
            ORDER BY t.created_at DESC
        `);

        let rows = tributeRes.rows;
        const now = new Date();

        // Expiration sync removed - memorials are now permanent.

        // All memorials are now viewable if published, or if owner
        rows = rows.filter(row => {
            if (isAdminUser) return true;
            const isViewableStatus = row.status === 'public' || row.status === 'private' || !row.status;
            const isOwner = currentUser && String(row.user_id) === String(currentUser.id);
            return isViewableStatus || isOwner;
        });

        const tributes = rows.map(row => {
            const tribute = mapTribute(row, req);
            tribute.subscriptionStatus = row.subscription_status || 'active';
            tribute.isLifetime = true;
            tribute.trialEnd = null;
            tribute.paidEnd = null;
            tribute.authorName = row.author_name;
            tribute.packageName = row.product_name;
            return tribute;
        });

        const tributeIds = tributes.map(t => t.id);

        if (tributeIds.length > 0) {
            // Fetch ALL media for these tributes in one query
            const mediaRes = await pool.query(
                'SELECT id, type, url, tribute_id, alt_text, title, caption, description FROM media WHERE tribute_id = ANY($1) ORDER BY position ASC, created_at ASC',
                [tributeIds]
            );

            // Map media to tributes
            mediaRes.rows.forEach(m => {
                const tribute = tributes.find(t => t.id === m.tribute_id);
                if (tribute) {
                    const mediaObj = {
                        id: m.id,
                        url: formatMediaUrl(m.url, req),
                        alt_text: m.alt_text,
                        title: m.title,
                        caption: m.caption,
                        description: m.description
                    };

                    // Check if this media is the profile photo or cover image
                    if (tribute.photo && m.url && typeof tribute.photo === 'string' && m.url.includes(tribute.photo.split('/').pop())) {
                        tribute.photoMeta = mediaObj;
                    }
                    if (tribute.coverUrl && m.url && typeof tribute.coverUrl === 'string' && m.url.includes(tribute.coverUrl.split('/').pop())) {
                        tribute.coverMeta = mediaObj;
                    }

                    if (m.type === 'image') tribute.images.push(mediaObj);
                    if (m.type === 'video') tribute.videos.push(mediaObj);
                }
            });

            // Fetch ALL comments for these tributes in one query
            const commentsRes = await pool.query(
                'SELECT * FROM comments WHERE tribute_id = ANY($1) ORDER BY created_at DESC',
                [tributeIds]
            );

            // Map comments to tributes
            commentsRes.rows.forEach(c => {
                const tribute = tributes.find(t => t.id === c.tribute_id);
                if (tribute) {
                    tribute.comments.push({
                        id: c.id,
                        name: c.name,
                        text: c.content,
                        date: new Date(c.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                    });
                }
            });
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
        const { name, dates, birthDate, passingDate, bio, photo, coverUrl, slug, userId, videoUrls, subscription_id, status, isPaidDraft } = req.body;

        // Restriction: One free memorial page per user
        if (!isPaidDraft) {
            const existingCount = await pool.query("SELECT COUNT(*) FROM tributes WHERE user_id = $1", [userId || req.user.id]);
            if (parseInt(existingCount.rows[0].count) >= 1) {
                return res.status(403).json({ error: "Free version limited to 1 memorial page. Please upgrade for more." });
            }
        }

        // Validation (basic)
        if (!name) return res.status(400).json({ error: "Name is required" });

        // Defensively ensure status column exists
        try {
            await pool.query("ALTER TABLE tributes ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'public'");
        } catch (e) { /* already exists */ }

        // Upload images if they are base64
        let photoUrl = photo;
        let finalCoverUrl = coverUrl;

        try {
            if (photo && photo.startsWith('data:')) {
                console.log(`Uploading profile photo...`);
                photoUrl = await handleMediaUpload(photo, `memorial_photo_${slug || Date.now()}`);
            }
            if (coverUrl && coverUrl.startsWith('data:')) {
                console.log(`Uploading cover image...`);
                finalCoverUrl = await handleMediaUpload(coverUrl, `memorial_cover_${slug || Date.now()}`);
            }
        } catch (uploadErr) {
            console.error("Upload Failed during memorial creation:", uploadErr.message);
            // Optional: fallback to base64 if upload completely fails?
            // Actually better to keep the base64 if it's already there? No, user wants folders.
            // But we already have the base64, so it stays in the DB if we don't update it.
        }

        const newTribute = await pool.query(
            "INSERT INTO tributes (name, dates, birth_date, passing_date, bio, photo_url, cover_url, slug, user_id, video_urls, status) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *",
            [name, dates, birthDate, passingDate, bio, photoUrl, finalCoverUrl || null, slug, userId || null, JSON.stringify(videoUrls || []), status || 'public']
        );
        const tributeId = newTribute.rows[0].id;

        // Link subscription if provided
        if (subscription_id) {
            await pool.query(
                "UPDATE subscriptions SET memorial_id = $1, memorial_name = $2 WHERE id = $3",
                [tributeId, name, subscription_id]
            );
        }

        // Add to Media Library
        if (photo && photo.startsWith('data:') && photoUrl) {
            await pool.query("INSERT INTO media (tribute_id, user_id, type, url, alt_text) VALUES ($1, $2, 'image', $3, 'Profile Photo')", [tributeId, userId || req.user?.id || null, photoUrl]);
        }
        if (coverUrl && coverUrl.startsWith('data:') && finalCoverUrl) {
            await pool.query("INSERT INTO media (tribute_id, user_id, type, url, alt_text) VALUES ($1, $2, 'image', $3, 'Cover Image')", [tributeId, userId || req.user?.id || null, finalCoverUrl]);
        }

        console.log("Database Insert Success:", tributeId);
        res.json(mapTribute(newTribute.rows[0], req));
    } catch (err) {
        console.error("Database Insert Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/tributes/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { views, comments, ...updates } = req.body;

        // Check ownership (unless admin/superadmin)
        const check = await pool.query("SELECT user_id FROM tributes WHERE id = $1", [id]);
        if (check.rows.length === 0) return res.status(404).json({ error: "Tribute not found" });
        const isPrivilegedUser = req.user.role === 'admin' || req.user.role === 'superadmin' || req.user.is_super_admin;
        const isOwner = check.rows[0].user_id && String(check.rows[0].user_id) === String(req.user.id);
        if (!isPrivilegedUser && !isOwner) {
            return res.status(403).json({ error: "Access denied. You don't own this tribute." });
        }

        const fields = [];
        const values = [];
        let queryIndex = 1;

        console.log(`Updating tribute ${id} with:`, Object.keys(updates));

        // Process specific base64 fields
        try {
            if (updates.photo && updates.photo.startsWith('data:')) {
                console.log(`Updating profile photo (ID: ${id})...`);
                updates.photo = await handleMediaUpload(updates.photo, `memorial_photo_${id}_${Date.now()}`);
                await pool.query("INSERT INTO media (tribute_id, user_id, type, url, alt_text) VALUES ($1, $2, 'image', $3, 'Profile Photo')", [id, req.user.id, updates.photo]);
            } else if (updates.image && updates.image.startsWith('data:')) {
                console.log(`Updating profile image (ID: ${id})...`);
                updates.image = await handleMediaUpload(updates.image, `memorial_photo_${id}_${Date.now()}`);
                await pool.query("INSERT INTO media (tribute_id, user_id, type, url, alt_text) VALUES ($1, $2, 'image', $3, 'Profile Photo')", [id, req.user.id, updates.image]);
            }

            if (updates.coverUrl && updates.coverUrl.startsWith('data:')) {
                console.log(`Updating cover image (ID: ${id})...`);
                updates.coverUrl = await handleMediaUpload(updates.coverUrl, `memorial_cover_${id}_${Date.now()}`);
                await pool.query("INSERT INTO media (tribute_id, user_id, type, url, alt_text) VALUES ($1, $2, 'image', $3, 'Cover Image')", [id, req.user.id, updates.coverUrl]);
            }
        } catch (uploadErr) {
            console.error("Upload Failed during memorial update:", uploadErr.message);
        }

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
        if (updates.status !== undefined) { fields.push(`status = $${queryIndex++}`); values.push(updates.status); }

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
        console.error("PUT TRIBUTES ID ERROR", err.message, err.stack);
        res.status(500).json({ error: "Server Error: " + err.message });
    }
});

app.post('/api/tributes/:id/view', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("UPDATE tributes SET views = views + 1 WHERE id = $1", [id]);
        res.json({ message: "View recorded" });
    } catch (err) {
        console.error("View Record Error:", err.message);
        res.status(500).json({ error: "Server Error" });
    }
});

app.delete('/api/tributes/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Check ownership (unless admin/superadmin)
        const check = await pool.query("SELECT user_id FROM tributes WHERE id = $1", [id]);
        if (check.rows.length === 0) return res.status(404).json({ error: "Tribute not found" });
        const isPrivilegedUser = req.user.role === 'admin' || req.user.role === 'superadmin' || req.user.is_super_admin;
        const isOwner = check.rows[0].user_id && String(check.rows[0].user_id) === String(req.user.id);
        if (!isPrivilegedUser && !isOwner) {
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

// --- TRIBUTE TRANSLATIONS ---
app.get('/api/tributes/:id/translations/:lang', authenticateToken, async (req, res) => {
    try {
        const { id, lang } = req.params;
        const language = (lang || 'en').toLowerCase();

        // Try to get the translation record
        const result = await pool.query(
            'SELECT * FROM tribute_translations WHERE tribute_id = $1 AND language = $2',
            [id, language]
        );

        if (result.rows.length > 0) {
            return res.json(result.rows[0]);
        }

        // Fallback: return the base tribute data
        const base = await pool.query('SELECT name, bio FROM tributes WHERE id = $1', [id]);
        if (base.rows.length === 0) return res.status(404).json({ error: 'Tribute not found' });
        return res.json({ tribute_id: id, language, name: base.rows[0].name, bio: base.rows[0].bio });
    } catch (err) {
        // If table doesn't exist yet, return base data
        if (err.code === '42P01') {
            try {
                const base = await pool.query('SELECT name, bio FROM tributes WHERE id = $1', [req.params.id]);
                return res.json({ tribute_id: req.params.id, language: req.params.lang, name: base.rows[0]?.name || '', bio: base.rows[0]?.bio || '' });
            } catch (e2) { }
        }
        console.error('Get Tribute Translation Error:', err.message);
        res.status(500).json({ error: 'Server Error' });
    }
});

app.put('/api/tributes/:id/translations/:lang', authenticateToken, async (req, res) => {
    try {
        const { id, lang } = req.params;
        const { name, bio } = req.body;
        const language = (lang || 'en').toLowerCase();

        // Ensure table exists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS tribute_translations (
                id SERIAL PRIMARY KEY,
                tribute_id INTEGER NOT NULL REFERENCES tributes(id) ON DELETE CASCADE,
                language VARCHAR(10) NOT NULL,
                name TEXT,
                bio TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(tribute_id, language)
            )
        `);

        const result = await pool.query(
            `INSERT INTO tribute_translations (tribute_id, language, name, bio)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (tribute_id, language)
             DO UPDATE SET name = EXCLUDED.name, bio = EXCLUDED.bio, updated_at = CURRENT_TIMESTAMP
             RETURNING *`,
            [id, language, name || '', bio || '']
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Put Tribute Translation Error:', err.message);
        res.status(500).json({ error: err.message });
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
        let { type, url } = req.body;

        // LIMITS: Max 5 images, NO videos for free version (Skip for Admin)
        const isPrivileged = req.user.role === 'admin' || req.user.role === 'superadmin' || req.user.is_super_admin;

        if (!isPrivileged) {
            if (type === 'video') {
                return res.status(403).json({ error: "Video uploads are not available in the free version." });
            }

            const countRes = await pool.query("SELECT COUNT(*) FROM media WHERE tribute_id = $1 AND type = 'image'", [id]);
            if (parseInt(countRes.rows[0].count) >= 5) {
                return res.status(403).json({ error: "Free version limited to 5 images per memorial." });
            }
        }

        console.log(`Media Uploading to Tribute ${id}: Type=${type}, Size=${url?.length || 0}`);

        if (!url) {
            return res.status(400).json({ error: "No URL/Base64 provided" });
        }

        // Upload media if base64
        if (url && url.startsWith('data:')) {
            try {
                console.log(`Uploading media for tribute ${id}...`);
                const fileName = `tribute_${id}_${Date.now()}`;
                url = await handleMediaUpload(url, fileName);
            } catch (uploadErr) {
                console.error("Media Upload Failed:", uploadErr.message);
            }
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

        // Fetch URL before deleting from DB
        const mediaRes = await pool.query("SELECT url, user_id FROM media WHERE id = $1", [id]);
        if (mediaRes.rows.length === 0) return res.status(404).json({ error: "Media not found" });

        const { url, user_id } = mediaRes.rows[0];

        // Check ownership
        if (req.user.role !== 'admin' && req.user.role !== 'superadmin' && !req.user.is_super_admin && user_id !== req.user.id) {
            return res.status(403).json({ error: "Access denied" });
        }

        // Delete from storage (S3 or Local)
        await deleteMediaFromStorage(url);

        // Delete from DB
        await pool.query("DELETE FROM media WHERE id = $1", [id]);
        res.json({ message: "Media deleted successfully" });
    } catch (err) {
        console.error("Delete Media Error:", err.message);
        res.status(500).json({ error: "Server Error" });
    }
});

/**
 * Direct File Upload (Multipart/FormData)
 * More efficient than base64 for large files
 */
app.post('/api/media/upload', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No file uploaded" });
        const { type, tribute_id } = req.body;

        // Enforcement of limits for direct upload too (Skip for Admin)
        const isPrivileged = req.user.role === 'admin' || req.user.role === 'superadmin' || req.user.is_super_admin;

        if (tribute_id && !isPrivileged) {
            if (type === 'video') {
                return res.status(403).json({ error: "Video uploads restricted." });
            }
            const countRes = await pool.query("SELECT COUNT(*) FROM media WHERE tribute_id = $1 AND type = 'image'", [tribute_id]);
            if (parseInt(countRes.rows[0].count) >= 5) {
                return res.status(403).json({ error: "Limit of 5 images reached." });
            }
        }

        // Construct path relative to server root
        const relativePath = '/' + req.file.path.replace(/\\/g, '/');

        const result = await pool.query(
            "INSERT INTO media (type, url, tribute_id, user_id) VALUES ($1, $2, $3, $4) RETURNING *",
            [type || 'image', relativePath, tribute_id || null, req.user.id]
        );

        const row = result.rows[0];
        row.url = formatMediaUrl(row.url, req);
        res.json(row);
    } catch (err) {
        console.error("Direct Upload Error:", err.message);
        res.status(500).json({ error: "Server Error" });
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
app.get('/api/media', authenticateToken, hasPermission('media'), async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM media ORDER BY created_at DESC");
        const rows = result.rows.map(row => ({ ...row, url: formatMediaUrl(row.url, req) }));
        res.json(rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

app.post('/api/media', authenticateToken, async (req, res) => {
    try {
        let { type, url, tribute_id, userId } = req.body;

        // LIMITS: Max 5 images, NO videos for free version (if linked to tribute)
        if (tribute_id) {
            if (type === 'video') {
                return res.status(403).json({ error: "Video uploads are not available in the free version." });
            }

            const countRes = await pool.query("SELECT COUNT(*) FROM media WHERE tribute_id = $1 AND type = 'image'", [tribute_id]);
            if (parseInt(countRes.rows[0].count) >= 5) {
                return res.status(403).json({ error: "Free version limited to 5 images per memorial." });
            }
        }

        // Upload global media if base64
        if (url && url.startsWith('data:')) {
            try {
                console.log(`Uploading global media...`);
                const fileName = `media_${tribute_id || 'global'}_${Date.now()}`;
                url = await handleMediaUpload(url, fileName);
            } catch (uploadErr) {
                console.error("Global Media Upload Failed:", uploadErr.message);
            }
        }

        const result = await pool.query(
            "INSERT INTO media (type, url, tribute_id, user_id) VALUES ($1, $2, $3, $4) RETURNING *",
            [type, url, tribute_id || null, userId || req.user.id]
        );
        const row = result.rows[0];
        row.url = formatMediaUrl(row.url, req);
        res.json(row);
    } catch (err) {
        console.error("Upload Media Error:", err.message);
        res.status(500).json({ error: "Server Error" });
    }
});

app.put('/api/media/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { alt_text, title, caption, description } = req.body;

        const result = await pool.query(
            `UPDATE media 
             SET alt_text = COALESCE($1, alt_text), 
                 title = COALESCE($2, title), 
                 caption = COALESCE($3, caption), 
                 description = COALESCE($4, description) 
             WHERE id = $5 RETURNING *`,
            [alt_text !== undefined ? alt_text : null,
            title !== undefined ? title : null,
            caption !== undefined ? caption : null,
            description !== undefined ? description : null,
                id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Media not found" });
        }

        const row = result.rows[0];
        row.url = formatMediaUrl(row.url, req);
        res.json(row);
    } catch (err) {
        console.error("Update Media Error:", err.message);
        res.status(500).json({ error: "Server Error" });
    }
});

// Settings API
app.get('/api/settings', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM settings");
        const settings = {};
        result.rows.forEach(row => {
            const keysToFormat = ['logo', 'site_favicon', 'og_image'];
            settings[row.key] = keysToFormat.includes(row.key) ? formatMediaUrl(row.value, req) : row.value;
        });
        res.json(settings);
    } catch (err) {
        console.error("Fetch Settings Error:", err.message);
        res.status(500).send("Server Error");
    }
});

app.post('/api/settings', authenticateToken, isSuperAdmin, async (req, res) => {
    try {
        const settings = req.body; // { key: value }
        for (let [key, value] of Object.entries(settings)) {
            // Upload image settings if they are base64
            if (value && value.startsWith('data:') && (key === 'logo' || key === 'site_favicon')) {
                try {
                    value = await handleMediaUpload(value, `setting_${key}`);
                    console.log(`Setting ${key} uploaded:`, value);
                } catch (uploadErr) {
                    console.error(`Upload Failed for setting ${key}:`, uploadErr);
                }
            }

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
        const rows = result.rows.map(row => ({ ...row, og_image: formatMediaUrl(row.og_image, req) }));
        res.json(rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

app.post('/api/pages', authenticateToken, hasPermission('pages'), async (req, res) => {
    try {
        let { title, content, slug, status, seo_title, seo_description, seo_keywords, og_image } = req.body;

        // Upload page og_image if base64
        if (og_image && og_image.startsWith('data:')) {
            try {
                og_image = await handleMediaUpload(og_image, `page_og_${slug || Date.now()}`);
            } catch (uploadErr) { console.error("Upload Failed for page og_image:", uploadErr); }
        }

        const result = await pool.query(
            "INSERT INTO pages (title, content, slug, status, seo_title, seo_description, seo_keywords, og_image) VALUES($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
            [title, content, slug, status || 'published', seo_title, seo_description, seo_keywords, og_image]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

app.put('/api/pages/:id', authenticateToken, hasPermission('pages'), async (req, res) => {
    try {
        const { id } = req.params;
        let { title, content, slug, status, seo_title, seo_description, seo_keywords, og_image } = req.body;

        // Upload page og_image if base64
        if (og_image && og_image.startsWith('data:')) {
            try {
                og_image = await handleMediaUpload(og_image, `page_og_${id}_${Date.now()}`);
            } catch (uploadErr) { console.error("Upload Failed for page update og_image:", uploadErr); }
        }

        console.log(`Updating page ${id}: ${title}`);
        const result = await pool.query(
            "UPDATE pages SET title = $1, content = $2, slug = $3, status = $4, seo_title = $5, seo_description = $6, seo_keywords = $7, og_image = $8, updated_at = CURRENT_TIMESTAMP WHERE id = $9 RETURNING *",
            [title, content, slug, status || 'published', seo_title, seo_description, seo_keywords, og_image, id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Update Page Error:", err.message);
        res.status(500).send("Server Error");
    }
});

app.delete('/api/pages/:id', authenticateToken, hasPermission('pages'), async (req, res) => {
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
        const rows = result.rows.map(row => ({
            ...row,
            featured_image: formatMediaUrl(row.featured_image, req),
            og_image: formatMediaUrl(row.og_image, req)
        }));
        res.json(rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

app.post('/api/posts', authenticateToken, hasPermission('posts'), async (req, res) => {
    try {
        let { title, content, slug, status, featured_image, categories, tags, seo_title, seo_description, seo_keywords, og_image } = req.body;

        // Upload post images if base64
        try {
            if (featured_image && featured_image.startsWith('data:')) {
                featured_image = await handleMediaUpload(featured_image, `post_featured_${slug || Date.now()}`);
            }
            if (og_image && og_image.startsWith('data:')) {
                og_image = await handleMediaUpload(og_image, `post_og_${slug || Date.now()}`);
            }
        } catch (uploadErr) { console.error("Upload Failed for post images:", uploadErr); }

        const result = await pool.query(
            "INSERT INTO posts (title, content, slug, status, featured_image, categories, tags, seo_title, seo_description, seo_keywords, og_image) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *",
            [title, content, slug, status || 'published', featured_image, JSON.stringify(categories || []), JSON.stringify(tags || []), seo_title, seo_description, seo_keywords, og_image]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

app.put('/api/posts/:id', authenticateToken, hasPermission('posts'), async (req, res) => {
    try {
        const { id } = req.params;
        let { title, content, slug, status, featured_image, categories, tags, seo_title, seo_description, seo_keywords, og_image } = req.body;

        // Upload post images if base64
        try {
            if (featured_image && featured_image.startsWith('data:')) {
                featured_image = await handleMediaUpload(featured_image, `post_featured_${id}_${Date.now()}`);
            }
            if (og_image && og_image.startsWith('data:')) {
                og_image = await handleMediaUpload(og_image, `post_og_${id}_${Date.now()}`);
            }
        } catch (uploadErr) { console.error("Upload Failed for post update images:", uploadErr); }

        console.log(`Updating post ${id}: ${title}`);
        const result = await pool.query(
            "UPDATE posts SET title = $1, content = $2, slug = $3, status = $4, featured_image = $5, categories = $6, tags = $7, seo_title = $8, seo_description = $9, seo_keywords = $10, og_image = $11, updated_at = CURRENT_TIMESTAMP WHERE id = $12 RETURNING *",
            [title, content, slug, status || 'published', featured_image, JSON.stringify(categories || []), JSON.stringify(tags || []), seo_title, seo_description, seo_keywords, og_image, id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Update Post Error:", err.message);
        res.status(500).send("Server Error");
    }
});

app.delete('/api/posts/:id', authenticateToken, hasPermission('posts'), async (req, res) => {
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

app.post('/api/categories', authenticateToken, hasPermission('posts'), async (req, res) => {
    try {
        const { name } = req.body;
        let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        if (!slug) slug = 'cat-' + Date.now();

        const result = await pool.query(
            "INSERT INTO categories (name, slug) VALUES($1, $2) ON CONFLICT (name) DO NOTHING RETURNING *",
            [name, slug]
        );

        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
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

app.post('/api/menus', authenticateToken, hasPermission('menus'), async (req, res) => {
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

app.put('/api/menus/:id', authenticateToken, hasPermission('menus'), async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { name, location, items } = req.body;
        await client.query('BEGIN');
        if (location) {
            await client.query("UPDATE menus SET location = NULL WHERE location = $1 AND id != $2", [location, id]);
        }
        await client.query(
            "UPDATE menus SET name = $1, location = $2 WHERE id = $3",
            [name, location || null, id]
        );
        await client.query("DELETE FROM menu_items WHERE menu_id = $1", [id]);
        if (items && items.length > 0) {
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const objectId = (item.object_id === '' || item.object_id === undefined) ? null : item.object_id;
                await client.query(
                    "INSERT INTO menu_items (menu_id, title, url, item_order, type, object_id, indent, translations) VALUES($1, $2, $3, $4, $5, $6, $7, $8)",
                    [id, item.title, item.url, i, item.type, objectId, item.indent || 0, JSON.stringify(item.translations || {})]
                );
            }
        }
        await client.query('COMMIT');
        res.json({ message: "Menu updated successfully" });
    } catch (err) {
        if (client) await client.query('ROLLBACK');
        console.error("MENU UPDATE ERROR:", err.message);
        res.status(500).send("Server Error: " + err.message);
    } finally {
        if (client) client.release();
    }
});

app.delete('/api/menus/:id', authenticateToken, hasPermission('menus'), async (req, res) => {
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
// Translation API
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
        const rows = result.rows.map(row => ({ ...row, image_url: formatMediaUrl(row.image_url, req) }));
        res.json(rows);
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

app.post('/api/products', authenticateToken, hasPermission('products'), async (req, res) => {
    try {
        let { name, description, price, image_url, category, stock, slug, is_virtual, is_downloadable, download_url, stock_type, is_voucher, is_lifetime, is_simple } = req.body;

        // Upload product image if base64
        if (image_url && image_url.startsWith('data:')) {
            try {
                image_url = await handleMediaUpload(image_url, `product_${slug || Date.now()}`);
            } catch (uploadErr) { console.error("Upload Failed for product creation image:", uploadErr); }
        }

        const result = await pool.query(
            "INSERT INTO products (name, description, price, image_url, category, stock, slug, is_virtual, is_downloadable, download_url, stock_type, is_voucher, is_lifetime, is_simple) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *",
            [name, description, price, image_url, category, stock, slug, is_virtual || false, is_downloadable || false, download_url || null, stock_type || 'limited', is_voucher || false, is_lifetime || false, is_simple || false]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/products/:id', authenticateToken, hasPermission('products'), async (req, res) => {
    try {
        const { id } = req.params;
        let { name, description, price, image_url, category, stock, slug, is_virtual, is_downloadable, download_url, stock_type, is_voucher, is_lifetime, is_simple } = req.body;

        // Upload product image if base64
        if (image_url && image_url.startsWith('data:')) {
            try {
                image_url = await handleMediaUpload(image_url, `product_${id}_${Date.now()}`);
            } catch (uploadErr) { console.error("Upload Failed for product update image:", uploadErr); }
        }

        const result = await pool.query(
            "UPDATE products SET name = $1, description = $2, price = $3, image_url = $4, category = $5, stock = $6, slug = $7, is_virtual = $8, is_downloadable = $9, download_url = $10, stock_type = $11, is_voucher = $12, is_lifetime = $13, is_simple = $14 WHERE id = $15 RETURNING *",
            [name, description, price, image_url, category, stock, slug, is_virtual, is_downloadable, download_url, stock_type, is_voucher, is_lifetime, is_simple, id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/products/:id', authenticateToken, hasPermission('products'), async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("DELETE FROM products WHERE id = $1", [id]);
        res.json({ message: "Product deleted" });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Server error" });
    }
});


// ============================================================
// --- SUBSCRIPTION ROUTES ---
// ============================================================

// GET /api/subscriptions/my - Get current user's subscription status
app.get('/api/subscriptions/my', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await pool.query(
            `SELECT s.*, p.name as product_name, p.price, p.is_lifetime, t.name as tribute_name
             FROM subscriptions s
             LEFT JOIN products p ON s.product_id = p.id
             LEFT JOIN tributes t ON s.memorial_id = t.id
             WHERE s.user_id = $1
             ORDER BY s.created_at DESC`,
            [userId]
        );

        const subscriptions = [];
        const now = new Date();

        for (let sub of result.rows) {
            subscriptions.push({
                ...sub,
                memorial_name: sub.tribute_name || sub.memorial_name
            });
        }

        const tributeRes = await pool.query('SELECT id, name, created_at FROM tributes WHERE user_id = $1', [userId]);
        const tributes = tributeRes.rows;

        const coveredMemorialIds = new Set(result.rows.map(s => s.memorial_id).filter(id => id !== null));
        const coveredMemorialNames = new Set(result.rows.filter(s => !s.memorial_id).map(s => s.memorial_name).filter(name => name !== null));

        for (const t of tributes) {
            if (!coveredMemorialIds.has(t.id) && !coveredMemorialNames.has(t.name)) {
                subscriptions.push({
                    id: `m-${t.id}`,
                    user_id: userId,
                    status: 'active',
                    product_id: null,
                    product_name: 'Free Memorial',
                    is_lifetime: true,
                    memorial_name: t.name,
                    memorial_id: t.id,
                    created_at: t.created_at,
                    trial_start: null,
                    trial_end: null,
                    _virtual: true
                });
            }
        }

        res.json({ subscriptions: subscriptions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) });
    } catch (err) {
        console.error('Get My Subscriptions Error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/subscriptions/renew - Renew subscription with Stripe payment
app.post('/api/subscriptions/renew', authenticateToken, async (req, res) => {
    try {
        const { payment_intent_id, product_id, memorial_name, memorial_id, language, subscription_id, coupon_applied, coupon_code } = req.body;
        const userId = req.user.id;
        const userLang = language || 'en';

        // Verify payment intent with Stripe (skip if free)
        if (!payment_intent_id.startsWith('free_checkout_')) {
            const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);
            if (paymentIntent.status !== 'succeeded') {
                return res.status(400).json({ error: 'Payment not completed' });
            }
        }

        // Get product
        const productRes = await pool.query('SELECT * FROM products WHERE id = $1', [product_id]);
        if (productRes.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
        const product = productRes.rows[0];

        const paidStart = new Date();
        let paidEnd = null;
        let isLifetime = product.is_lifetime || false;

        if (!isLifetime) {
            paidEnd = new Date();
            paidEnd.setFullYear(paidEnd.getFullYear() + 1);
        }

        // Ensure memorial columns exist (safe migration)
        try {
            await pool.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS memorial_name TEXT`);
            await pool.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS memorial_id INTEGER`);
        } catch (e) { /* already exists */ }

        // Update or create subscription - specifically for this memorial if provided
        let existing = { rows: [] };
        if (subscription_id) {
            existing = await pool.query('SELECT id FROM subscriptions WHERE user_id = $1 AND id = $2', [userId, subscription_id]);
        } else if (memorial_id) {
            existing = await pool.query('SELECT id FROM subscriptions WHERE user_id = $1 AND memorial_id = $2', [userId, memorial_id]);
        } else {
            existing = await pool.query('SELECT id FROM subscriptions WHERE user_id = $1 AND (memorial_id IS NULL OR memorial_id = 0) LIMIT 1', [userId]);
        }

        let sub;
        if (existing.rows.length > 0) {
            const updateQuery = coupon_applied
                ? `UPDATE subscriptions SET status = $1, paid_start = $2, paid_end = $3,
                   is_lifetime = $4, stripe_payment_intent_id = $5, updated_at = CURRENT_TIMESTAMP,
                   memorial_name = $6, memorial_id = $7, language = $8, product_id = $9,
                   trial_start = NULL, trial_end = NULL
                   WHERE id = $10 RETURNING *`
                : `UPDATE subscriptions SET status = $1, paid_start = $2, paid_end = $3,
                   is_lifetime = $4, stripe_payment_intent_id = $5, updated_at = CURRENT_TIMESTAMP,
                   memorial_name = $6, memorial_id = $7, language = $8, product_id = $9
                   WHERE id = $10 RETURNING *`;
            const result = await pool.query(updateQuery,
                ['active', paidStart, paidEnd, isLifetime, payment_intent_id,
                    memorial_name || null, memorial_id || null, userLang, product_id, existing.rows[0].id]
            );
            sub = result.rows[0];
        } else {
            const insertQuery = coupon_applied
                ? `INSERT INTO subscriptions (user_id, product_id, status, paid_start, paid_end, is_lifetime, stripe_payment_intent_id, memorial_name, memorial_id, language, trial_start, trial_end)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NULL, NULL) RETURNING *`
                : `INSERT INTO subscriptions (user_id, product_id, status, paid_start, paid_end, is_lifetime, stripe_payment_intent_id, memorial_name, memorial_id, language)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`;
            const result = await pool.query(insertQuery,
                [userId, product_id, 'active', paidStart, paidEnd, isLifetime, payment_intent_id,
                    memorial_name || null, memorial_id || null, userLang]
            );
            sub = result.rows[0];
        }

        // If coupon was applied, also log it against the subscription for audit trail
        if (coupon_applied && coupon_code) {
            console.log(`🎟️  Subscription #${sub.id} activated via coupon "${coupon_code}" — trial period removed`);
        }

        // Send confirmation email
        try {
            const userRes = await pool.query('SELECT email, username FROM users WHERE id = $1', [userId]);
            const user = userRes.rows[0];

            let memorialLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin/memorials`;
            if (memorial_id) {
                const tribRes = await pool.query('SELECT slug FROM tributes WHERE id = $1', [memorial_id]);
                if (tribRes.rows.length > 0 && tribRes.rows[0].slug) {
                    memorialLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/memorial/${tribRes.rows[0].slug}`;
                }
            }

            const memorialInfo = `
                <p>Your memorial page will remain <strong>active and permanently accessible</strong>.</p>
                <p>Here is the link to the page:<br>
                <a href="${memorialLink}" style="color: #c59d5f; font-weight: bold; text-decoration: underline;">To the memorial page.</a></p>
            `;

            await sendTemplatedEmail(user.email, 'payment_confirmation', {
                user_name: user.username,
                order_id_info: "",
                memorial_info: memorialInfo
            }, [], userLang);
        } catch (emailErr) {
            console.error('Renewal confirmation email failed:', emailErr.message);
        }

        res.json({ success: true, subscription: sub });
    } catch (err) {
        console.error('Renew Subscription Error:', err.message);
        res.status(500).json({ error: 'Failed to renew subscription' });
    }
});

// POST /api/subscriptions/create-renewal-intent - Create Stripe payment intent for renewal
app.post('/api/subscriptions/create-renewal-intent', authenticateToken, async (req, res) => {
    try {
        const { product_id } = req.body;
        const productRes = await pool.query('SELECT * FROM products WHERE id = $1', [product_id]);
        if (productRes.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
        const product = productRes.rows[0];

        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(parseFloat(product.price) * 100),
            currency: 'eur',
            automatic_payment_methods: { enabled: true },
            metadata: {
                user_id: req.user.id,
                product_id: product_id,
                type: 'subscription_renewal'
            }
        });

        res.json({ clientSecret: paymentIntent.client_secret, amount: product.price });
    } catch (err) {
        console.error('Create Renewal Intent Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// --- EMAIL LOGS ROUTES ---
app.get('/api/email-logs', authenticateToken, isAdmin, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, template_slug, template_name, recipient_email, recipient_name, subject, language, status, error_message, sent_at 
            FROM email_logs 
            ORDER BY sent_at DESC 
            LIMIT 500
        `);
        res.json(result.rows);
    } catch (err) {
        console.error("Email logs error:", err.message);
        // Fallback if table doesn't exist yet
        res.json([]);
    }
});

app.get('/api/email-logs/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const result = await pool.query(`SELECT html_body FROM email_logs WHERE id = $1`, [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: "Log not found" });
        res.json({ html_body: result.rows[0].html_body });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/email-logs/:id/retry', authenticateToken, isAdmin, async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM email_logs WHERE id = $1`, [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: "Log not found" });

        const log = result.rows[0];

        // Re-send exactly what is in the log
        const mailOptions = {
            from: `"Tributoo" <${process.env.SMTP_USER}>`,
            to: log.recipient_email,
            subject: log.subject,
            html: log.html_body
        };

        try {
            await transporter.sendMail(mailOptions);
            // On success, update existing log to 'sent'
            await pool.query(
                `UPDATE email_logs SET status = 'sent', error_message = NULL, sent_at = CURRENT_TIMESTAMP WHERE id = $1`,
                [log.id]
            );
            res.json({ success: true, message: "Email sent successfully" });
        } catch (sendErr) {
            // Update error timestamp/message
            await pool.query(
                `UPDATE email_logs SET error_message = $1, sent_at = CURRENT_TIMESTAMP WHERE id = $2`,
                [sendErr.message, log.id]
            );
            res.status(500).json({ error: sendErr.message });
        }

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/email-logs/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM email_logs WHERE id = $1 RETURNING id', [req.params.id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Log not found" });
        }
        res.json({ success: true, message: "Log deleted successfully" });
    } catch (err) {
        console.error("Delete Email Log Error:", err);
        res.status(500).json({ error: "Failed to delete email log" });
    }
});

app.get('/api/email-queue', authenticateToken, isAdmin, async (req, res) => {
    try {
        const tplRes = await pool.query(`SELECT * FROM email_templates WHERE (language = 'en' OR language IS NULL) AND timing_type != 'event_only'`);
        const templates = tplRes.rows;

        const subsRes = await pool.query(`
            SELECT s.*, u.email, u.username
            FROM subscriptions s
            JOIN users u ON s.user_id = u.id
            WHERE s.status IN ('trial', 'active')
               OR (s.status IN ('expired', 'grace') AND (
                   (s.trial_start IS NOT NULL AND s.trial_start >= NOW() - INTERVAL '11 days' AND s.paid_end IS NULL)
                   OR (s.paid_end IS NOT NULL AND s.paid_end >= NOW() - INTERVAL '4 days')
               ))
        `);

        // Get logs for fast lookup (to omit already sent emails)
        let logMap = new Set();
        try {
            const logsRes = await pool.query(`SELECT subscription_id, template_slug FROM subscription_email_log`);
            logsRes.rows.forEach(r => logMap.add(r.subscription_id + '_' + r.template_slug));
        } catch (e) { /* table might not exist yet */ }

        const queue = [];
        let idCounter = 1;
        const now = new Date();

        for (const sub of subsRes.rows) {
            for (const tpl of templates) {
                if (logMap.has(sub.id + '_' + tpl.slug)) continue;

                const isTrial = sub.status === 'trial';
                const isExpired = sub.status === 'expired' || sub.status === 'grace';
                const isGracePeriodSlug = tpl.slug === 'grace_period_day9' || tpl.slug === 'grace_period_day10';

                // Forecast logic: Active paid subscriptions don't get trial or grace emails
                const isTrialEmail = tpl.slug.startsWith('trial_') || tpl.slug === 'subscription_expiry_reminder';
                if (sub.status === 'active' && (isTrialEmail || isGracePeriodSlug)) continue;

                // Expired subscriptions only get grace period emails
                if (isExpired && !isGracePeriodSlug) continue;

                // Trial subscriptions shouldn't get standard subscription_expired (they get trial versions)
                if (isTrial && tpl.slug === 'subscription_expired') continue;

                const refField = tpl.timing_reference || 'trial_start';
                const refDate = sub[refField];
                if (!refDate && tpl.timing_type !== 'scheduled') continue;

                let sendAt = new Date(refDate);
                const timingType = tpl.timing_type || 'immediate';

                if (timingType === 'immediate') {
                    sendAt = new Date(refDate);
                } else if (timingType === 'delayed') {
                    const value = parseInt(tpl.timing_delay_value) || 0;
                    const unit = tpl.timing_delay_unit || 'days';
                    sendAt = new Date(refDate);
                    if (unit === 'minutes') sendAt.setMinutes(sendAt.getMinutes() + value);
                    else if (unit === 'hours') sendAt.setHours(sendAt.getHours() + value);
                    else if (unit === 'weeks') sendAt.setDate(sendAt.getDate() + value * 7);
                    else sendAt.setDate(sendAt.getDate() + value);
                } else if (timingType === 'scheduled') {
                    if (!tpl.timing_scheduled_at) continue;
                    sendAt = new Date(tpl.timing_scheduled_at);
                }

                // We only show items that are scheduled for the future (or overdue but haven't triggered yet)
                queue.push({
                    id: 'q_' + (idCounter++),
                    status: sendAt <= now ? 'overdue' : 'queued',
                    template_slug: tpl.slug,
                    template_name: tpl.name || tpl.slug,
                    recipient_email: sub.email,
                    recipient_name: sub.username || '',
                    subject: tpl.subject,
                    language: sub.language || tpl.language || 'en',
                    sent_at: sendAt, // reuse sent_at property for ease of UI mapping
                    error_message: null,
                    subscription_id: sub.id,
                    created_at: sub.created_at
                });
            }
        }

        queue.sort((a, b) => new Date(a.sent_at) - new Date(b.sent_at));

        // Return up to 500 queued items
        res.json(queue.slice(0, 500));
    } catch (err) {
        console.error("Queue logs error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// --- EMAIL TEMPLATE ROUTES ---
app.get('/api/email-templates', authenticateToken, isAdmin, async (req, res) => {
    try {
        // Return one row per slug (prefer 'en', fallback to first available)
        const result = await pool.query(`
            SELECT DISTINCT ON (slug) *
            FROM email_templates
            ORDER BY slug, CASE WHEN language = 'en' THEN 0 ELSE 1 END, id ASC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Server error" });
    }
});

app.get('/api/email-templates/:slug', authenticateToken, isAdmin, async (req, res) => {
    try {
        const lang = (req.query.lang || 'en').toLowerCase();
        // Try exact language first, then fall back to English
        let result = await pool.query(
            "SELECT * FROM email_templates WHERE slug = $1 AND language = $2",
            [req.params.slug, lang]
        );
        if (result.rows.length === 0) {
            result = await pool.query("SELECT * FROM email_templates WHERE slug = $1 AND language = 'en'", [req.params.slug]);
        }
        if (result.rows.length === 0) return res.status(404).json({ error: "Template not found" });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Server error" });
    }
});

app.put('/api/email-templates/:slug', authenticateToken, isAdmin, async (req, res) => {
    try {
        const lang = (req.query.lang || req.body.language || 'en').toLowerCase();
        const { subject, body, name, header_enabled, footer_enabled,
            timing_type, timing_delay_value, timing_delay_unit, timing_scheduled_at, timing_reference } = req.body;

        // Ensure timing columns exist
        try {
            await pool.query(`ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS timing_type VARCHAR(30) DEFAULT 'immediate'`);
            await pool.query(`ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS timing_delay_value INTEGER DEFAULT 0`);
            await pool.query(`ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS timing_delay_unit VARCHAR(10) DEFAULT 'days'`);
            await pool.query(`ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS timing_scheduled_at TIMESTAMP`);
            await pool.query(`ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS timing_reference VARCHAR(30) DEFAULT 'trial_start'`);
        } catch (e) { /* already exists */ }

        // Check if this language row exists
        const existing = await pool.query(
            `SELECT id FROM email_templates WHERE slug = $1 AND language = $2`,
            [req.params.slug, lang]
        );

        let result;
        if (existing.rows.length > 0) {
            // Update the specific language version (subject, body, name only)
            result = await pool.query(
                `UPDATE email_templates SET subject = $1, body = $2, name = $3,
                 header_enabled = $4, footer_enabled = $5, updated_at = CURRENT_TIMESTAMP
                 WHERE slug = $6 AND language = $7 RETURNING *`,
                [subject, body, name, header_enabled, footer_enabled, req.params.slug, lang]
            );
        } else {
            // Insert new language row
            result = await pool.query(
                `INSERT INTO email_templates (slug, name, subject, body, language, header_enabled, footer_enabled)
                 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
                [req.params.slug, name, subject, body, lang, header_enabled, footer_enabled]
            );
        }

        // Always update timing settings on ALL language rows of this slug
        await pool.query(
            `UPDATE email_templates SET
             timing_type = $1, timing_delay_value = $2, timing_delay_unit = $3,
             timing_scheduled_at = $4, timing_reference = $5,
             header_enabled = $6, footer_enabled = $7, updated_at = CURRENT_TIMESTAMP
             WHERE slug = $8`,
            [timing_type || 'immediate', timing_delay_value ?? 0, timing_delay_unit || 'days',
            timing_scheduled_at || null, timing_reference || 'trial_start',
                header_enabled, footer_enabled, req.params.slug]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: "Template not found" });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Server error" });
    }
});

// POST /api/email-templates/:slug/test - Admin: Send a test email
app.post('/api/email-templates/:slug/test', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { slug } = req.params;
        const { testEmail } = req.body;
        const targetEmail = testEmail || req.user.email;

        // Dummy data for shortcodes
        const dummyData = {
            user_name: 'Test Customer',
            order_id_info: 'ORD-12345-TEST',
            memorial_info: 'John Doe Memorial',
            memorial_link: `${process.env.FRONTEND_URL}/memorial/test-memorial`,
            product_name: 'Premium Memorial Package',
            product_price: '€49.99',
            plan_type: 'Annual',
            renew_link: `${process.env.FRONTEND_URL}/pricing`,
            payment_link: `${process.env.FRONTEND_URL}/checkout`,
            voucher_codes_list: 'VOUCHER-TEST-001, VOUCHER-TEST-002',
            header_title: 'Tributoo Test Notification'
        };

        await sendTemplatedEmail(targetEmail, slug, dummyData);
        res.json({ message: `Test email sent to ${targetEmail}` });
    } catch (err) {
        console.error('Test Email Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/subscriptions - Admin: Get all subscriptions
app.get('/api/subscriptions', authenticateToken, hasPermission('subscriptions'), async (req, res) => {
    try {
        const subRes = await pool.query(`
            SELECT s.*, u.username, u.email, p.name as product_name, p.price
            FROM subscriptions s
            LEFT JOIN users u ON s.user_id = u.id
            LEFT JOIN products p ON s.product_id = p.id
            ORDER BY s.created_at DESC
        `);
        const subscriptions = subRes.rows;
        const now = new Date();

        const tributeRes = await pool.query(`
            SELECT t.id, t.name, t.user_id, t.created_at, u.username, u.email
            FROM tributes t
            LEFT JOIN users u ON t.user_id = u.id
            ORDER BY t.created_at DESC
        `);
        const tributes = tributeRes.rows;

        // Ensure every real sub has its memorial metadata attached if present
        const finalMerged = subscriptions.map(sub => {
            const mList = tributes.filter(t => t.id === sub.memorial_id);
            return {
                ...sub,
                memorials_count: sub.memorial_id ? 1 : 0,
                memorials_list: mList.map(t => ({ id: t.id, name: t.name, paid_start: sub.paid_start, paid_end: sub.paid_end }))
            };
        });

        const coveredMemorialIds = new Set(subscriptions.map(s => s.memorial_id).filter(id => id !== null));

        for (const t of tributes) {
            if (!coveredMemorialIds.has(t.id)) {
                finalMerged.push({
                    id: `m-${t.id}`,
                    user_id: t.user_id,
                    username: t.username,
                    email: t.email,
                    status: 'active',
                    product_id: null,
                    product_name: 'Free Memorial',
                    is_lifetime: true,
                    memorial_name: t.name,
                    memorial_id: t.id,
                    created_at: t.created_at,
                    _virtual: true,
                    memorials_count: 1,
                    memorials_list: [{ id: t.id, name: t.name }]
                });
            }
        }

        res.json(finalMerged.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    } catch (err) {
        console.error('Get All Subscriptions Error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/subscriptions/user/:userId - Admin: get a specific user's subscription + profile
app.get('/api/subscriptions/user/:userId', authenticateToken, hasPermission('subscriptions'), async (req, res) => {
    try {
        let { userId } = req.params;
        if (!userId || userId === 'null' || userId === 'undefined') {
            return res.json({ subscription: null, user: null, memorials: [] });
        }
        const result = await pool.query(`
            SELECT s.*, u.username, u.email, p.name as product_name
            FROM subscriptions s
            LEFT JOIN users u ON s.user_id = u.id
            LEFT JOIN products p ON s.product_id = p.id
            WHERE s.user_id = $1
            ORDER BY s.created_at DESC LIMIT 1
        `, [userId]);

        const userRes = await pool.query('SELECT id, username, email FROM users WHERE id = $1', [userId]);
        const memorialsRes = await pool.query('SELECT id, name, slug, photo_url, created_at FROM tributes WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
        const memorials = memorialsRes.rows;
        let subscription = result.rows[0] || null;

        if (!subscription && memorials.length > 0) {
            const latest = memorials[0];
            subscription = {
                id: null,
                status: 'active',
                is_lifetime: true,
                product_name: 'Tributoo Subscription (Memorial)',
                memorial_name: latest.name,
                memorial_id: latest.id,
                created_at: latest.created_at,
                _linked_via_memorial: true
            };
        }
        res.json({ subscription, user: userRes.rows[0], memorials });
    } catch (err) {
        console.error('Get User Subscription Error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/subscriptions/:id - Admin: update a subscription
app.put('/api/subscriptions/:id', authenticateToken, hasPermission('subscriptions'), async (req, res) => {
    try {
        const { id } = req.params;
        const { status, trial_end, paid_end, is_lifetime, product_id, memorial_id, memorial_name, user_id } = req.body;

        // If it's a virtual ID, we need to INSERT a new subscription record instead of updating
        if (String(id).startsWith('m-')) {
            const result = await pool.query(
                `INSERT INTO subscriptions (user_id, status, trial_end, paid_end, is_lifetime, product_id, memorial_id, memorial_name)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
                [user_id, status, trial_end || null, paid_end || null, is_lifetime || false,
                    product_id || null, memorial_id || null, memorial_name || null]
            );
            return res.json({ message: 'Virtual Subscription converted and updated', subscription: result.rows[0] });
        }

        const result = await pool.query(
            `UPDATE subscriptions 
             SET status = $1, trial_end = $2, paid_end = $3, is_lifetime = $4, 
                 product_id = $5, memorial_id = $6, memorial_name = $7, 
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $8 RETURNING *`,
            [status, trial_end || null, paid_end || null, is_lifetime || false,
                product_id || null, memorial_id || null, memorial_name || null, id]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: 'Subscription not found' });
        res.json({ message: 'Subscription updated', subscription: result.rows[0] });
    } catch (err) {
        console.error('Update Subscription Error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/subscriptions/:id/send-expiry-notice', authenticateToken, hasPermission('subscriptions'), async (req, res) => {
    try {
        const { id } = req.params;
        const subRes = await pool.query(
            `SELECT s.*, u.email, u.username, p.name as product_name, p.price as product_price, s.language
             FROM subscriptions s
             JOIN users u ON s.user_id = u.id
             LEFT JOIN products p ON s.product_id = p.id
             WHERE s.id = $1`, [id]
        );

        if (subRes.rows.length === 0) return res.status(404).json({ error: 'Subscription not found' });
        const sub = subRes.rows[0];

        const isTrial = sub.status === 'trial' || (sub.status === 'expired' && !sub.paid_start);
        const userLang = sub.language || 'en';
        const renewLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin/subscription/${sub.id}`;
        const paymentLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin/subscription/${sub.id}`;

        let memorialName = sub.memorial_name || 'your memorial';
        let memorialLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin/memorials`;

        if (sub.memorial_id) {
            const tribRes = await pool.query('SELECT name, slug FROM tributes WHERE id = $1', [sub.memorial_id]);
            if (tribRes.rows.length > 0) {
                memorialName = tribRes.rows[0].name;
                memorialLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/memorial/${tribRes.rows[0].slug || sub.memorial_id}`;
            }
        }

        const dueDate = new Date(sub.trial_end || sub.paid_end || new Date()).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        });

        // Get dynamic price from product OR fetch standard plan price if missing
        let displayPrice = sub.product_price;
        if (!displayPrice) {
            const priceRes = await pool.query("SELECT price FROM products WHERE name ILIKE '%Annual%' OR category ILIKE '%subscription%' ORDER BY price ASC LIMIT 1");
            displayPrice = priceRes.rows[0]?.price || '62.70';
        }

        if (isTrial) {
            await sendTemplatedEmail(sub.email, 'trial_expired_reminder', {
                user_name: sub.username,
                memorial_name: memorialName,
                memorial_link: memorialLink,
                due_date: dueDate,
                payment_link: paymentLink,
                product_price: displayPrice,
                header_title: 'Payment Reminder'
            }, [], userLang);
        } else {
            await sendTemplatedEmail(sub.email, 'subscription_expired', {
                user_name: sub.username,
                product_name: sub.product_name || 'your memorial',
                renew_link: renewLink
            }, [], userLang);
        }

        res.json({ message: 'Expiry notice sent successfully' });
    } catch (err) {
        console.error('Send Expiry Notice Error:', err.message);
        res.status(500).json({ error: 'Failed to send email' });
    }
});

app.delete('/api/subscriptions/:id', authenticateToken, hasPermission('subscriptions'), async (req, res) => {
    try {
        const { id } = req.params;

        // Handle virtual IDs (derived from memorials)
        if (String(id).startsWith('m-')) {
            const memorialId = id.split('-')[1];
            const result = await pool.query('DELETE FROM tributes WHERE id = $1 RETURNING *', [memorialId]);
            if (result.rows.length === 0) return res.status(404).json({ error: 'Memorial not found' });
            return res.json({ message: 'Memorial (Virtual Subscription) deleted' });
        }

        const result = await pool.query('DELETE FROM subscriptions WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Subscription not found' });
        res.json({ message: 'Subscription deleted' });
    } catch (err) {
        console.error('Delete Subscription Error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// ── Timing Helper ─────────────────────────────────────────────────────────────
// Returns true if an email template should be sent NOW based on its timing config
// referenceDate = the event date (e.g. trial_start, trial_end)
const shouldSendEmail = (template, referenceDate = new Date()) => {
    const type = template?.timing_type || 'immediate';
    if (type === 'immediate') return true;

    if (type === 'delayed') {
        const value = parseInt(template.timing_delay_value) || 0;
        const unit = template.timing_delay_unit || 'days';
        const ref = new Date(referenceDate);
        let sendAt = new Date(ref);
        if (unit === 'minutes') sendAt.setMinutes(ref.getMinutes() + value);
        else if (unit === 'hours') sendAt.setHours(ref.getHours() + value);
        else if (unit === 'weeks') sendAt.setDate(ref.getDate() + value * 7);
        else sendAt.setDate(ref.getDate() + value); // days
        return new Date() >= sendAt;
    }

    if (type === 'scheduled') {
        if (!template.timing_scheduled_at) return false;
        return new Date() >= new Date(template.timing_scheduled_at);
    }
    return true;
};

// ── Send one-time Scheduled emails ────────────────────────────────────────────
const sendScheduledTemplates = async () => {
    try {
        // Find templates set to 'scheduled' whose time has now passed (send once — mark as sent)
        const scheduledRes = await pool.query(
            `SELECT * FROM email_templates WHERE timing_type = 'scheduled' AND timing_scheduled_at IS NOT NULL AND timing_scheduled_at <= NOW() AND (timing_sent IS NULL OR timing_sent = FALSE)`
        );
        // If timing_sent column doesn't exist yet, silently skip
        if (scheduledRes.rows.length === 0) return;

        // Get all active/trial users to broadcast to
        const users = await pool.query(`SELECT id, email, username FROM users`);
        for (const tpl of scheduledRes.rows) {
            for (const user of users.rows) {
                try {
                    await sendTemplatedEmail(user.email, tpl.slug, {
                        user_name: user.username,
                        header_title: tpl.name
                    }, [], 'en');
                } catch (e) { /* silent */ }
            }
            // Mark as sent so it doesn't re-fire
            await pool.query(`UPDATE email_templates SET timing_sent = TRUE WHERE id = $1`, [tpl.id]);
            console.log(`✅ Scheduled broadcast sent: ${tpl.slug}`);
        }
    } catch (e) {
        // Column might not exist yet — safe to skip
    }
};

// checkSubscriptions removed as trials are no longer used.

// Run scheduled job for broadcast templates ONLY
setInterval(() => {
    sendScheduledTemplates();
}, 60 * 1000);

// Also run on server start
sendScheduledTemplates();

// Global error handler
app.use((err, req, res, next) => {
    if (err.type === 'entity.too.large') {
        console.error("Critical: Payload too large for server limits.");
        return res.status(413).send("The file you are trying to upload is too large for the server. (Limit: 500MB)");
    }
    console.error("SERVER ERROR:", err);
    res.status(500).send("Internal Server Error: " + err.message);
});

// Root route (for Render health check / browser test)
app.get("/", (req, res) => {
    res.send("🚀 Tributoo Backend is Running Successfully");
});


app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});
