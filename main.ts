/*const config = require('./config');
const mysql = require('mysql2');
const path = require('node:path');
const fs = require('node:fs');*/

import { config } from "./config";
import { jobs } from "./jobs";

import mysql from 'mysql2';
import path from 'path';
import fs from 'fs';
import { Job } from "./classes/job";
import { CronJob } from "cron";


// Async JOB generation and execution
(async () => {
    const dbconn = mysql.createPool(config.histdb);

    // Jobs internal memory
    let jobs_table: {
        jobObject: Job,
        jobName: string,
        isRunning: boolean,
        cron: CronJob
    }[] = [];
    // Jobs table
    await dbconn.promise().query(
        'DELETE FROM jobs'
    );

    // Generate jobs
    await Object.keys(jobs).forEach(async (j) => {
        let jobconfig = jobs[j];

        try {
            const modulePath = `./jobs/${jobconfig.script}`;
            const { JobWorker } = await import(modulePath);

            JobWorker.init(dbconn);

            let internaljob = {
                jobObject: JobWorker,
                jobName: jobconfig.script,
                isRunning: false,

                cron: new CronJob(jobconfig.cron, async() => {
                    await dbconn.promise()
                    .query('UPDATE jobs SET isRunning = true, last_execution = NOW() WHERE jobname = ?', [jobconfig.script]);
                    console.log(`Running job ${jobconfig.script}...`);

                    await JobWorker.run();

                    await dbconn.promise()
                    .query('UPDATE jobs SET isRunning = false WHERE jobname = ?', [jobconfig.script]);
                    console.log(`Job ${jobconfig.script} finished.`);
                })
            }

            internaljob.cron.start();

            jobs_table.push(internaljob);

            dbconn.promise().query(
                'INSERT INTO jobs (jobname, isRunning, last_execution) VALUES (?, ?, ?)',
                [jobconfig.script, false, null]
            );

        } catch (err) {
            console.error(`Failed to load scrapper ${j}:`, err);
        }
    });


})();