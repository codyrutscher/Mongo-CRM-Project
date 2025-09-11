const exportService = require('../services/exportService');
const logger = require('../utils/logger');

class ExportController {
  async exportContacts(req, res) {
    try {
      const { 
        format = 'csv', 
        filters = {}, 
        filename 
      } = req.body;

      let result;
      const options = { filename };

      if (format.toLowerCase() === 'excel') {
        result = await exportService.exportToExcel(filters, options);
      } else {
        result = await exportService.exportToCSV(filters, options);
      }

      res.json({
        success: true,
        data: {
          filename: result.filename,
          recordCount: result.recordCount,
          format: result.format,
          downloadUrl: `/api/export/download/${result.filename}`
        },
        message: `Export completed: ${result.recordCount} contacts exported`
      });
    } catch (error) {
      logger.error('Error exporting contacts:', error);
      res.status(500).json({
        success: false,
        error: 'Export failed'
      });
    }
  }

  async exportSegment(req, res) {
    try {
      const { segment } = req.params;
      const { format = 'csv' } = req.query;

      const result = await exportService.exportBySegment(segment, format);

      res.json({
        success: true,
        data: {
          filename: result.filename,
          recordCount: result.recordCount,
          format: result.format,
          downloadUrl: `/api/export/download/${result.filename}`
        },
        message: `Segment export completed: ${result.recordCount} contacts exported`
      });
    } catch (error) {
      logger.error('Error exporting segment:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async exportSearchResults(req, res) {
    try {
      const { 
        query, 
        filters = {}, 
        format = 'csv' 
      } = req.body;

      const result = await exportService.exportSearchResults(query, filters, format);

      res.json({
        success: true,
        data: {
          filename: result.filename,
          recordCount: result.recordCount,
          format: result.format,
          downloadUrl: `/api/export/download/${result.filename}`
        },
        message: `Search results exported: ${result.recordCount} contacts`
      });
    } catch (error) {
      logger.error('Error exporting search results:', error);
      res.status(500).json({
        success: false,
        error: 'Export failed'
      });
    }
  }

  async downloadExport(req, res) {
    try {
      const { filename } = req.params;
      
      // Validate filename to prevent path traversal
      if (!filename.match(/^[a-zA-Z0-9_\-\.]+$/)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid filename'
        });
      }

      const fileInfo = await exportService.getExportFile(filename);
      
      // Set appropriate headers
      const extension = filename.split('.').pop().toLowerCase();
      let mimeType = 'application/octet-stream';
      
      if (extension === 'csv') {
        mimeType = 'text/csv';
      } else if (extension === 'xlsx') {
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      }

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', fileInfo.size);

      // Stream the file
      const fs = require('fs');
      const stream = fs.createReadStream(fileInfo.filePath);
      stream.pipe(res);

      stream.on('error', (error) => {
        logger.error('Error streaming export file:', error);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: 'Failed to download file'
          });
        }
      });

    } catch (error) {
      logger.error('Error downloading export:', error);
      res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }
  }

  async cleanupOldExports(req, res) {
    try {
      const { maxAgeHours = 24 } = req.body;
      const cleanedCount = await exportService.cleanupOldExports(maxAgeHours);
      
      res.json({
        success: true,
        data: {
          cleanedCount
        },
        message: `Cleaned up ${cleanedCount} old export files`
      });
    } catch (error) {
      logger.error('Error cleaning up exports:', error);
      res.status(500).json({
        success: false,
        error: 'Cleanup failed'
      });
    }
  }
}

module.exports = new ExportController();