import pg from 'pg';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import crypto from 'crypto';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

const applyShortcodes = (text, replacements) => {
    let result = text || '';
    for (const [key, val] of Object.entries(replacements)) {
        result = result.split(key).join(val);
    }
    return result;
};

const testTemplatedVoucher = async () => {
    try {
        console.log("🚀 Starting Templated Voucher Email Test...\n");

        // 1. Load the default template from DB
        const tplRes = await pool.query("SELECT * FROM voucher_templates WHERE is_default = TRUE LIMIT 1");
        if (tplRes.rows.length === 0) {
            console.error("❌ No default template found! Please create one in Admin → Voucher Templates.");
            return;
        }
        const template = tplRes.rows[0];
        console.log(`✅ Loaded template: "${template.name}"`);

        // 2. Mock order data
        const code = crypto.randomBytes(4).toString('hex').toUpperCase();
        const recipientEmail = process.env.SMTP_USER; // Send to yourself for testing
        const customerName = "Test Customer";
        const productName = "Tributoo Memorial Page";
        const productPrice = "50.00";

        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + 12);
        const expiryStr = expiryDate.toLocaleDateString('de-CH');

        const replacements = {
            '[voucher_code]': code,
            '[coupon_code]': code,
            '[recipient_message]': 'Dear Customer, enjoy your Tributoo experience!',
            '[expiry_date]': expiryStr,
            '[product_name]': productName,
            '[voucher_value]': `€${productPrice}`,
            '[customer_email]': recipientEmail,
            '[customer_name]': customerName,
            '[order_date]': new Date().toLocaleDateString('de-CH'),
        };

        console.log(`🎫 Generated Code: ${code}`);

        // 3. Generate PDF using template
        const PAGE_W = 595.28;
        const PAGE_H = 841.89;
        const doc = new PDFDocument({ size: 'A4', margin: 0 });
        let buffers = [];
        doc.on('data', buffers.push.bind(buffers));

        const elements = Array.isArray(template.elements)
            ? template.elements
            : JSON.parse(template.elements || '[]');

        // Background color
        doc.rect(0, 0, PAGE_W, PAGE_H).fill(template.background_color || '#1a1a1a');

        // Background image
        if (template.background_image && template.background_image.startsWith('data:image')) {
            try {
                const base64Data = template.background_image.split(',')[1];
                const imgBuffer = Buffer.from(base64Data, 'base64');
                doc.image(imgBuffer, 0, 0, { width: PAGE_W, height: PAGE_H });
                console.log("✅ Background image applied");
            } catch (e) { console.error("⚠️ BG image error:", e.message); }
        }

        // Logo
        if (template.logo_url && template.logo_url.startsWith('data:image')) {
            try {
                const base64Data = template.logo_url.split(',')[1];
                const imgBuffer = Buffer.from(base64Data, 'base64');
                doc.image(imgBuffer, PAGE_W / 2 - 60, 30, { width: 120 });
                console.log("✅ Logo applied");
            } catch (e) { console.error("⚠️ Logo error:", e.message); }
        }

        // Render elements
        console.log(`📝 Rendering ${elements.length} elements...`);
        for (const el of elements) {
            const xPt = (el.x / 100) * PAGE_W;
            const yPt = (el.y / 100) * PAGE_H;
            const widthPt = ((el.width || 80) / 100) * PAGE_W;
            const text = applyShortcodes(el.content || '', replacements);
            const color = el.color || '#ffffff';
            const fontSize = el.fontSize || 12;
            const align = el.align || 'center';

            doc.fillColor(color)
                .fontSize(fontSize)
                .font(el.fontWeight === 'bold' ? 'Helvetica-Bold' : 'Helvetica')
                .text(text, xPt - widthPt / 2, yPt, { width: widthPt, align });

            console.log(`   → "${text.substring(0, 40)}" at (${el.x}%, ${el.y}%)`);
        }

        doc.end();

        const pdfBuffer = await new Promise((resolve) => {
            doc.on('end', () => resolve(Buffer.concat(buffers)));
        });

        console.log(`\n✅ PDF generated (${Math.round(pdfBuffer.length / 1024)} KB)`);

        // 4. Send email
        console.log(`\n📧 Sending email to: ${recipientEmail}`);
        const info = await transporter.sendMail({
            from: `"Tributoo" <${process.env.SMTP_USER}>`,
            to: recipientEmail,
            subject: `Test Voucher — Code: ${code}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #D4AF37;">Your Tributoo Voucher</h2>
                    <p>This is a test email to verify your voucher template design.</p>
                    <p><strong>Voucher Code:</strong> <span style="font-size: 20px; color: #D4AF37; font-weight: bold;">${code}</span></p>
                    <p><strong>Valid for:</strong> ${productName}</p>
                    <p><strong>Value:</strong> €${productPrice}</p>
                    <p><strong>Expires:</strong> ${expiryStr}</p>
                    <hr>
                    <p style="color: #888; font-size: 12px;">Please find your beautifully designed voucher PDF attached.</p>
                </div>
            `,
            attachments: [{
                filename: `Voucher-${code}.pdf`,
                content: pdfBuffer
            }]
        });

        console.log(`✅ Email sent! Message ID: ${info.messageId}`);
        console.log(`\n🎉 SUCCESS! Check your inbox at: ${recipientEmail}`);
        console.log(`   The PDF uses your admin-designed template.`);

    } catch (error) {
        console.error("\n❌ Test Failed:", error.message);
        console.error(error);
    } finally {
        await pool.end();
    }
};

testTemplatedVoucher();
