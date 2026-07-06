/**
 * Adapter registration barrel. Importing this module registers every provider
 * adapter (each calls `registerExecutor` at load). The coordinator imports this
 * so `getExecutor(provider)` resolves. Add new providers by importing them here.
 */

import './gemini';
// Future: import './openai'; import './fal'; import './ideogram'; ...
