const fs = require('fs');
let c = fs.readFileSync('insertDatabase.sql', 'utf8');
c = c.split('$2b$10$xQk5V8rZv1HaB3NmP2YqLuW9dT4cF6gE0jI7sA8nK1oM3pR5tU2vX').join('$2b$10$57dG/C9nZFCvC1lki1YUTKmvomEr3eQQVvLNkWupc8IdrldlwJr.SRgi.6MZtS');
fs.writeFileSync('insertDatabase.sql', c);
console.log('Successfully updated insertDatabase.sql');
