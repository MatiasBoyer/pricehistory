import mysql from 'mysql2';
import { ObtainCurrentDate } from '../helpers/global';

export class Job {

    dbpool: mysql.Pool;

    isReady: boolean = false;
    isWorking: boolean = false;

    jobId: number = -1;

    async init(dbpool: mysql.Pool) {
        this.dbpool = dbpool;
    }

    async scrape() {

    }

    async Log(message) {
        console.log(`[${ObtainCurrentDate()} - JOB ${this.jobId}] ${message}`);

        if (this.jobId != -1) {
            return await this.dbpool.promise()
                .query('INSERT INTO job_log (jobId, message, timestamp) VALUES (?, ?, ?)',
                    [this.jobId, message, ObtainCurrentDate()]);
        }
    }
}