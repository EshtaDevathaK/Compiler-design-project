export interface Token {
  type: string;
  value: string;
  line: number;
  column: number;
}

export class LexicalError extends Error {
  line: number;
  column: number;

  constructor(message: string, line: number, column: number) {
    super(message);
    this.name = "LexicalError";
    this.line = line;
    this.column = column;
  }
}

export class Lexer {
  private source: string;
  private position: number = 0;
  private line: number = 1;
  private column: number = 1;
  private tokens: Token[] = [];

  constructor(source: string) {
    this.source = source;
  }

  tokenize(): Token[] {
    this.tokens = [];
    this.position = 0;
    this.line = 1;
    this.column = 1;

    while (!this.isAtEnd()) {
      this.scanToken();
    }

    this.addToken("EOF", "");
    return this.tokens;
  }

  private scanToken(): void {
    const char = this.advance();

    switch (char) {
      case '(': this.addToken("LEFT_PAREN", char); break;
      case ')': this.addToken("RIGHT_PAREN", char); break;
      case '{': this.addToken("LEFT_BRACE", char); break;
      case '}': this.addToken("RIGHT_BRACE", char); break;
      case '[': this.addToken("LEFT_BRACKET", char); break;
      case ']': this.addToken("RIGHT_BRACKET", char); break;
      case ',': this.addToken("COMMA", char); break;
      case '.': this.addToken("DOT", char); break;
      case ';': this.addToken("SEMICOLON", char); break;
      case '+': this.addToken("PLUS", char); break;
      case '-': this.addToken("MINUS", char); break;
      case '*': this.addToken("STAR", char); break;
      case '/':
        if (this.match('/')) {
          // Comment until end of line
          while (this.peek() !== '\n' && !this.isAtEnd()) {
            this.advance();
          }
        } else {
          this.addToken("SLASH", char);
        }
        break;
      case '=':
        this.addToken(this.match('=') ? "EQUAL_EQUAL" : "EQUAL", this.match('=') ? "==" : "=");
        break;
      case '!':
        this.addToken(this.match('=') ? "BANG_EQUAL" : "BANG", this.match('=') ? "!=" : "!");
        break;
      case '<':
        this.addToken(this.match('=') ? "LESS_EQUAL" : "LESS", this.match('=') ? "<=" : "<");
        break;
      case '>':
        this.addToken(this.match('=') ? "GREATER_EQUAL" : "GREATER", this.match('=') ? ">=" : ">");
        break;
      case ' ':
      case '\r':
      case '\t':
        // Ignore whitespace
        break;
      case '\n':
        this.line++;
        this.column = 1;
        break;
      case '"':
        this.string();
        break;
      default:
        if (this.isDigit(char)) {
          this.number();
        } else if (this.isAlpha(char)) {
          this.identifier();
        } else {
          throw new LexicalError(`Unexpected character: ${char}`, this.line, this.column - 1);
        }
        break;
    }
  }

  private string(): void {
    const startColumn = this.column - 1;
    let value = "";

    while (this.peek() !== '"' && !this.isAtEnd()) {
      if (this.peek() === '\n') {
        this.line++;
        this.column = 1;
      }
      value += this.advance();
    }

    if (this.isAtEnd()) {
      throw new LexicalError("Unterminated string", this.line, startColumn);
    }

    // Consume the closing "
    this.advance();

    this.addToken("STRING", value);
  }

  private number(): void {
    let value = this.source[this.position - 1];

    while (this.isDigit(this.peek())) {
      value += this.advance();
    }

    // Look for decimal
    if (this.peek() === '.' && this.isDigit(this.peekNext())) {
      value += this.advance(); // Consume the '.'

      while (this.isDigit(this.peek())) {
        value += this.advance();
      }
    }

    this.addToken("NUMBER", value);
  }

  private identifier(): void {
    let value = this.source[this.position - 1];

    while (this.isAlphaNumeric(this.peek())) {
      value += this.advance();
    }

    // Check if it's a keyword
    const type = this.isKeyword(value) ? value.toUpperCase() : "IDENTIFIER";
    this.addToken(type, value);
  }

  private isKeyword(value: string): boolean {
    const keywords = [
      "if", "else", "while", "for", "return",
      "int", "float", "void", "string", "bool",
      "true", "false", "null", "function", "var"
    ];
    return keywords.includes(value);
  }

  private isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
  }

  private isAlpha(char: string): boolean {
    return (char >= 'a' && char <= 'z') ||
           (char >= 'A' && char <= 'Z') ||
           char === '_';
  }

  private isAlphaNumeric(char: string): boolean {
    return this.isAlpha(char) || this.isDigit(char);
  }

  private advance(): string {
    this.position++;
    this.column++;
    return this.source[this.position - 1];
  }

  private match(expected: string): boolean {
    if (this.isAtEnd()) return false;
    if (this.source[this.position] !== expected) return false;

    this.position++;
    this.column++;
    return true;
  }

  private peek(): string {
    if (this.isAtEnd()) return '\0';
    return this.source[this.position];
  }

  private peekNext(): string {
    if (this.position + 1 >= this.source.length) return '\0';
    return this.source[this.position + 1];
  }

  private isAtEnd(): boolean {
    return this.position >= this.source.length;
  }

  private addToken(type: string, value: string): void {
    this.tokens.push({
      type,
      value,
      line: this.line,
      column: this.column - value.length
    });
  }
}