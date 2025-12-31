import express from 'express';
import * as reportController from '../controllers/reportController';

const router: express.Router = express.Router();

router.get('/report', reportController.getReport);
router.get('/report/download', reportController.downloadReportCSV);

export default router;
