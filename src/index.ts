/**
 * SQL Sheets - SQL interface for Google Sheets
 * Main entry point for HTTP requests
 */

import { RequestHandler } from "./server/handler.js";
import { logger } from "./utils/logger.js";

/**
 * Main HTTP POST handler.
 * Called by Google Apps Script when HTTP POST is received.
 * Must be synchronous - GAS doesn't support async trigger functions.
 */
function doPost(
  e: GoogleAppsScript.Events.DoPost,
): GoogleAppsScript.Content.TextOutput {
  const lock = LockService.getScriptLock();
  const acquired = lock.tryLock(30000); // 30 second timeout

  if (!acquired) {
    const error = {
      success: false,
      error: {
        code: "SQLITE_BUSY",
        message: "Database is locked. Another request is in progress.",
      },
    };
    return ContentService.createTextOutput(JSON.stringify(error)).setMimeType(
      ContentService.MimeType.JSON,
    );
  }

  try {
    const handler = new RequestHandler();
    const result = handler.handle(e.postData.contents);

    return ContentService.createTextOutput(result).setMimeType(
      ContentService.MimeType.JSON,
    );
  }
  catch (err) {
    logger.error("doPost failed", err);
    const error = {
      success: false,
      error: {
        code: "SQLITE_ERROR",
        message: err instanceof Error ? err.message : String(err),
      },
    };
    return ContentService.createTextOutput(JSON.stringify(error)).setMimeType(
      ContentService.MimeType.JSON,
    );
  }
  finally {
    lock.releaseLock();
  }
}

function onOpen(
  _e:
    | GoogleAppsScript.Events.DocsOnOpen
    | GoogleAppsScript.Events.SlidesOnOpen
    | GoogleAppsScript.Events.SheetsOnOpen
    | GoogleAppsScript.Events.FormsOnOpen,
): void {
  // Placeholder for future menu setup
}

function onEdit(_e: GoogleAppsScript.Events.SheetsOnEdit): void {
  // Placeholder for future edit handlers
}

function onInstall(_e: GoogleAppsScript.Events.AddonOnInstall): void {
  // Placeholder for future install handlers
}

function doGet(
  _e: GoogleAppsScript.Events.DoGet,
): GoogleAppsScript.Content.TextOutput {
  return ContentService.createTextOutput(
    "SQL Sheets API - use POST requests",
  ).setMimeType(ContentService.MimeType.TEXT);
}

export { doGet, doPost, onEdit, onInstall, onOpen };
