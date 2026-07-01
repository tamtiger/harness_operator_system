export type SymbolType = 'class' | 'function' | 'interface' | 'type' | 'enum' | 'variable'
export type ReferenceType = 'import' | 'call' | 'inherit' | 'implement'

export interface CodeSymbol {
  id: string
  file_path: string
  symbol_name: string
  symbol_type: SymbolType
  start_line: number
  end_line: number
  parent_symbol_id: string | null
  language: string
  updated_at: string
}

export interface CodeReference {
  id: string
  symbol_id: string
  file_path: string
  line: number
  ref_type: ReferenceType
  updated_at: string
}
