async function test() {
    let login = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@tributo', password: 'admin' })
    });
    const data = await login.json();
    const token = data.token;
    console.log("Got token:", token ? "yes" : "no");

    // Now try to post
    const res = await fetch('http://localhost:5000/api/tributes', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({
            name: 'Test Memorial',
            dates: 'Jan 1, 1990 - Dec 31, 2020',
            slug: 'test-memorial-' + Date.now()
        })
    });
    console.log(res.status, await res.text());
}
test();
