(async () => {
    try {
        const payload = {
            name: 'Test',
            dates: '2023-2024',
            photo: 'data:image/jpeg;base64,' + 'A'.repeat(10 * 1024 * 1024) // 10MB
        };
        const res = await fetch('http://localhost:5000/api/tributes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer dummy' },
            body: JSON.stringify(payload)
        });
        console.log("Status:", res.status);
        console.log("Response:", await res.text());
    } catch (e) {
        console.error("Fetch failed:", e.message);
    }
})();
