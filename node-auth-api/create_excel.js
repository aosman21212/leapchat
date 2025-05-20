const xlsx = require('xlsx');

// Create a new workbook
const workbook = xlsx.utils.book_new();

// Create the data with proper formatting
const data = [
    { to: '120363399344045722', message: 'ssss' }
];

// Create worksheet from data
const worksheet = xlsx.utils.json_to_sheet(data);

// Add worksheet to workbook
xlsx.utils.book_append_sheet(workbook, worksheet, 'Messages');

// Write to file
xlsx.writeFile(workbook, 'test_message.xlsx');

console.log('Excel file created successfully: test_message.xlsx'); 