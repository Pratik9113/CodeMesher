export interface SelectionRange {
    start_line: number;
    start_col: number;
    end_line: number;
    end_col: number;
}

export interface CursorPosition {
    line: number;
    column: number;
}

export interface EditorEdit {
    start_line: number;
    start_col: number;
    end_line: number;
    end_col: number;
    replacement: string;
}
