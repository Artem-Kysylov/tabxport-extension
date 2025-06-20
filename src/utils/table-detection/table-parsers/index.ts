import { TableParser } from "../types"
import { divTableParser } from "./div-parser"
import { htmlTableParser } from "./html-parser"
import { markdownTableParser } from "./markdown-parser"
import { textTableParser } from "./text-parser"

/**
 * List of all available table parsers in order of preference
 */
export const tableParsers: TableParser[] = [
  htmlTableParser, // Most reliable, try first
  markdownTableParser, // Next most structured
  divTableParser, // Less structured but common
  textTableParser // Most flexible but least reliable
]

export { htmlTableParser, markdownTableParser, divTableParser, textTableParser }
