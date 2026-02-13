const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

// 1. Serve Static Files (CSS, JS, Images)
// This tells the server: "Look inside the 'public' folder for any file requests"
app.use(express.static(path.join(__dirname, 'public')));

// 2. Specific fix for /js imports
// Sometimes browsers ask for '/js/file.js' and the server gets confused. This fixes it.
app.use('/js', express.static(path.join(__dirname, 'public/js')));
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/html', express.static(path.join(__dirname, 'public/html')));

// 3. Main Route (Login Page)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 4. Catch-All Route (Fixes 404s)
// If the browser asks for a page we don't know, just send the index.html or 404
app.use((req, res) => {
    // If it's looking for a JS file and failed, send a 404 status, NOT HTML
    if (req.path.endsWith('.js')) {
        res.status(404).send('JS File Not Found');
    } else {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});