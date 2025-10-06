/*
 * Copyright (c) 2014-2021 Bjoern Kimminich.
 * SPDX-License-Identifier: MIT
 */

const utils = require('../lib/utils')
const challenges = require('../data/datacache').challenges
const libxml = require('libxmljs2')
const os = require('os')
const vm = require('vm')
const fs = require('fs')
const unzipper = require('unzipper')
const path = require('path')

function matchesSystemIniFile (text) {
  const match = text.match(/(; for 16-bit app support|drivers|mci|driver32|386enh|keyboard|boot|display)/gi)
  return match && match.length >= 2
}

function matchesEtcPasswdFile (text) {
  const match = text.match(/\w*:\w*:\d*:\d*:\w*:.*/gi)
  return match && match.length >= 2
}

function ensureFileIsPassed ({ file }, res, next) {
  if (file) {
    next()
  }
}

function handleZipFileUpload ({ file }, res, next) {
  if (!utils.endsWith(file.originalname.toLowerCase(), '.zip')) {
    return next(new Error('Invalid file type'));
  }

  if (!file.buffer || utils.disableOnContainerEnv()) {
    return next(new Error('File upload not allowed in this environment'));
  }

  const SecureFileHandler = require('../lib/secureFileHandler');
  const complaintHandler = new SecureFileHandler(path.resolve('uploads/complaints'));
  
  const buffer = file.buffer;
  const filename = path.basename(file.originalname.toLowerCase());
  const tempFile = path.join(os.tmpdir(), filename);

  try {
    // Write the zip file to a temporary location
    fs.writeFileSync(tempFile, buffer);

    // Process the zip file
    fs.createReadStream(tempFile)
      .pipe(unzipper.Parse())
      .on('entry', async function (entry) {
        try {
          const fileName = path.basename(entry.path); // Only use the filename, not the full path
          
          // Validate the file path
          const targetPath = await complaintHandler.validatePath(fileName);
          
          if (targetPath) {
            // Solve challenge if applicable
            utils.solveIf(challenges.fileWriteChallenge, () => { 
              return targetPath === path.resolve('ftp/legal.md');
            });
            
            // Write the file securely
            entry.pipe(fs.createWriteStream(targetPath)
              .on('error', function (err) { 
                next(err);
              }));
          } else {
            entry.autodrain();
          }
        } catch (error) {
          entry.autodrain();
          next(error);
        }
      })
      .on('error', function (err) { 
        next(err);
      })
      .on('finish', function() {
        // Clean up temp file
        try {
          fs.unlinkSync(tempFile);
        } catch (error) {
          console.error('Error cleaning up temp file:', error);
        }
        res.status(204).end();
      });
  } catch (error) {
    next(error);
  }
          })
        })
      })
    }
    res.status(204).end()
  } else {
    next()
  }
}

function checkUploadSize ({ file }, res, next) {
  utils.solveIf(challenges.uploadSizeChallenge, () => { return file.size > 100000 })
  next()
}

function checkFileType ({ file }, res, next) {
  const fileType = file.originalname.substr(file.originalname.lastIndexOf('.') + 1).toLowerCase()
  utils.solveIf(challenges.uploadTypeChallenge, () => {
    return !(fileType === 'pdf' || fileType === 'xml' || fileType === 'zip')
  })
  next()
}

function handleXmlUpload ({ file }, res, next) {
  if (utils.endsWith(file.originalname.toLowerCase(), '.xml')) {
    utils.solveIf(challenges.deprecatedInterfaceChallenge, () => { return true })
    if (file.buffer && !utils.disableOnContainerEnv()) { // XXE attacks in Docker/Heroku containers regularly cause "segfault" crashes
      const data = file.buffer.toString()
      try {
        const sandbox = { libxml, data }
        vm.createContext(sandbox)
        const xmlDoc = vm.runInContext('libxml.parseXml(data, { noblanks: true, noent: true, nocdata: true })', sandbox, { timeout: 2000 })
        const xmlString = xmlDoc.toString(false)
        utils.solveIf(challenges.xxeFileDisclosureChallenge, () => { return (matchesSystemIniFile(xmlString) || matchesEtcPasswdFile(xmlString)) })
        res.status(410)
        next(new Error('B2B customer complaints via file upload have been deprecated for security reasons: ' + utils.trunc(xmlString, 400) + ' (' + file.originalname + ')'))
      } catch (err) {
        if (utils.contains(err.message, 'Script execution timed out')) {
          if (utils.notSolved(challenges.xxeDosChallenge)) {
            utils.solve(challenges.xxeDosChallenge)
          }
          res.status(503)
          next(new Error('Sorry, we are temporarily not available! Please try again later.'))
        } else {
          res.status(410)
          next(new Error('B2B customer complaints via file upload have been deprecated for security reasons: ' + err.message + ' (' + file.originalname + ')'))
        }
      }
    } else {
      res.status(410)
      next(new Error('B2B customer complaints via file upload have been deprecated for security reasons (' + file.originalname + ')'))
    }
  }
  res.status(204).end()
}

module.exports = {
  ensureFileIsPassed,
  handleZipFileUpload,
  checkUploadSize,
  checkFileType,
  handleXmlUpload
}
