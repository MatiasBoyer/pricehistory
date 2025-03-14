import mysql from 'mysql2';

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
        console.log(message);

        if (this.jobId != -1) {
            await this.dbpool.promise()
                .query('INSERT INTO job_log (jobId, message, timestamp) VALUES (?, ?, ?)',
                    [this.jobId, message, new Date()]);
        }
    }
}