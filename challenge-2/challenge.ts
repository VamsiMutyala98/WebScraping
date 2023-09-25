import fs from 'fs';
import fastCSV from 'fast-csv';
import { ICompanies, ICompaniesResponse, IDownloadResponse, IFounders, IJobs, ILaunchPosts } from "../type";
import axios from 'axios';
import * as cheerio from 'cheerio';
import { db } from '../connection';

/**
 * The entry point function. This will read the provided CSV file, scrape the companies'
 * YC pages, and output structured data in a JSON file.
 */
export async function processCompanyList(): Promise<IDownloadResponse> {
  return new Promise((resolve, reject) => {
    try {
      const tableName: string = "companies";
      const results: ICompaniesResponse[] = [];
      const stream = fs.createReadStream('./challenge-2/inputs/companies.csv')
      fastCSV.parseStream(stream, { headers: true })
        .on("data", async (row: ICompaniesResponse) => {
          results.push(row);
        })
        .on("end", async() => {
          const companies: ICompanies[] = [];
          console.log('READING_DATA.......');
          for (let i = 0; i < results.length; i++) {
            const response = await axios.get(results[i]['YC URL']);
            const $ = cheerio.load(response.data);
            const title: string = $('h1').text() || '';
            const founded: string = $('span:contains("Founded:")')?.next('span')?.text() || '';
            const teamSize: number = Number($('span:contains("Team Size:")')?.next('span')?.text() || 0) || 0;
            const jobs: IJobs[] = [];
            const founders: IFounders[] = [];
            const launchPosts: ILaunchPosts[] = [];
            $('.flex.w-full.flex-row.justify-between.py-4').each((index, element) => {
              const role = $(element)?.find('.ycdc-with-link-color.pr-4.text-lg.font-bold a')?.text()?.trim() || '';
              const location = $(element)?.find('.list-item.list-square.capitalize:first').text().trim() || '';
              jobs.push({ role, location });
            })
            $('.leading-snug').each((index, element) => {
              const name = $(element)?.find('.font-bold')?.text()?.trim() || '';
              const linkedIn = $(element)?.find('a[title="LinkedIn profile"]').attr('href') || '';
              founders.push({ name, linkedIn })
            })
            $('.company-launch').each((index, element) => {
              launchPosts.push({ title: $(element)?.find('h3')?.text()?.trim() || '' })
            })
            companies.push({ title, founded, teamSize, jobs, founders, launchPosts });
          }

          const isTableExists: boolean = await db.schema.hasTable(tableName);
          console.log('CREATING_TABLE......');
          if (!isTableExists) {
            await db.schema.createTable(tableName, (table) => {
              table.increments('id').primary();
              table.string('title');
              table.string('founded');
              table.integer('teamSize');
              table.json('jobs');
              table.json('founders');
              table.json('launchPosts');
              table.timestamps(true, true);
            });
            console.log(`Table ${tableName} created.`);
          }
          console.log('INSERTING_DATA_INTO_TABLE......');
          await db(tableName).insert(companies.map((com) => ({...com, jobs: JSON.stringify(com.jobs), founders: JSON.stringify(com.founders), launchPosts: JSON.stringify(com.launchPosts)})));
          console.log('INSERT_SUCCESSFULLY');
          db.destroy();
          resolve({
            status: 200,
            message: 'Web Scraping has been done successfully',
          });
        });
    } catch (error) {
      reject({
        status: 400,
        message: 'Error in Web Scraping',
      });
    }
  })
}
