// .smoke/habits-check.ts
import { existsSync as existsSync3, mkdtempSync, readFileSync as readFileSync3, rmSync, writeFileSync as writeFileSync3 } from "node:fs";
import os2 from "node:os";
import path4 from "node:path";

// backend/habits.ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path2 from "node:path";

// backend/config.ts
import os from "node:os";
import path from "node:path";
function realAgentDir() {
  return process.env.PI_DESKTOP_PI_AGENT_DIR?.trim() || path.join(os.homedir(), ".pi", "agent");
}

// backend/i18n.ts
var EN = {
  // main.ts
  "\u7F3A\u5C11\u9879\u76EE\u76EE\u5F55": "Project directory is required",
  "\u6A21\u578B\u6807\u8BC6\u65E0\u6548": "Invalid model identifier",
  "\u63A8\u7406\u5EA6\u65E0\u6548": "Invalid reasoning level",
  "\u4F1A\u8BDD\u6587\u4EF6\u4E0D\u5728 Pi \u4F1A\u8BDD\u76EE\u5F55\u5185": "Session file is outside the Pi session directory",
  "\u9009\u62E9\u9879\u76EE\u76EE\u5F55": "Choose project folder",
  "Pi \u5DE5\u4F5C\u53F0": "Pi Workbench",
  "\u8DEF\u5F84\u65E0\u6548": "Invalid path",
  "\u8DEF\u5F84\u4E0D\u5B58\u5728": "Path does not exist",
  // capabilities.ts
  "\u4F5C\u7528\u57DF\u65E0\u6548": "Invalid scope",
  "\u9879\u76EE\u76EE\u5F55\u4E0D\u5B58\u5728": "Project folder does not exist",
  "\u586B\u5199\u540D\u79F0": "Enter a name",
  "\u540D\u79F0\u53EA\u80FD\u5305\u542B\u5B57\u6BCD\u3001\u6570\u5B57\u3001\u70B9\u3001\u4E0B\u5212\u7EBF\u3001\u77ED\u6A2A\u7EBF\uFF0C\u6700\u591A 64 \u5B57\u7B26": "Name may only contain letters, digits, dots, underscores and dashes, at most 64 characters",
  "\u63CF\u8FF0": "Description",
  "\u540C\u540D Skill \u5DF2\u5B58\u5728\uFF1A{name}": "A Skill with that name already exists: {name}",
  "\u53C2\u6570\u8FC7\u957F": "Argument is too long",
  "\u7B2C {line} \u884C\u73AF\u5883\u53D8\u91CF\u683C\u5F0F\u5E94\u4E3A KEY=VALUE": "Line {line}: environment variable must be KEY=VALUE",
  "\u7B2C {line} \u884C\u73AF\u5883\u53D8\u91CF\u540D\u4E0D\u5408\u6CD5\uFF1A{name}": "Line {line}: invalid environment variable name: {name}",
  "\u7B2C {line} \u884C\u73AF\u5883\u53D8\u91CF\u503C\u8FC7\u957F": "Line {line}: environment variable value is too long",
  "MCP \u914D\u7F6E\u89E3\u6790\u5931\u8D25\uFF1A{error}": "Failed to parse the MCP configuration: {error}",
  "\u540C\u540D MCP \u670D\u52A1\u5668\u5DF2\u5B58\u5728\uFF1A{name}": "An MCP server with that name already exists: {name}",
  "\u586B\u5199\u542F\u52A8\u547D\u4EE4": "Enter the launch command",
  "\u542F\u52A8\u547D\u4EE4": "Launch command",
  // media.ts
  "\u7F3A\u5C11\u6587\u4EF6\u8DEF\u5F84": "File path is required",
  "\u4E0D\u652F\u6301\u7684\u6587\u4EF6\u7C7B\u578B": "Unsupported file type",
  "\u65E0\u6CD5\u8BFB\u53D6\u8BE5\u6587\u4EF6": "Cannot read this file",
  "\u9009\u62E9\u56FE\u7247\u6216\u89C6\u9891": "Choose images or videos",
  "\u56FE\u7247\u4E0E\u89C6\u9891": "Images and videos",
  "\u6240\u6709\u6587\u4EF6": "All files",
  "\u6240\u9009\u6587\u4EF6\u90FD\u4E0D\u53EF\u7528": "None of the selected files are usable",
  "\u9009\u62E9\u6587\u4EF6\u6216\u5A92\u4F53": "Choose files or media",
  "\u6240\u9009\u6587\u4EF6\u4E0D\u662F\u652F\u6301\u7684\u56FE\u7247\u6216\u89C6\u9891": "The selected files are not supported images or videos",
  "\u526A\u8D34\u677F\u91CC\u6CA1\u6709\u56FE\u7247": "No image in the clipboard",
  "\u8BFB\u53D6\u526A\u8D34\u677F\u56FE\u7247\u5931\u8D25": "Failed to read the clipboard image",
  "\u6587\u4EF6\u4E0D\u5728\u5141\u8BB8\u9884\u89C8\u7684\u8303\u56F4\u5185": "File is outside the preview allowlist",
  "\u6587\u4EF6\u4E0D\u5B58\u5728": "File does not exist",
  // pi.ts
  "\u672A\u627E\u5230 Node.js \u53EF\u6267\u884C\u6587\u4EF6\uFF1B\u8BF7\u8BBE\u7F6E PI_DESKTOP_NODE \u6307\u5411 node.exe": "Node.js executable not found; set PI_DESKTOP_NODE to node.exe",
  "\u672A\u627E\u5230 Pi \u53D7\u7BA1\u5B89\u88C5\uFF1A{path}": "No managed Pi installation found: {path}",
  "Pi \u7248\u672C\u6587\u4EF6\u5185\u5BB9\u65E0\u6548\uFF1A{value}": "Invalid Pi version file content: {value}",
  "Pi \u5305\u672A\u58F0\u660E pi \u53EF\u6267\u884C\u5165\u53E3": "The Pi package does not declare a pi executable entry",
  "Pi CLI \u5165\u53E3\u4E0D\u5B58\u5728\uFF1A{path}": "Pi CLI entry does not exist: {path}",
  // inspect.ts
  "\u672A\u53D1\u73B0 models-store.json \u6216 models.json \u4E2D\u7684\u6A21\u578B\u3002": "No models found in models-store.json or models.json.",
  "\u5DF2\u53D1\u73B0 {count} \u4E2A\u4E2D\u8F6C\u7AD9 provider\uFF1B\u5BC6\u94A5\u4E0D\u4F1A\u88AB\u8BFB\u53D6\u6216\u663E\u793A\u3002": "Found {count} relay providers; keys are never read or shown.",
  "\u672A\u53D1\u73B0\u7528\u6237\u6269\u5C55\u3002": "No user extensions found.",
  "\u672A\u53D1\u73B0 Skills\u3002": "No Skills found.",
  "\u672A\u53D1\u73B0 MCP \u914D\u7F6E\u3002": "No MCP configuration found.",
  // providers.ts
  "models.json \u89E3\u6790\u5931\u8D25\uFF1A{error}": "Failed to parse models.json: {error}",
  "auth.json \u89E3\u6790\u5931\u8D25\uFF1A{error}": "Failed to parse auth.json: {error}",
  "\u7F3A\u5C11 provider ID": "Provider ID is required",
  "provider ID \u53EA\u80FD\u7528\u5B57\u6BCD\u3001\u6570\u5B57\u3001\u70B9\u3001\u4E0B\u5212\u7EBF\u3001\u77ED\u6A2A\u7EBF\uFF0C\u4EE5\u5B57\u6BCD\u6216\u6570\u5B57\u5F00\u5934\uFF0C\u6700\u591A 64 \u5B57\u7B26": "Provider ID may only contain letters, digits, dots, underscores and dashes, must start with a letter or digit, and be at most 64 characters",
  "\u8FD9\u4E2A provider ID \u662F\u4FDD\u7559\u5B57\uFF0C\u8BF7\u6362\u4E00\u4E2A": "This provider ID is reserved; choose another",
  "\u7F3A\u5C11 Base URL": "Base URL is required",
  "Base URL \u8FC7\u957F": "Base URL is too long",
  "Base URL \u4E0D\u662F\u5408\u6CD5\u5730\u5740": "Base URL is not a valid address",
  "Base URL \u53EA\u652F\u6301 http / https": "Base URL must use http or https",
  "Base URL \u4E0D\u80FD\u5305\u542B\u7528\u6237\u540D\u6216\u5BC6\u7801\uFF0C\u8BF7\u628A\u5BC6\u94A5\u586B\u5728 API Key": "Base URL must not contain a username or password; put the key in API Key",
  "\u4E0D\u652F\u6301\u7684 API \u7C7B\u578B\uFF1A{api}": "Unsupported API type: {api}",
  "{label} \u4E0D\u80FD\u5305\u542B\u6362\u884C": "{label} must not contain line breaks",
  "{label} \u8FC7\u957F": "{label} is too long",
  "\u6A21\u578B ID \u4E3A\u7A7A": "Model ID is empty",
  "\u6A21\u578B ID \u8FC7\u957F\uFF1A{id}": "Model ID is too long: {id}",
  "\u6A21\u578B ID \u542B\u63A7\u5236\u5B57\u7B26\uFF1A{id}": "Model ID contains control characters: {id}",
  "\u7B2C {line} \u884C\u6A21\u578B\u91CD\u590D\uFF1A{id}": "Line {line}: duplicate model {id}",
  "\u7B2C {line} \u884C\u4E0A\u4E0B\u6587\u7A97\u53E3\u4E0D\u662F\u6B63\u6574\u6570\uFF1A{value}": "Line {line}: context window is not a positive integer: {value}",
  "\u7B2C {line} \u884C\u300C\u662F\u5426\u601D\u8003\u300D\u53EA\u80FD\u662F true / false": "Line {line}: reasoning flag must be true or false",
  "\u81F3\u5C11\u586B\u5199\u4E00\u4E2A\u6A21\u578B ID": "Enter at least one model ID",
  "\u7B2C {line} \u884C\u8BF7\u6C42\u5934\u683C\u5F0F\u5E94\u4E3A Key: Value": "Line {line}: header must be in Key: Value form",
  "\u7B2C {line} \u884C\u8BF7\u6C42\u5934\u540D\u79F0\u4E0D\u5408\u6CD5\uFF1A{name}": "Line {line}: invalid header name: {name}",
  "\u7B2C {line} \u884C\u8BF7\u6C42\u5934\u503C\u4E0D\u80FD\u5305\u542B\u6362\u884C": "Line {line}: header value must not contain line breaks",
  "\u4E0D\u5141\u8BB8\u81EA\u5B9A\u4E49 {name} \u8BF7\u6C42\u5934": "Custom header {name} is not allowed",
  "models.json \u89E3\u6790\u5931\u8D25\uFF0C\u672A\u5199\u5165\uFF1A{error}": "Failed to parse models.json; nothing was written: {error}",
  "models.json \u5DF2\u4FDD\u5B58\uFF0C\u4F46\u5BC6\u94A5\u5199\u5165\u5931\u8D25\uFF1A{error}": "models.json was saved, but writing the key failed: {error}",
  "models.json \u89E3\u6790\u5931\u8D25\uFF0C\u672A\u5220\u9664\uFF1A{error}": "Failed to parse models.json; nothing was deleted: {error}",
  "\u81EA\u5B9A\u4E49 provider {id} \u4E0D\u5B58\u5728": "Custom provider {id} does not exist",
  "\u81EA\u5B9A\u4E49 provider \u5DF2\u5220\u9664\uFF0C\u4F46 settings.json \u89E3\u6790\u5931\u8D25\uFF0C\u9ED8\u8BA4\u6A21\u578B\u672A\u6E05\u7406\u3002": "The custom provider was deleted, but settings.json could not be parsed; the default model was not cleaned up.",
  "auth.json \u89E3\u6790\u5931\u8D25\uFF0C\u672A\u5199\u5165\uFF1A{error}": "Failed to parse auth.json; nothing was written: {error}",
  "\u8BE5 provider \u7684\u5BC6\u94A5\u7531\u547D\u4EE4\u8BFB\u53D6\uFF0C\u5DE5\u4F5C\u53F0\u4E0D\u4F1A\u6267\u884C\u547D\u4EE4\uFF1B\u6D4B\u8BD5\u8FDE\u63A5\u8BF7\u4E34\u65F6\u586B\u5199 API Key\u3002": "This provider reads its key from a command; the workbench will not run commands. Enter an API Key temporarily to test the connection.",
  "\u73AF\u5883\u53D8\u91CF {name} \u672A\u8BBE\u7F6E\u3002": "Environment variable {name} is not set.",
  "\u5BC6\u94A5\u88AB\u62D2\u7EDD\uFF08401\uFF09\uFF0C\u8BF7\u68C0\u67E5 API Key": "Key rejected (401); check the API Key",
  "\u6CA1\u6709\u6743\u9650\uFF08403\uFF09\uFF0C\u8BF7\u68C0\u67E5\u5BC6\u94A5\u6743\u9650\u6216 IP \u767D\u540D\u5355": "Permission denied (403); check key permissions or the IP allowlist",
  "\u63A5\u53E3\u4E0D\u5B58\u5728\uFF08404\uFF09\uFF0C\u8BF7\u68C0\u67E5 Base URL": "Endpoint not found (404); check the Base URL",
  "\u8BF7\u6C42\u88AB\u9650\u6D41\uFF08429\uFF09\uFF0C\u7A0D\u540E\u518D\u8BD5": "Rate limited (429); try again later",
  "\u670D\u52A1\u7AEF\u9519\u8BEF\uFF08{status}\uFF09": "Server error ({status})",
  "\u8BF7\u6C42\u5931\u8D25\uFF08HTTP {status}\uFF09": "Request failed (HTTP {status})",
  "\u7AEF\u70B9\u53EF\u8FBE\uFF0C\u4F46\u6CA1\u6709 /models \u63A5\u53E3\uFF1B\u8BF7\u624B\u52A8\u586B\u5199\u6A21\u578B ID\u3002": "Endpoint reachable, but it has no /models endpoint; enter model IDs manually.",
  "\u7AEF\u70B9\u53EF\u8FBE\uFF0C\u4F46\u8FD4\u56DE\u7684\u4E0D\u662F JSON \u6A21\u578B\u5217\u8868\uFF1B\u8BF7\u624B\u52A8\u586B\u5199\u6A21\u578B ID\u3002": "Endpoint reachable, but it did not return a JSON model list; enter model IDs manually.",
  "\u7AEF\u70B9\u53EF\u8FBE\uFF0C\u4F46\u54CD\u5E94\u91CC\u6CA1\u6709\u6A21\u578B\u5217\u8868\uFF1B\u8BF7\u624B\u52A8\u586B\u5199\u6A21\u578B ID\u3002": "Endpoint reachable, but the response contains no model list; enter model IDs manually.",
  "\u8FDE\u63A5\u8D85\u65F6\uFF0810 \u79D2\uFF09\uFF0C\u8BF7\u68C0\u67E5 Base URL\u3001\u7F51\u7EDC\u6216\u4EE3\u7406": "Connection timed out (10s); check the Base URL, network or proxy",
  "\u57DF\u540D\u89E3\u6790\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5 Base URL": "DNS lookup failed; check the Base URL",
  "\u8FDE\u63A5\u88AB\u62D2\u7EDD\uFF0C\u670D\u52A1\u672A\u542F\u52A8\u6216\u7AEF\u53E3\u4E0D\u5BF9": "Connection refused; the service is not running or the port is wrong",
  "TLS \u8BC1\u4E66\u6821\u9A8C\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u4E2D\u8F6C\u7AD9\u8BC1\u4E66": "TLS certificate verification failed; check the relay certificate",
  "\u8FDE\u63A5\u5931\u8D25\uFF1A{error}": "Connection failed: {error}",
  "\u7F3A\u5C11 provider \u6216\u6A21\u578B": "Provider or model is missing",
  "provider \u6216\u6A21\u578B\u540D\u79F0\u8FC7\u957F": "Provider or model name is too long",
  "\u540D\u79F0\u542B\u63A7\u5236\u5B57\u7B26": "Name contains control characters",
  "settings.json \u89E3\u6790\u5931\u8D25\uFF0C\u672A\u5199\u5165\uFF1A{error}": "Failed to parse settings.json; nothing was written: {error}",
  "\u672A\u77E5\u9519\u8BEF": "Unknown error",
  "\u672A\u627E\u5230 npm\uFF1B\u8BF7\u5148\u5B89\u88C5 Node.js": "npm not found; install Node.js first",
  "\u672A\u627E\u5230 npm\uFF1B\u8BF7\u5148\u5B89\u88C5 Node.js\uFF08\u542B npm\uFF09": "npm not found; install Node.js (with npm) first",
  "\u521B\u5EFA\u5FEB\u6377\u65B9\u5F0F\u5931\u8D25": "Failed to create shortcut",
  "macOS \u8BF7\u4ECE\u300C\u5E94\u7528\u7A0B\u5E8F\u300D\u6587\u4EF6\u5939\u542F\u52A8": "On macOS, launch from the Applications folder",
  "\u672A\u627E\u5230 Pi \u5B89\u88C5\uFF1B\u8BF7\u70B9\u51FB\u300C\u4E00\u952E\u914D\u7F6E\u73AF\u5883\u300D\u6216\u8FD0\u884C npm install -g @earendil-works/pi-coding-agent": 'Pi is not installed; use "Set up environment" or run npm install -g @earendil-works/pi-coding-agent',
  // automation / agents / local tools
  "\u547D\u4EE4\u6267\u884C\u8D85\u65F6\uFF0C\u5DF2\u7EC8\u6B62": "Command timed out and was terminated",
  "\u547D\u4EE4\u5DF2\u5B8C\u6210\uFF08\u65E0\u8F93\u51FA\uFF09": "Command finished (no output)",
  "\u53EA\u652F\u6301 http / https \u94FE\u63A5": "Only http / https links are supported",
  "\u672A\u8BBE\u7F6E\u9879\u76EE\u76EE\u5F55": "No project directory set",
  "Pi \u542F\u52A8\u5931\u8D25": "Failed to start Pi",
  "Pi \u672A\u8FD0\u884C": "Pi is not running",
  "\u5DF2\u53D1\u9001\u5230 Pi \u7EC8\u7AEF": "Sent to the Pi terminal",
  "\u672A\u77E5\u52A8\u4F5C": "Unknown action",
  "\u53C2\u6570\u65E0\u6548": "Invalid parameters",
  "\u672A\u77E5\u5E94\u7528": "Unknown app",
  "\u8BE5\u5E73\u53F0\u6682\u672A\u5185\u7F6E\u6B64\u5E94\u7528\uFF0C\u8BF7\u7528\u300C\u6253\u5F00\u8DEF\u5F84\u300D": 'This app is not built in on this platform; use "Open path"',
  "\u4EFB\u52A1\u914D\u7F6E\u65E0\u6548": "Invalid job configuration",
  "\u586B\u5199\u4EFB\u52A1\u540D\u79F0": "Enter a job name",
  "\u4EFB\u52A1\u540D\u79F0\u8FC7\u957F": "Job name is too long",
  "\u9009\u62E9\u6267\u884C\u5468\u671F": "Choose a schedule",
  "\u95F4\u9694\u9700\u5728 1 \u5206\u949F\u5230 7 \u5929\u4E4B\u95F4": "Interval must be between 1 minute and 7 days",
  "\u65F6\u95F4\u683C\u5F0F\u5E94\u4E3A HH:MM": "Time must be HH:MM",
  "\u81F3\u5C11\u9009\u62E9\u4E00\u5929": "Select at least one day",
  "cron \u8868\u8FBE\u5F0F\u65E0\u6548\uFF085 \u6BB5\uFF1A\u5206 \u65F6 \u65E5 \u6708 \u5468\uFF09": "Invalid cron expression (5 fields: min hour day month weekday)",
  "\u586B\u5199\u63D0\u793A\u8BCD": "Enter a prompt",
  "\u63D0\u793A\u8BCD\u8FC7\u957F": "Prompt is too long",
  "\u586B\u5199\u547D\u4EE4": "Enter a command",
  "\u547D\u4EE4\u8FC7\u957F": "Command is too long",
  "\u94FE\u63A5\u8FC7\u957F": "URL is too long",
  "\u586B\u5199\u8DEF\u5F84": "Enter a path",
  "\u586B\u5199\u901A\u77E5\u6807\u9898": "Enter a notification title",
  "\u9009\u62E9 Agent": "Select an agent",
  "\u9009\u62E9\u52A8\u4F5C\u7C7B\u578B": "Select an action type",
  "\u4EFB\u52A1\u6570\u91CF\u5DF2\u8FBE\u4E0A\u9650": "Job limit reached",
  "\u4EFB\u52A1\u4E0D\u5B58\u5728": "Job not found",
  "\u901A\u9053\u914D\u7F6E\u65E0\u6548": "Invalid channel configuration",
  "\u586B\u5199\u901A\u9053\u540D\u79F0": "Enter a channel name",
  "\u9009\u62E9\u901A\u9053\u7C7B\u578B": "Select a channel type",
  "\u586B\u5199 Telegram Bot Token": "Enter a Telegram bot token",
  "Webhook \u9700\u4E3A http / https \u5730\u5740": "Webhook must be an http / https URL",
  "\u5730\u5740\u8FC7\u957F": "URL is too long",
  "\u901A\u9053\u6570\u91CF\u5DF2\u8FBE\u4E0A\u9650": "Channel limit reached",
  "\u901A\u9053\u4E0D\u5B58\u5728": "Channel not found",
  "Pi \u5DE5\u4F5C\u53F0\u6D4B\u8BD5\u6D88\u606F": "Pi Workbench test message",
  "\u4EFB\u52A1\u6B63\u5728\u6267\u884C": "Job is already running",
  "\u6267\u884C\u5668\u672A\u5C31\u7EEA": "Executor is not ready",
  "\u6267\u884C\u6210\u529F": "Finished successfully",
  "\u6267\u884C\u5931\u8D25": "Execution failed",
  "\u6D88\u606F\u5DF2\u53D1\u9001": "Message sent",
  "\u53D1\u9001\u5931\u8D25\uFF08HTTP {status}\uFF09": "Send failed (HTTP {status})",
  "\u63D0\u793A\u8BCD\u4E3A\u7A7A": "Prompt is empty",
  "\u672A\u77E5 Agent": "Unknown agent",
  "\u672A\u68C0\u6D4B\u5230 {name}\uFF0C\u8BF7\u5148\u5B89\u88C5": "{name} not found; install it first",
  "{name} \u4EC5\u652F\u6301\u684C\u9762\u5E94\u7528\uFF0C\u65E0\u6CD5\u81EA\u52A8\u6267\u884C": "{name} is a desktop app only and cannot run automatically",
  "\u672A\u68C0\u6D4B\u5230 {name} \u684C\u9762\u7248": "{name} desktop app not found",
  "\u5DF2\u6253\u5F00 {name}\uFF0C\u4EFB\u52A1\u5DF2\u590D\u5236\u5230\u526A\u8D34\u677F\uFF0C\u8BF7\u5728\u5E94\u7528\u4E2D\u7C98\u8D34\u6267\u884C\u3002": "Opened {name}; the task is on the clipboard \u2014 paste it in the app to run.",
  "\u4E3B\u7BA1\u5FC5\u987B\u652F\u6301\u547D\u4EE4\u884C\u6267\u884C\uFF0C\u8BF7\u5148\u5B89\u88C5\u8BE5 Agent \u7684 CLI": "The supervisor must support command-line runs; install its CLI first",
  "\u6CA1\u6709\u53EF\u81EA\u52A8\u6267\u884C\u7684\u4E3B\u7BA1\uFF1B\u8BF7\u5B89\u88C5 CLI \u6216\u9009\u62E9\u5176\u4ED6 Agent": "No supervisor can run automatically; install a CLI or pick another agent",
  "\u6682\u65E0\u53EF\u81EA\u52A8\u6267\u884C\u7684\u4E3B\u7BA1": "No supervisor can run automatically",
  "\u672A\u68C0\u6D4B\u5230\u5DF2\u5B89\u88C5\u7684 Agent": "No installed agent detected",
  "\u540C\u65F6\u8FD0\u884C\u7684\u4EFB\u52A1\u8FC7\u591A\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5": "Too many tasks running; try again later",
  "\u8BE5 Agent \u6682\u4E0D\u652F\u6301\u547D\u4EE4\u884C\u8C03\u7528": "This agent does not support command-line runs",
  "\u6267\u884C\u8D85\u65F6\uFF0C\u5DF2\u7EC8\u6B62": "Execution timed out and was terminated",
  "\u8FDB\u7A0B\u9000\u51FA\u7801 {code}": "Process exit code {code}",
  "\u586B\u5199\u534F\u4F5C\u4EFB\u52A1": "Enter a team task",
  "\u672A\u68C0\u6D4B\u5230\u4EFB\u4F55\u53EF\u7528 Agent": "No available agent detected",
  "\u6240\u9009 Agent \u4E0D\u53EF\u7528": "The selected agent is unavailable",
  "\u81EA\u5B9A\u4E49 Agent \u5B58\u50A8\u5C1A\u672A\u521D\u59CB\u5316": "Custom agent storage is not ready",
  "\u81EA\u5B9A\u4E49 Agent \u6570\u91CF\u5DF2\u8FBE\u4E0A\u9650\uFF08{count}\uFF09": "Custom agent limit reached ({count})",
  "\u586B\u5199\u540D\u79F0\u4E0E\u53EF\u6267\u884C\u547D\u4EE4": "Enter a name and executable command",
  "\u547D\u4EE4\u53EA\u586B\u5199\u53EF\u6267\u884C\u6587\u4EF6\u6216\u8DEF\u5F84\uFF0C\u4E0D\u8981\u5305\u542B shell \u7B26\u53F7": "Enter only an executable or path; shell symbols are not allowed",
  "\u8FD0\u884C\u53C2\u6570\u81F3\u5C11\u9700\u8981\u4E00\u5904 {prompt} \u5360\u4F4D": "Arguments need at least one {prompt} placeholder",
  "\u540C\u540D\u81EA\u5B9A\u4E49 Agent \u8FC7\u591A": "Too many custom agents with the same name",
  "\u672A\u627E\u5230\u81EA\u5B9A\u4E49 Agent": "Custom agent not found",
  "\u8BF7\u586B\u5199\u5E94\u7528\u540D\u79F0": "Enter an app name",
  "\u5E94\u7528\u540D\u79F0\u8FC7\u957F": "App name is too long",
  "\u8BF7\u9009\u62E9\u5E94\u7528\u5206\u7C7B": "Choose an app category",
  "\u8BF7\u9009\u62E9\u53EF\u6267\u884C\u6587\u4EF6": "Choose an executable",
  "\u53EF\u6267\u884C\u6587\u4EF6\u4E0D\u5B58\u5728": "Executable not found",
  "\u8BF7\u9009\u62E9 .exe \u53EF\u6267\u884C\u6587\u4EF6": "Choose an .exe executable",
  "\u81EA\u5B9A\u4E49\u5E94\u7528\u5DF2\u8FBE\u4E0A\u9650\uFF08{n} \u4E2A\uFF09": "Custom app limit reached ({n})",
  "\u8BE5\u7A0B\u5E8F\u5DF2\u5728\u5185\u7F6E\u5217\u8868\u4E2D": "This program is already in the built-in list",
  "\u672A\u627E\u5230\u8BE5\u5E94\u7528": "App not found",
  "\u5F00\u59CB\u83DC\u5355\u626B\u63CF": "Start menu scan",
  "\u8BE5\u5E94\u7528\u6CA1\u6709\u5185\u7F6E\u5B89\u88C5\u6E90": "This app has no built-in install source",
  "\u672A\u627E\u5230 winget\uFF0C\u8BF7\u5148\u5B89\u88C5\u300C\u5E94\u7528\u5B89\u88C5\u7A0B\u5E8F\u300D": "winget not found; install App Installer first",
  "\u5B89\u88C5\u5931\u8D25\uFF0C\u9000\u51FA\u7801 {code}": "Installation failed with exit code {code}",
  "\u5B89\u88C5\u8D85\u65F6\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5": "Installation timed out; try again later",
  "\u7A0B\u5E8F\u4E0D\u5B58\u5728\uFF0C\u8BF7\u91CD\u65B0\u626B\u63CF": "The program no longer exists; scan again",
  "\u672A\u627E\u5230\u8BE5\u7F51\u7AD9": "Website not found",
  "\u7F51\u7AD9\u540D\u79F0\u8FC7\u957F": "Website name is too long",
  "\u81EA\u5B9A\u4E49\u7F51\u7AD9\u5DF2\u8FBE\u4E0A\u9650\uFF08{n} \u4E2A\uFF09": "Custom website limit reached ({n})",
  "\u8BF7\u586B\u5199\u7F51\u7AD9\u540D\u79F0": "Enter a website name",
  "\u4FDD\u5B58\u5931\u8D25": "Save failed",
  "\u53EF\u6267\u884C\u6587\u4EF6": "Executable",
  "\u9009\u62E9\u53EF\u6267\u884C\u6587\u4EF6": "Choose an executable",
  "\u9009\u62E9\u8981\u5206\u6790\u7684\u6587\u4EF6\u6216\u76EE\u5F55": "Choose a file or folder to analyze",
  "\u641C\u7D22\u670D\u52A1\u8FD4\u56DE {status}": "Search service returned {status}",
  "\u672A\u547D\u540D\u7ED3\u679C": "Untitled result",
  "\u8054\u7F51\u641C\u7D22\u672A\u5F00\u542F": "Web search is disabled",
  "\u586B\u5199\u641C\u7D22\u5185\u5BB9": "Enter a search query",
  "\u6CA1\u6709\u627E\u5230\u76F8\u5173\u7ED3\u679C": "No matching results",
  "\u7F51\u9875\u6293\u53D6\u672A\u5F00\u542F": "Page crawling is disabled",
  "\u8BE5\u94FE\u63A5\u4E0D\u662F\u7F51\u9875\u6B63\u6587": "This link is not page content",
  "robots.txt \u4E0D\u5141\u8BB8\u6293\u53D6\u8BE5\u8DEF\u5F84": "robots.txt disallows this path",
  "\u9006\u5411\u5206\u6790\u672A\u5F00\u542F": "Reverse analysis is disabled",
  "\u7C7B\u578B": "Type",
  "\u76EE\u5F55": "Folder",
  "\u8DEF\u5F84": "Path",
  "\u6587\u4EF6\u6570": "File count",
  "\u9876\u5C42\u76EE\u5F55": "Top-level folders",
  "\u4E3B\u8981\u7C7B\u578B": "Main file types",
  "\u9879\u76EE\u6E05\u5355": "Project manifests",
  "\u65E0": "None",
  "\u672A\u53D1\u73B0": "Not found",
  "\u5927\u5C0F": "Size",
  "\u6587\u4EF6\u5934": "File header",
  "\u53EF\u6253\u5370\u5B57\u7B26\u4E32": "Printable strings"
};
var current = "zh-CN";
function t(source, vars) {
  const base = current === "en" ? EN[source] ?? source : source;
  if (!vars) return base;
  return base.replace(/\{(\w+)\}/g, (match, key) => Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match);
}

