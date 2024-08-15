const express = require('express');
const { google } = require('googleapis');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const SPREADSHEET_ID = '1XWSIZjuNn2m0Fo3zAw9cqhQUm-ZYoMQQkGiujrT6s4c';
const SHEET_NAME = 'Sheet1';

async function authorize() {
    const auth = new google.auth.GoogleAuth({
        keyFile: path.join(__dirname, '../config/credentials.json'),
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    return await auth.getClient();
}

// Serve the HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Add student
app.post('/add-student', async (req, res) => {
    const { name, rollNumber, college } = req.body;
    const auth = await authorize();
    const sheets = google.sheets({ version: 'v4', auth });

    try {
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A:C`,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [[name, rollNumber, college]],
            },
        });
        res.send('Student added successfully!');
    } catch (error) {
        res.status(500).send('Error adding student: ' + error.message);
    }
});

// Get students
app.get('/get-students', async (req, res) => {
    const auth = await authorize();
    const sheets = google.sheets({ version: 'v4', auth });

    try {
        const result = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A:C`,
        });
        const rows = result.data.values;
        if (rows.length) {
            res.json(rows);
        } else {
            res.send('No data found.');
        }
    } catch (error) {
        res.status(500).send('Error retrieving students: ' + error.message);
    }
});

// Update student
app.put('/update-student', async (req, res) => {
    const { name, rollNumber, college } = req.body;
    const auth = await authorize();
    const sheets = google.sheets({ version: 'v4', auth });

    try {
        const result = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A:C`,
        });
        const rows = result.data.values;
        const rowIndex = rows.findIndex(row => row[1] === rollNumber);

        if (rowIndex !== -1) {
            await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: `${SHEET_NAME}!A${rowIndex + 1}:C${rowIndex + 1}`,
                valueInputOption: 'USER_ENTERED',
                resource: {
                    values: [[name, rollNumber, college]],
                },
            });
            res.send('Student updated successfully!');
        } else {
            res.status(404).send('Student not found.');
        }
    } catch (error) {
        res.status(500).send('Error updating student: ' + error.message);
    }
});

// Delete student
app.delete('/delete-student', async (req, res) => {
    const { rollNumber } = req.body;
    const auth = await authorize();
    const sheets = google.sheets({ version: 'v4', auth });

    try {
        const result = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A:C`,
        });
        const rows = result.data.values;
        const rowIndex = rows.findIndex(row => row[1] === rollNumber);

        if (rowIndex !== -1) {
            rows.splice(rowIndex, 1); // Remove the student from the array

            await sheets.spreadsheets.values.clear({
                spreadsheetId: SPREADSHEET_ID,
                range: `${SHEET_NAME}!A${rowIndex + 1}:C${rowIndex + 1}`,
            });

            // Shift rows up if necessary
            await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: `${SHEET_NAME}!A${rowIndex + 1}`,
                valueInputOption: 'USER_ENTERED',
                resource: {
                    values: rows.slice(rowIndex).map(row => row), // Update remaining rows
                },
            });

            res.send('Student deleted successfully!');
        } else {
            res.status(404).send('Student not found.');
        }
    } catch (error) {
        res.status(500).send('Error deleting student: ' + error.message);
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
