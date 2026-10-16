// Núcleo governado do Rabelus Buddy (SPEC 0001).
export { openDatabase, transaction, type Database } from './db.ts';
export { EventLog, type LogEvent, type SessionProjection } from './log.ts';
export { stateHome, endpointFor, dbPathFor } from './paths.ts';
export { startOwner, AlreadyRunningError, type Owner } from './owner.ts';