// backend/habits.ts
var HABIT_TYPES = ["model", "permission", "autopilot", "memory-scope", "language"];
var MAX_VALUES_PER_TYPE = 40;
var MAX_VALUE_CHARS = 100;
function memoryRoot() {
  return path2.join(realAgentDir(), "workbench-memory");
}
function habitsFile() {
  return path2.join(memoryRoot(), "habits.json");
}
function profileFile() {
  return path2.join(memoryRoot(), "profile.md");
}
function emptyFile() {
  return { version: 1, updatedAt: "", habits: {} };
}
function readFile() {
  try {
    const raw = JSON.parse(readFileSync(habitsFile(), "utf8"));
    if (!raw || typeof raw !== "object" || typeof raw.habits !== "object" || !raw.habits) return emptyFile();
    return { version: 1, updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : "", habits: raw.habits };
  } catch {
    return emptyFile();
  }
}
function cleanValue(value) {
  if (typeof value !== "string") return "";
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, MAX_VALUE_CHARS);
}
function cleanTask(task) {
  const value = cleanValue(task);
  return value ? value.slice(0, 40) : void 0;
}
function trimType(entries) {
  const pairs = Object.entries(entries).sort((left, right) => right[1].count - left[1].count || right[1].lastAt.localeCompare(left[1].lastAt)).slice(0, MAX_VALUES_PER_TYPE);
  return Object.fromEntries(pairs);
}
function recordHabit(input) {
  const data = input ?? {};
  const type = HABIT_TYPES.includes(data.type) ? data.type : null;
  const value = cleanValue(data.value);
  if (!type || !value) return { ok: false, error: t("\u65E0\u6548\u7684\u4E60\u60EF\u8BB0\u5F55") };
  const file = readFile();
  const bucket = file.habits[type] ?? {};
  const previous = bucket[value];
  bucket[value] = {
    count: (previous?.count ?? 0) + 1,
    lastAt: (/* @__PURE__ */ new Date()).toISOString(),
    ...cleanTask(data.task) ? { task: cleanTask(data.task) } : previous?.task ? { task: previous.task } : {}
  };
  file.habits[type] = trimType(bucket);
  file.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  try {
    mkdirSync(memoryRoot(), { recursive: true });
    writeFileSync(habitsFile(), `${JSON.stringify(file, null, 2)}
`, "utf8");
    writeProfile(file);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
var TYPE_LABELS = {
  model: "\u5E38\u7528\u6A21\u578B",
  permission: "\u6743\u9650\u4E60\u60EF",
  autopilot: "\u6258\u7BA1\u4E60\u60EF",
  "memory-scope": "\u8BB0\u5FC6\u68C0\u7D22\u8303\u56F4",
  language: "\u754C\u9762\u8BED\u8A00"
};
function writeProfile(file) {
  const lines = [
    "# \u7528\u6237\u504F\u597D\u753B\u50CF",
    "",
    "> \u7531 Pi \u5DE5\u4F5C\u53F0\u5728\u672C\u673A\u81EA\u52A8\u7EDF\u8BA1\uFF0C\u53EA\u5305\u542B\u64CD\u4F5C\u504F\u597D\uFF0C\u4E0D\u542B\u5BF9\u8BDD\u5185\u5BB9\u3001\u8D26\u53F7\u6216\u5BC6\u94A5\u3002",
    `> \u66F4\u65B0\u65F6\u95F4\uFF1A${file.updatedAt || "\u2014"}`,
    "",
    "\u4F7F\u7528\u65B9\u5F0F\uFF1A\u5148\u6309\u4E0B\u9762\u7684\u4E60\u60EF\u7ED9\u51FA\u9ED8\u8BA4\u65B9\u6848\uFF1B\u7528\u6237\u5F53\u524D\u660E\u786E\u6307\u4EE4\u4E0E\u4E60\u60EF\u51B2\u7A81\u65F6\uFF0C\u4EE5\u5F53\u524D\u6307\u4EE4\u4E3A\u51C6\u3002",
    ""
  ];
  let hasAny = false;
  for (const type of HABIT_TYPES) {
    const bucket = file.habits[type];
    if (!bucket || !Object.keys(bucket).length) continue;
    hasAny = true;
    lines.push(`## ${TYPE_LABELS[type]}`, "");
    const pairs = Object.entries(bucket).sort((left, right) => right[1].count - left[1].count || right[1].lastAt.localeCompare(left[1].lastAt)).slice(0, 5);
    for (const [value, item] of pairs) {
      const task = item.task ? `\uFF08\u6700\u8FD1\u7528\u4E8E ${item.task}\uFF09` : "";
      lines.push(`- ${value}\uFF1A${item.count} \u6B21${task}`);
    }
    lines.push("");
  }
  if (!hasAny) {
    lines.push("\u8FD8\u6CA1\u6709\u8DB3\u591F\u7684\u64CD\u4F5C\u8BB0\u5F55\u3002\u968F\u7740\u4F7F\u7528\u4F1A\u81EA\u52A8\u79EF\u7D2F\u3002", "");
  }
  writeFileSync(profileFile(), `${lines.join("\n")}
`, "utf8");
}
function habitSummary() {
  const file = readFile();
  const top = [];
  for (const type of HABIT_TYPES) {
    const bucket = file.habits[type];
    if (!bucket) continue;
    for (const [value, item] of Object.entries(bucket)) {
      top.push({ type, value, count: item.count, lastAt: item.lastAt, ...item.task ? { task: item.task } : {} });
    }
  }
  top.sort((left, right) => right.count - left.count || right.lastAt.localeCompare(left.lastAt));
  try {
    if (!existsSync(profileFile())) writeProfile(file);
  } catch {
  }
  return {
    ok: true,
    updatedAt: file.updatedAt,
    top: top.slice(0, 12),
    profilePath: profileFile()
  };
}

// backend/memory.ts
import {
  existsSync as existsSync2,
  mkdirSync as mkdirSync2,
  readFileSync as readFileSync2,
  statSync,
  writeFileSync as writeFileSync2
} from "node:fs";
import path3 from "node:path";
var MAX_INDEX_BYTES = 48 * 1024 * 1024;
var MAX_SESSION_BYTES = 8 * 1024 * 1024;
var SKILL_MARKER = "<!-- workbench-managed: 2 -->";
var SKILL_BODY = `${SKILL_MARKER}
---
name: workbench-memory
description: \u68C0\u7D22\u672C\u673A\u5DE5\u4F5C\u53F0\u4FDD\u5B58\u7684\u957F\u671F\u8BB0\u5FC6\uFF08\u5386\u53F2\u4F1A\u8BDD\u3001\u9879\u76EE\u51B3\u7B56\u3001\u7528\u6237\u4E60\u60EF\u4E0E\u4EE3\u7801\u7247\u6BB5\uFF09\u3002\u9700\u8981\u56DE\u5FC6\u8FC7\u53BB\u4E0A\u4E0B\u6587\u6216\u6309\u7528\u6237\u4E60\u60EF\u5DE5\u4F5C\u65F6\u4F7F\u7528\u3002
---

# \u5DE5\u4F5C\u53F0\u957F\u671F\u8BB0\u5FC6

\u672C\u673A\u79BB\u7EBF\u8BB0\u5FC6\u5E93\u7531 Pi \u5DE5\u4F5C\u53F0\u7EF4\u62A4\uFF0C\u6570\u636E\u53EA\u4FDD\u5B58\u5728\u672C\u673A\uFF0C\u4E0D\u8054\u7F51\u3002

## \u7528\u6237\u504F\u597D\u753B\u50CF

\u5DE5\u4F5C\u53F0\u4F1A\u628A\u7528\u6237\u7684\u64CD\u4F5C\u4E60\u60EF\u6C47\u603B\u5230 \`__PROFILE__\`\u3002\u5728\u5F00\u59CB\u4EFB\u52A1\u3001\u9009\u62E9\u6A21\u578B\u6216\u8C03\u6574\u6743\u9650\u524D\u5148\u8BFB\u4E00\u6B21\uFF0C
\u6309\u753B\u50CF\u91CC\u7684\u504F\u597D\u7ED9\u51FA\u9ED8\u8BA4\u65B9\u6848\uFF1B\u7528\u6237\u5F53\u524D\u660E\u786E\u6307\u4EE4\u4E0E\u753B\u50CF\u51B2\u7A81\u65F6\uFF0C\u4EE5\u5F53\u524D\u6307\u4EE4\u4E3A\u51C6\u3002

## \u4F55\u65F6\u4F7F\u7528

- \u7528\u6237\u63D0\u5230\u201C\u4E4B\u524D\u8BF4\u8FC7 / \u4E0A\u6B21\u7684\u51B3\u5B9A / \u7EE7\u7EED\u90A3\u4E2A\u4EFB\u52A1\u201D\uFF0C\u800C\u5F53\u524D\u4E0A\u4E0B\u6587\u91CC\u6CA1\u6709\u7EC6\u8282\u3002
- \u9700\u8981\u67E5\u5386\u53F2\u62A5\u9519\u3001\u547D\u4EE4\u3001\u6587\u4EF6\u8DEF\u5F84\u6216\u8BBE\u8BA1\u51B3\u7B56\u3002
- \u9700\u8981\u5224\u65AD\u7528\u6237\u4E60\u60EF\uFF08\u5E38\u7528\u6A21\u578B\u3001\u6743\u9650\u677E\u7D27\u3001\u6258\u7BA1\u65B9\u5F0F\uFF09\u4EE5\u4E3B\u52A8\u7ED9\u51FA\u5408\u9002\u65B9\u6848\u3002

## \u5982\u4F55\u68C0\u7D22

\u8FD0\u884C\u4E0B\u9762\u7684\u547D\u4EE4\uFF08\u628A\u67E5\u8BE2\u8BCD\u66FF\u6362\u4E3A\u5177\u4F53\u5173\u952E\u8BCD\uFF09\uFF1A

\`\`\`bash
node "__RECALL__" "\u67E5\u8BE2\u8BCD"
\`\`\`

- \u9ED8\u8BA4\u53EA\u641C\u5F53\u524D\u9879\u76EE\uFF1B\u52A0 \`--all\` \u641C\u7D22\u5168\u90E8\u9879\u76EE\u3002
- \u8F93\u51FA\u662F JSON\uFF0C\u6309\u76F8\u5173\u5EA6\u6392\u5E8F\uFF0C\u6BCF\u6761\u5305\u542B\u65F6\u95F4\u3001\u89D2\u8272\u3001\u9879\u76EE\u548C\u6587\u672C\u7247\u6BB5\u3002
- \u53EA\u5F15\u7528\u4E0E\u5F53\u524D\u4EFB\u52A1\u76F8\u5173\u7684\u5185\u5BB9\uFF1B\u4E0D\u8981\u628A\u65E0\u5173\u5386\u53F2\u585E\u8FDB\u56DE\u7B54\u3002
- \u8BB0\u5FC6\u662F\u5386\u53F2\u5FEB\u7167\uFF0C\u53EF\u80FD\u4E0E\u5F53\u524D\u4EE3\u7801\u4E0D\u4E00\u81F4\uFF1B\u4EE5\u5F53\u524D\u6587\u4EF6\u4E3A\u51C6\u3002

## \u7EF4\u62A4

- \u5DE5\u4F5C\u4F1A\u8BAE\u53F0\u300C\u957F\u671F\u8BB0\u5FC6\u300D\u680F\u7684\u300C\u6444\u53D6\u4F1A\u8BDD\u300D\u589E\u91CF\u66F4\u65B0\uFF0C\u4E0D\u4F1A\u8C03\u7528\u6A21\u578B\u3001\u4E0D\u4EA7\u751F\u8D39\u7528\u3002
- \u5982\u9700\u6E05\u9664\u8BB0\u5FC6\uFF0C\u5220\u9664 \`~/.pi/agent/workbench-memory/entries.jsonl\`\u3002
`;
var RECALL_SCRIPT = `#!/usr/bin/env node
// \u5DE5\u4F5C\u53F0\u957F\u671F\u8BB0\u5FC6\u68C0\u7D22\u811A\u672C\uFF1A\u79BB\u7EBF\u8BFB\u53D6 entries.jsonl\uFF0C\u6309\u8BCD\u9891\u4E0E\u65F6\u95F4\u6392\u5E8F\u3002
import { readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const file = path.join(os.homedir(), '.pi', 'agent', 'workbench-memory', 'entries.jsonl');
const args = process.argv.slice(2);
const all = args.includes('--all');
const query = args.filter((item) => item !== '--all').join(' ').trim();
if (!query) {
  console.error('\u7528\u6CD5: node recall.mjs "\u67E5\u8BE2\u8BCD" [--all]');
  process.exit(2);
}

function tokens(text) {
  const lower = text.toLowerCase();
  const out = [];
  for (const word of lower.match(/[a-z0-9][a-z0-9_$./-]{1,}/g) || []) if (word.length <= 24) out.push(word);
  for (const run of lower.match(/[\\u4e00-\\u9fff]+/g) || []) {
    if (run.length === 1) out.push(run);
    else {
      for (let i = 0; i < run.length - 1; i += 1) out.push(run.slice(i, i + 2));
      if (run.length <= 4) out.push(run);
    }
  }
  return [...new Set(out)];
}

function count(text, needle) {
  let n = 0;
  let from = 0;
  while (n < 20) {
    const at = text.indexOf(needle, from);
    if (at < 0) break;
    n += 1;
    from = at + needle.length;
  }
  return n;
}

let entries = [];
try {
  entries = readFileSync(file, 'utf8').split(/\\r?\\n/).filter(Boolean).map((line) => JSON.parse(line));
} catch {
  console.log(JSON.stringify({ ok: true, hits: [], note: '\u8BB0\u5FC6\u5E93\u4E3A\u7A7A\uFF0C\u5148\u5728 Pi \u5DE5\u4F5C\u53F0\u6444\u53D6\u4F1A\u8BDD' }, null, 2));
  process.exit(0);
}
const cwd = process.cwd().toLowerCase();
const wanted = tokens(query);
const hits = [];
for (const entry of entries) {
  if (!all && entry.project && entry.project.toLowerCase() !== cwd) continue;
  const text = entry.text.toLowerCase();
  let score = 0;
  for (const token of wanted) {
    const n = count(text, token);
    if (n) score += n * (token.length > 1 ? 1.5 : 1);
  }
  if (text.includes(query.toLowerCase())) score += 12;
  if (!score) continue;
  hits.push({ timestamp: entry.timestamp, role: entry.role, project: entry.project, text: entry.text.slice(0, 700), score });
}
hits.sort((a, b) => b.score - a.score || String(b.timestamp).localeCompare(String(a.timestamp)));
console.log(JSON.stringify({ ok: true, query, hits: hits.slice(0, 12) }, null, 2));
`;
function installMemorySkill() {
  const root2 = path3.join(realAgentDir(), "skills", "workbench-memory");
  const recall = path3.join(root2, "recall.mjs");
  const profile2 = path3.join(realAgentDir(), "workbench-memory", "profile.md");
  try {
    mkdirSync2(root2, { recursive: true });
    writeFileSync2(recall, RECALL_SCRIPT, "utf8");
    writeFileSync2(
      path3.join(root2, "SKILL.md"),
      SKILL_BODY.replace("__RECALL__", recall).replace("__PROFILE__", profile2),
      "utf8"
    );
    return { ok: true, path: root2 };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
function ensureMemorySkill() {
  const file = memorySkillPath();
  try {
    if (existsSync2(file)) {
      const text = readFileSync2(file, "utf8");
      if (!text.includes("workbench-managed") && !text.includes("\u5DE5\u4F5C\u53F0\u957F\u671F\u8BB0\u5FC6")) {
        return { ok: true, path: path3.dirname(file) };
      }
    }
    return installMemorySkill();
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
function memorySkillPath() {
  return path3.join(realAgentDir(), "skills", "workbench-memory", "SKILL.md");
}

// .smoke/habits-check.ts
var root = mkdtempSync(path4.join(os2.tmpdir(), "pi-habits-check-"));
process.env.PI_DESKTOP_PI_AGENT_DIR = path4.join(root, "agent");
var failures = [];
var check = (condition, message) => {
  if (!condition) failures.push(message);
};
recordHabit({ type: "model", value: "openai/gpt-5", task: "coding" });
recordHabit({ type: "model", value: "openai/gpt-5", task: "coding" });
recordHabit({ type: "permission", value: "\u5B8C\u5168\u81EA\u52A8" });
recordHabit({ type: "bogus", value: "x" });
recordHabit({ type: "model", value: "line\nbreak	tab" });
var summary = habitSummary();
check(summary.ok, "summary ok");
var model = summary.top?.find((item) => item.type === "model" && item.value === "openai/gpt-5");
check(model?.count === 2, `model counted twice (${model?.count})`);
check(Boolean(summary.top?.some((item) => item.type === "permission" && item.value === "\u5B8C\u5168\u81EA\u52A8")), "permission habit recorded");
check(!summary.top?.some((item) => item.type === "bogus"), "invalid type ignored");
var profilePath = summary.profilePath ?? "";
check(existsSync3(profilePath), "profile written");
var profile = existsSync3(profilePath) ? readFileSync3(profilePath, "utf8") : "";
check(profile.includes("openai/gpt-5") && profile.includes("\u5B8C\u5168\u81EA\u52A8"), "profile lists habits");
check(!profile.includes("\nline"), "habit values are single-line");
var installed = ensureMemorySkill();
check(installed.ok, `skill auto-install (${installed.error ?? ""})`);
var skill = readFileSync3(memorySkillPath(), "utf8");
check(skill.includes("workbench-managed"), "skill carries managed marker");
check(skill.includes("profile.md"), "skill references the habit profile");
writeFileSync3(memorySkillPath(), "---\nname: workbench-memory\ndescription: custom\n---\n");
ensureMemorySkill();
var custom = readFileSync3(memorySkillPath(), "utf8");
check(!custom.includes("workbench-managed"), "custom skill is not overwritten");
rmSync(root, { recursive: true, force: true });
console.log(JSON.stringify({ failures }, null, 2));
if (failures.length) process.exitCode = 1;
