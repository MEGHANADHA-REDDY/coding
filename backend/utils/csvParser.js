const multer = require('multer');
const csvParser = require('csv-parser');
const { Readable } = require('stream');

const ALLOWED_MIMETYPES = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const ALLOWED_EXTENSIONS = ['.csv', '.xls', '.xlsx'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
    if (ALLOWED_MIMETYPES.includes(file.mimetype) || ALLOWED_EXTENSIONS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and Excel (.xlsx, .xls) files are allowed'), false);
    }
  },
});

const parseCSV = (buffer) => {
  return new Promise((resolve, reject) => {
    const results = [];
    const stream = Readable.from(buffer.toString());

    stream
      .pipe(csvParser({ mapHeaders: ({ header }) => header.trim().toLowerCase() }))
      .on('data', (row) => results.push(row))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
};

const parseFile = async (file) => {
  const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));

  if (ext === '.xlsx' || ext === '.xls') {
    const XLSX = require('xlsx');
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
    return rows.map((row) => {
      const normalized = {};
      for (const key of Object.keys(row)) {
        normalized[key.trim().toLowerCase()] = row[key];
      }
      return normalized;
    });
  }

  return parseCSV(file.buffer);
};

module.exports = { upload, parseCSV, parseFile };
