// Núcleo governado do Rabelus Buddy (SPEC 0001).
export { openDatabase, transaction, type Database } from './db.ts';
export { EventLog, type LogEvent, type SessionProjection } from './log.ts';
export { stateHome, endpointFor, dbPathFor } from './paths.ts';
export { startOwner, AlreadyRunningError, type Owner } from './owner.ts';
export { Domain, DomainError, type Run, type Effect, type Approval } from './domain.ts';
export { Policy, PROTECTED, TRAINING_MODELS, type Action, type Decision, type Rule, type Tool, type Scope } from './policy.ts';
export { Budget, BudgetError, costOf, defaultWindows, type WindowDef, type Usage, type WindowStatus } from './budget.ts';
export { PRICES, type Price } from './prices.ts';
export { FsTools } from './tools/fs.ts';
export { CommandTool } from './tools/command.ts';
export { startLogin, logout, loadCredentials, SiwcAuthError, SIWC_ENDPOINTS, type SiwcEndpoints, type ChatGptCredentials } from './providers/siwc.ts';
