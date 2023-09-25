import axios from "axios";
import fs from 'fs';
import tar from 'tar';
import fastCSV from 'fast-csv';
import { db } from "../connection";
import { DOWNLOAD_PATH, DUMP_DOWNLOAD_URL, EXTRACTED_PATH } from "./resources";
import { ICustomerResponse, IDownloadResponse, IOrganizationResponse } from "../type";
/**
 * The entry point function. This will download the given dump file, extract/decompress it,
 * parse the CSVs within, and add the data to a SQLite database.
 * This is the core function you'll need to edit, though you're encouraged to make helper
 * functions!
 */
export async function processDataDump() {
  const response = await axios.get(DUMP_DOWNLOAD_URL, { responseType: 'stream' });
  console.log('Downloading...........');
  !fs.existsSync('tmp') ? fs.mkdirSync('tmp') : null;
  !fs.existsSync('out') ? fs.mkdirSync('out') : null;
  const writer = fs.createWriteStream(DOWNLOAD_PATH);
  response.data.pipe(writer);
  const downloadResponse: IDownloadResponse = await new Promise((resolve, reject) => {
    writer.on("finish", () => {
      resolve({
        status: 200,
        message: 'File downloaded successfully.'
      });
    });

    writer.on("error", () => {
      reject({
        status: 400,
        message: 'Download Failed'
      });
    });
  });
  if (downloadResponse?.status === 200) {
    console.log(downloadResponse?.message);
    console.log('Extracting..............');
    const extractResponse: IDownloadResponse = await EXTRACT_DATA();
    if (extractResponse?.status) {
      console.log(extractResponse.message);
      console.log("Inserting Data..........");
      const readingCSVResponse = await READ_CSV_FILE();
      if (readingCSVResponse.status === 200) {
        console.log(readingCSVResponse.message);
      }
    }
  }
}

const EXTRACT_DATA = (): Promise<IDownloadResponse> => {
  return new Promise(async (resolve, reject) => {
    try {
      await tar.extract({
        file: DOWNLOAD_PATH,
        cwd: 'tmp',
      });
      resolve({
        status: 200,
        message: 'Extracted Successfully'
      });
    } catch (error) {
      reject({
        status: 400,
        message: 'Error in extracting tar file'
      });
    }
  });
}

export const READ_CSV_FILE = (): Promise<IDownloadResponse> => {
  return new Promise((resolve, reject) => {
    try {
      const files: string[] = fs.readdirSync(EXTRACTED_PATH);
      const batchSize = 100;
      let fileCount = 0;
      for (const file of files) {
        if (file.endsWith(".csv") && !file.startsWith("._")) {
          const tableName: string = file.split(".")[0];
          let tableHeaders: string[] = [];
          let results: (ICustomerResponse | IOrganizationResponse)[] = [];
          const stream = fs.createReadStream(`./${EXTRACTED_PATH}/${file}`)
          fastCSV.parseStream(stream, { headers: true })
            .on("headers", async (headers: string[]) => {
              tableHeaders = headers;
            })
            .on("data", async (row: ICustomerResponse | IOrganizationResponse) => {
              results.push(row);
            })
            .on("end", async() => {
              const isTableExists: boolean = await db.schema.hasTable(tableName);
              if (!isTableExists) {
                await db.schema.createTable(tableName, (table) => {
                  tableHeaders.forEach((columnName) => {
                    table.string(columnName);
                  });
                });
                console.log(`Table "${tableName}" created.`);
              }
              for (let i = 0; i< results.length; i += batchSize) {
                await db(tableName).insert(results.slice(i, i+batchSize));
              }
              console.log(`Processing of ${file} complete.`);
              fileCount++;
              if (fileCount === 2) {
                db.destroy();
                resolve({
                  status: 200,
                  message: 'Data Saved Successfully'
                });
              }
            });
        }
      }
    } catch (error) {
      reject({
        status: 400,
        message: "Error while reading CSV file and storing into DB process"
      })
    }
  })
}
