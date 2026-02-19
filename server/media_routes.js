
// --- MEDIA LIBRARY ROUTES ---
app.get('/api/media', async (req, res) => {
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
        // User ID handling:
        // If uploaded by admin, they might want to assign to a user? Or global?
        // Usually global media has user_id = current user.

        const result = await pool.query(
            "INSERT INTO media (type, url, user_id) VALUES ($1, $2, $3) RETURNING *",
            [type, url, userId || req.user.id] // Use provided userId or fallback to authenticated user
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

        // Optional: Check ownership if not admin
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
