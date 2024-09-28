const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const bodyParser = require('body-parser');

// Middleware to handle JSON and static files
app.use(express.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true })); // To handle form data
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files
app.use(express.static(path.join(__dirname, 'views')));  // Serve HTML files

// Log incoming requests
app.use((req, res, next) => {
    console.log(`Incoming request: ${req.method} ${req.originalUrl}`);
    next();
});

// Route to serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Route to prompt for password
app.get('/upload', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'password.html'));
});

// Password check route
app.post('/checkPassword', (req, res) => {
    const { password } = req.body;
    if (password === 'nigga') {
        // If password is correct, redirect to upload page
        res.redirect('/uploadForm');
    } else {
        // If password is incorrect, send an error message
        res.send('<h1>Access Denied</h1><p>Incorrect password. Please try again.</p><a href="/">Go back</a>');
    }
});

// Serve the actual upload page if accessed after correct password
app.get('/uploadForm', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'upload.html'));
});

// API to handle product uploads
app.post('/uploadProduct', (req, res) => {
    try {
        const { name, link, imageLink } = req.body;
        let imagePath;

        // Check if name and link are provided
        if (!name || !link) {
            return res.status(400).json({ message: 'Missing required fields (name, link)' });
        }

        // Handle image upload or image link
        if (imageLink && imageLink.trim() !== "") {
            // If the user provided an image link, use it directly
            imagePath = imageLink;
        } else if (req.body.image) {
            // If the user uploaded an image from the gallery, save it to the server
            const base64Data = req.body.image.replace(/^data:image\/\w+;base64,/, "");
            const imageBuffer = Buffer.from(base64Data, 'base64');
            imagePath = `/images/${name}.png`;

            fs.writeFile(path.join(__dirname, 'public', imagePath), imageBuffer, (err) => {
                if (err) {
                    return res.status(500).json({ message: 'Error saving image' });
                }
            });
        } else {
            // If neither an image link nor gallery image is provided, return an error
            return res.status(400).json({ message: 'Please provide an image link or upload an image from the gallery.' });
        }

        // Generate the product HTML for insertion
        const newProductHTML = `
            <div class="product-item">
                <a href="${link}" target="_blank" rel="noopener">
                    <img alt="${name}" height="200" src="${imagePath}" width="200"/>
                    <p>${name}</p>
                </a>
            </div>
        `;

        const indexFilePath = path.join(__dirname, 'views', 'index.html');
        
        // Read index.html to find where to insert the new product
        fs.readFile(indexFilePath, 'utf8', (err, data) => {
            if (err) {
                return res.status(500).json({ message: 'Error reading index.html' });
            }

            const insertPosition = data.lastIndexOf('</div> <!-- Close product-grid div -->');
            if (insertPosition === -1) {
                return res.status(500).json({ message: 'Failed to find insertion point' });
            }

            const updatedData = data.slice(0, insertPosition) + newProductHTML + '\n' + data.slice(insertPosition);
            
            // Write the updated index.html file
            fs.writeFile(indexFilePath, updatedData, 'utf8', (err) => {
                if (err) {
                    return res.status(500).json({ message: 'Error writing to index.html' });
                }

                // After successful product upload, redirect the user to the main site
                res.redirect('/');
            });
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Start the server
app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
}); 