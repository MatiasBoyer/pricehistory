import fs from 'fs';
import path from 'path';

const jobs = {
    mercadolibre: {
        cron: '0 0 0 * * *', // Cron job to run the scrapper
        script: 'mercadolibre-webscraper.ts', // Object to run

        config:
        {
            // Log in info
            cookies: [
                {
                    name: 'ssid',
                    value: fs.readFileSync(path.join(__dirname, './hidden/mercadolibre.ssid')).toString(),
                    domain: '.mercadolibre.com.ar',
                    secure: true, 
                    httpOnly: true
                }
            ],

            minTimeDifference: 30, // Between the last price and NOW() in MINUTES!
            pagesToScrape: 10, // In a single category, navigate through how many pages?
        }
    }
}

export { jobs };