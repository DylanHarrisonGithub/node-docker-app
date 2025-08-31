import { promises as fs } from 'fs'
import * as Path from 'path';

import { Service, ServicePromise } from '../services';

// import { drive_v3, google, sheets_v4 } from 'googleapis';

import config from '../../config/config';
import { title } from 'process';

export type Directory = {
  googleId?: string,
  size: number | undefined,
  timestamp: number,
  files: { [filename: string]: {
    googleId?: string,
    metaData?: any,
    size: number,
    timestamp: number
  }},
  subDirectories: { [directoryname: string]: Directory }
}

const parseErrorMessage = (fnName: string, e: any): string[] => [
  `Server - Services - File - ${fnName}: ${e.toString() || `Error: ${e.name || ``} ${e.message || `Unknown error.`}`}`
];

const file = ((): typeof service extends Service ? typeof service : never => {
  const service = {

    exists: async (filepath: string): ServicePromise => {
      try {
        await fs.access(config.ROOT_DIR + filepath, fs.constants.F_OK);
        return {
          success: true,
          messages: [
            `Server - Services - File - Exists: Successfully ${filepath} verified to exist.`,
          ]
        }
      } catch (e) {
        return {
          success: false,
          messages: [
            `Server - Services - File - Exists: Error looking for ${filepath}`,
            ...parseErrorMessage(`Exist`, e)
          ]
        }      
      }
    },
    
    create: async (filepath: string, content: string): ServicePromise => {
      try {
        await fs.writeFile(config.ROOT_DIR + filepath, content);
        return {
          success: true,
          messages: [`Server - Services - File - Create: Successfully created ${filepath}`,]
        }
      } catch(e) {
        return {
          success: false,
          messages: [
            `Server - Services - File - Create: Error creating ${filepath}`,
            ...parseErrorMessage(`Create`, e)
          ]
        }
      }
    },
    
    read: async (filepath: string): ServicePromise<string> => {
      try {
        const contents = await fs.readFile(config.ROOT_DIR + filepath, "utf8");
        return {
          success: true,
          messages: [`Server - Services - File - Read: Successfully read ${filepath}`,],
          body: contents
        }
      } catch(e) {
        return {
          success: false,
          messages: [
            `Server - Services - File - Read: Error reading ${filepath}`,
            ...parseErrorMessage(`Read`, e)
          ]
        }
      }
    },
  
    update: async (filepath: string, content: string): ServicePromise => {
      try {
        await fs.appendFile(config.ROOT_DIR + filepath, content);
        return {
          success: true,
          messages: [`Server - Services - File - Update: Successfully updated ${filepath}.`,]
        }
      } catch(e) {
        return {
          success: false,
          messages: [
            `Server - Services - File - Update: Error updating ${filepath}`,
            ...parseErrorMessage(`Update`, e)
          ]
        }
      }
    },
  
    delete: async (filepath: string): ServicePromise => {
      // console.log('delete filepath: ', filepath);
      if (config.PROTECTED_FOLDERS.includes(filepath)) {
        return {
          success: false,
          messages: [
            `Server - Services - File - Delete: Error deleting ${filepath}.`,
            `Server - Services - File - Delete: ${filepath} is a protected folder and cannot be deleted.`
          ]
        }
      }
      try {
        // await fs.unlink(config.ROOT_DIR + filepath);
        await fs.rm(Path.normalize(config.ROOT_DIR + filepath), { recursive: true, force: true })
        return {
          success: true,
          messages: [`Server - Services - File - Delete: Successfully deleted ${filepath}.`,]
        }
      } catch(e) {
        return {
          success: false,
          messages: [
            `Server - Services - File - Delete: Error deleting ${filepath}.`,
            ...parseErrorMessage(`Delete`, e)
          ]
        }
      }
    },
  
    move: async (srcpath: string, destpath: string): ServicePromise => {
      try {
        await fs.rename(config.ROOT_DIR + srcpath, config.ROOT_DIR +  destpath);
        return {
          success: true,
          messages: [`Server - Services - File - Move: Successfully moved ${srcpath} to ${destpath}.`,]
        }
      } catch(e) {
        return {
          success: false,
          messages: [
            `Server - Services - File - Move: Error moving ${srcpath} to ${destpath}.`,
            ...parseErrorMessage(`Move`, e)
          ]
        }
      }
    },
  
    readDirectory: async (path: string): ServicePromise<string[]> => {
      try {
        const files = await fs.readdir(config.ROOT_DIR + path);
        return {
          success: true,
          messages: [`Server - Services - File - ReadDirectory: Successfully read directory ${path}.`,],
          body: files
        }
      } catch(e) {
        return {
          success: false,
          messages: [
            `Server - Services - File - ReadDirectory: Error reading directory ${path}.`,
            ...parseErrorMessage(`ReadDirectory`, e)
          ]
        }
      }
    },

    readFullDirectory: async (path: string): ServicePromise<Directory> => {

      const _getDirectory = async (root: string): Promise<Directory> => {
        const rootPath = Path.join(config.ROOT_DIR, root);
        // console.log(rootPath);
        const result: Directory = { 
          size: (await file.getDirectorySize(root)).body, // this is not efficient. could collate directory size after recursing over file and subdirectory sizes
          timestamp: (await fs.stat(rootPath)).birthtimeMs, 
          files: {}, 
          subDirectories: {} 
        };
        const items = await fs.readdir(rootPath);
        for (const i of items) {
          const itemPath  = Path.join(root, i);
          const stats = await fs.stat(Path.join(rootPath, i));
          if (stats.isDirectory()) {
            result.subDirectories[i] = await _getDirectory(itemPath);
          } else {
            result.files[i] = {
              size: stats.size,
              timestamp: stats.birthtimeMs
            }
          }
        }
        return result;
      };

      try {
        if (!(await fs.stat(Path.join(config.ROOT_DIR, path))).isDirectory()) {
          return {
            success: false,
            messages: [
              `Server - Services - File - ReadFullDirectory - Provided path ' ${path}' is not a valid directory.`
            ]
          }
        }
        const dir: Directory = await _getDirectory(path);
        return {
          success: true,
          messages: [`Server - Services - File - ReadFullDirectory - Path ' ${path}' retrieved successfully.`],
          body: dir
        }
      } catch (e) {
        return {
          success: false,
          messages: [
            `Server - Services - File - ReadFullDirectory: Error reading directory ${path}.`,
            ...parseErrorMessage(`ReadFullDirectory`, e)
          ]
        }
      }
    },
  
    createDirectory: async (path: string): ServicePromise => {
      try {
        await fs.mkdir(config.ROOT_DIR + path, { recursive: true });
        return {
          success: true,
          messages: [`Server - Services - File - CreateDirectory: Successfully created directory ${path}.`,]
        }
      } catch(e) {
        return {
          success: false,
          messages: [
            `Server - Services - File - CreateDirectory: Error creating directory ${path}.`,
            ...parseErrorMessage(`CreateDirectory`, e)
          ]
        }
      }
    },
  
    deleteDirectory: async (path: string): ServicePromise => {
      // console.log('delete filepath: ', path);
      if (config.PROTECTED_FOLDERS.includes(path)) {
        return {
          success: false,
          messages: [
            `Server - Services - File - Delete: Error deleting ${path}.`,
            `Server - Services - File - Delete: ${path} is a protected folder and cannot be deleted.`
          ]
        }
      }
      try {
        await fs.rmdir(config.ROOT_DIR + path, { recursive: true });
        return {
          success: true,
          messages: [`Server - Services - File - DeleteDirectory: Successfully deleted directory ${path}.`,]
        }
      } catch(e) {
        return {
          success: false,
          messages: [
            `Server - Services - File - DeleteDirectory: Error deleting directory ${path}.`,
            ...parseErrorMessage(`DeleteDirectory`, e)
          ]
        }
      }
    },

    getDirectorySize: async (path: string): ServicePromise<number> => {

      try {
        const stats = await fs.stat(config.ROOT_DIR + path);
        if (!stats.isDirectory()) {
          return {
            success: false,
            messages: [
              `Server - Services - File - GETDIRECTORYSIZE: ${path} is not a directory.`,
            ]
          }   
        }
      } catch {
        return {
          success: false,
          messages: [
            `Server - Services - File - GETDIRECTORYSIZE: ${config.ROOT_DIR + path} does not exist or is inaccessable.`,
          ]
        }   
      }

      let totalSize = 0;

      async function calculateSize(filePath: string): Promise<void> {
        const stats = await fs.stat(filePath);
    
        if (stats.isFile()) {
          totalSize += stats.size;
        } else if (stats.isDirectory()) {
          const subFiles = await fs.readdir(filePath);
          for (const subFile of subFiles) {
            await calculateSize(Path.join(filePath, subFile));
          }
        }
      }

      await calculateSize(config.ROOT_DIR + path);
      return {
        success: true,
        messages: [
          `Server - Services - File - GETDIRECTORYSIZE: ${path} size calculated successfully.`,
        ],
        body: totalSize
      }
    },

    // readFullGoogleDriveDirectory: async (folderID: string): ServicePromise<Directory> => {

    //   if (!config.GOOGLE_API_KEY) {
    //     return {
    //       success: false,
    //       messages: [
    //         `Server - Services - File - READFULLGOOGLEDRIVEDIRECTORY: GOOGLE DRIVE API key not configured.`
    //       ]
    //     }
    //   }

    //   const _getGoogleDirectory: (folderID: string) => Promise<Directory> = async (folderID) => {
    //     const drive = google.drive({ version: 'v3', auth: config.GOOGLE_API_KEY });
    //     const errorsmsgs = [];

    //     let pageToken = undefined;
    //     let files: drive_v3.Schema$File[] = [];
    //     let res;

    //     do {
    //       res = await drive.files.list({
    //         q: `'${folderID}' in parents`,  // Query for files and folders inside a specific folder
    //         fields: 'files(id, name, mimeType, size, createdTime, imageMediaMetadata, videoMediaMetadata), nextPageToken',  // Retrieve specific file/folder metadata
    //         pageToken: pageToken
    //       })
    //       files = [ ...files, ...(res.data.files || [])];
    //       pageToken = res.data.nextPageToken;
    //     } while (pageToken);

    //     const thisDir: Directory = {
    //       googleId: folderID,
    //       size: 0,
    //       timestamp: -1,
    //       files: {},
    //       subDirectories: {}
    //     };

    //     for (const gfile of files) {
    //       if (gfile.id) {
    //         if (gfile.mimeType === `application/vnd.google-apps.folder`) {
    //           thisDir.subDirectories[gfile.name || gfile.id] = await _getGoogleDirectory(gfile.id);
    //           (thisDir.subDirectories[gfile.name || gfile.id].googleId)! = gfile.id,
    //           (thisDir.subDirectories[gfile.name || gfile.id].timestamp)! = parseInt(gfile.createdTime || '0');
    //           thisDir.size = thisDir.size! + (thisDir.subDirectories[gfile.name || gfile.id].size)!;
    //         } else {
    //           thisDir.files[gfile.name || gfile.id] = {
    //             googleId: gfile.id,
    //             size: parseInt(gfile.size || '0'),
    //             timestamp: parseInt(gfile.createdTime || '0'),
    //             metaData: { mimeType: gfile.mimeType, ...gfile.imageMediaMetadata, ...gfile.videoMediaMetadata }
    //           }
    //           thisDir.size = thisDir.size! + parseInt(gfile.size || '0');
    //         }
    //       }

    //     };

    //     return thisDir;
    //   }

    //   try {
    //     const dir: Directory = await _getGoogleDirectory(folderID);
    //     return {
    //       success: true,
    //       messages: [`Server - Services - File - ReadFullGoogleDirectory - Path ' ${folderID}' retrieved successfully.`],
    //       body: dir
    //     }
    //   } catch (e) {
    //     return {
    //       success: false,
    //       messages: [
    //         `Server - Services - File - ReadFullGoogleDirectory: Error reading directory ${folderID}.`,
    //         ...parseErrorMessage(`ReadFullGoogleDirectory`, e)
    //       ]
    //     }
    //   }

    // },

    // readGoogleDriveDirectory: async (folderID: string): ServicePromise<drive_v3.Schema$File[]> => {
    //   if (!config.GOOGLE_API_KEY) {
    //     return {
    //       success: false,
    //       messages: [
    //         `Server - Services - File - READFULLGOOGLEDRIVEDIRECTORY: GOOGLE DRIVE API key not configured.`
    //       ]
    //     }
    //   }
    //   const drive = google.drive({ version: 'v3', auth: config.GOOGLE_API_KEY });
    //   try {

    //     let pageToken = undefined;
    //     let files: drive_v3.Schema$File[] = [];
    //     let res;

    //     do {
    //       res = await drive.files.list({
    //         q: `'${folderID}' in parents`,  // Query for files and folders inside a specific folder
    //         fields: 'files(id, name, mimeType, size, createdTime, imageMediaMetadata, videoMediaMetadata), nextPageToken',  // Retrieve specific file/folder metadata
    //         pageToken: pageToken
    //       })
    //       files = [ ...files, ...(res.data.files || [])];
    //       pageToken = res.data.nextPageToken;
    //     } while (pageToken);

    //     return {
    //       success: true,
    //       messages: [
    //         `Server - Services - File - READFULLGOOGLEDRIVEDIRECTORY: GOOGLE DRIVE folder read successfully.`
    //       ],
    //       body: files
    //     }

    //   } catch (error) {
    //     return {
    //       success: false,
    //       messages: [
    //         `Server - Services - File - READFULLGOOGLEDRIVEDIRECTORY: error occured reading google drive directory ${folderID}.`,
    //         (error as Object).toString()            
    //       ]
    //     }
    //   }
    // },

    // readGoogleSpreadsheet: async (spreadSheetID: string): ServicePromise<{ [key: string]: string[][] }> => {

    //   const sheets = google.sheets({ version: 'v4', auth: config.GOOGLE_API_KEY });

    //   try {
    //     const response = await sheets.spreadsheets.get({
    //       spreadsheetId: spreadSheetID
    //     });

    //     let sheet: any = {};
    //     let data;

    //     const titles = response.data.sheets?.map(s => s.properties?.title) || [];

    //     for (const title of titles) {
    //       data = await sheets.spreadsheets.values.get({
    //         spreadsheetId: spreadSheetID,
    //         range: `${title}`
    //       });
    //       sheet[title as string] = data.data.values; 
    //     }

    //     return {
    //       success: true,
    //       messages: [
    //         `Server - Services - File - READGOOGLESPREADSHEET: GOOGLE spreadsheet read successfully.`
    //       ],
    //       body: sheet
    //     }
    //   } catch (error) {
    //     return {
    //       success: false,
    //       messages: [
    //         `Server - Services - File - READGOOGLESPREADSHEET: error occured reading google spreadsheet.`,
    //         (error as Object).toString()            
    //       ]
    //     }
    //   }

    // }

  }
  return service;
})();

export default file;