import { Token } from './Lexer';

export interface ASTNode {
  type: string;
  [key: string]: any;
}

export class SyntaxError extends Error {
  token: Token;

  constructor(message: string, token: Token) {
    super(message);
    this.name = "SyntaxError";
    this.token = token;
  }
}

export class Parser {
  private tokens: Token[] = [];
  private current: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): ASTNode {
    try {
      return this.program();
    } catch (error) {
      throw error;
    }
  }

  private program(): ASTNode {
    const statements: ASTNode[] = [];

    while (!this.isAtEnd()) {
      statements.push(this.declaration());
    }

    return { type: "Program", body: statements };
  }

  private declaration(): ASTNode {
    try {
      if (this.match("VAR")) return this.varDeclaration();
      if (this.match("FUNCTION")) return this.functionDeclaration();
      
      return this.statement();
    } catch (error) {
      this.synchronize();
      throw error;
    }
  }

  private varDeclaration(): ASTNode {
    const name = this.consume("IDENTIFIER", "Expect variable name.");
    
    let initializer = null;
    if (this.match("EQUAL")) {
      initializer = this.expression();
    }

    this.consume("SEMICOLON", "Expect ';' after variable declaration.");
    return {
      type: "VariableDeclaration",
      name: name.value,
      initializer
    };
  }

  private functionDeclaration(): ASTNode {
    const name = this.consume("IDENTIFIER", "Expect function name.");
    
    this.consume("LEFT_PAREN", "Expect '(' after function name.");
    const parameters: string[] = [];
    
    if (!this.check("RIGHT_PAREN")) {
      do {
        if (parameters.length >= 255) {
          this.error(this.peek(), "Cannot have more than 255 parameters.");
        }

        parameters.push(this.consume("IDENTIFIER", "Expect parameter name.").value);
      } while (this.match("COMMA"));
    }
    
    this.consume("RIGHT_PAREN", "Expect ')' after parameters.");
    
    this.consume("LEFT_BRACE", "Expect '{' before function body.");
    const body = this.block();
    
    return {
      type: "FunctionDeclaration",
      name: name.value,
      params: parameters,
      body
    };
  }

  private statement(): ASTNode {
    if (this.match("IF")) return this.ifStatement();
    if (this.match("WHILE")) return this.whileStatement();
    if (this.match("FOR")) return this.forStatement();
    if (this.match("RETURN")) return this.returnStatement();
    if (this.match("LEFT_BRACE")) return this.block();

    return this.expressionStatement();
  }

  private ifStatement(): ASTNode {
    this.consume("LEFT_PAREN", "Expect '(' after 'if'.");
    const condition = this.expression();
    this.consume("RIGHT_PAREN", "Expect ')' after if condition.");

    const thenBranch = this.statement();
    let elseBranch = null;

    if (this.match("ELSE")) {
      elseBranch = this.statement();
    }

    return {
      type: "IfStatement",
      condition,
      thenBranch,
      elseBranch
    };
  }

  private whileStatement(): ASTNode {
    this.consume("LEFT_PAREN", "Expect '(' after 'while'.");
    const condition = this.expression();
    this.consume("RIGHT_PAREN", "Expect ')' after condition.");
    const body = this.statement();

    return {
      type: "WhileStatement",
      condition,
      body
    };
  }

  private forStatement(): ASTNode {
    this.consume("LEFT_PAREN", "Expect '(' after 'for'.");

    let initializer;
    if (this.match("SEMICOLON")) {
      initializer = null;
    } else if (this.match("VAR")) {
      initializer = this.varDeclaration();
    } else {
      initializer = this.expressionStatement();
    }

    let condition = null;
    if (!this.check("SEMICOLON")) {
      condition = this.expression();
    }
    this.consume("SEMICOLON", "Expect ';' after loop condition.");

    let increment = null;
    if (!this.check("RIGHT_PAREN")) {
      increment = this.expression();
    }
    this.consume("RIGHT_PAREN", "Expect ')' after for clauses.");

    let body = this.statement();

    return {
      type: "ForStatement",
      initializer,
      condition,
      increment,
      body
    };
  }

  private returnStatement(): ASTNode {
    const keyword = this.previous();
    let value = null;

    if (!this.check("SEMICOLON")) {
      value = this.expression();
    }

    this.consume("SEMICOLON", "Expect ';' after return value.");
    
    return {
      type: "ReturnStatement",
      value
    };
  }

  private block(): ASTNode {
    const statements: ASTNode[] = [];

    while (!this.check("RIGHT_BRACE") && !this.isAtEnd()) {
      statements.push(this.declaration());
    }

    this.consume("RIGHT_BRACE", "Expect '}' after block.");
    
    return {
      type: "BlockStatement",
      body: statements
    };
  }

  private expressionStatement(): ASTNode {
    const expr = this.expression();
    this.consume("SEMICOLON", "Expect ';' after expression.");
    
    return {
      type: "ExpressionStatement",
      expression: expr
    };
  }

  private expression(): ASTNode {
    return this.assignment();
  }

  private assignment(): ASTNode {
    const expr = this.logicalOr();

    if (this.match("EQUAL")) {
      const equals = this.previous();
      const value = this.assignment();

      if (expr.type === "Identifier") {
        return {
          type: "AssignmentExpression",
          operator: "=",
          left: expr,
          right: value
        };
      }

      this.error(equals, "Invalid assignment target.");
    }

    return expr;
  }

  private logicalOr(): ASTNode {
    let expr = this.logicalAnd();

    while (this.match("OR")) {
      const operator = this.previous().value;
      const right = this.logicalAnd();
      expr = {
        type: "LogicalExpression",
        operator,
        left: expr,
        right
      };
    }

    return expr;
  }

  private logicalAnd(): ASTNode {
    let expr = this.equality();

    while (this.match("AND")) {
      const operator = this.previous().value;
      const right = this.equality();
      expr = {
        type: "LogicalExpression",
        operator,
        left: expr,
        right
      };
    }

    return expr;
  }

  private equality(): ASTNode {
    let expr = this.comparison();

    while (this.match("BANG_EQUAL", "EQUAL_EQUAL")) {
      const operator = this.previous().value;
      const right = this.comparison();
      expr = {
        type: "BinaryExpression",
        operator,
        left: expr,
        right
      };
    }

    return expr;
  }

  private comparison(): ASTNode {
    let expr = this.term();

    while (this.match("GREATER", "GREATER_EQUAL", "LESS", "LESS_EQUAL")) {
      const operator = this.previous().value;
      const right = this.term();
      expr = {
        type: "BinaryExpression",
        operator,
        left: expr,
        right
      };
    }

    return expr;
  }

  private term(): ASTNode {
    let expr = this.factor();

    while (this.match("MINUS", "PLUS")) {
      const operator = this.previous().value;
      const right = this.factor();
      expr = {
        type: "BinaryExpression",
        operator,
        left: expr,
        right
      };
    }

    return expr;
  }

  private factor(): ASTNode {
    let expr = this.unary();

    while (this.match("SLASH", "STAR")) {
      const operator = this.previous().value;
      const right = this.unary();
      expr = {
        type: "BinaryExpression",
        operator,
        left: expr,
        right
      };
    }

    return expr;
  }

  private unary(): ASTNode {
    if (this.match("BANG", "MINUS")) {
      const operator = this.previous().value;
      const right = this.unary();
      return {
        type: "UnaryExpression",
        operator,
        argument: right
      };
    }

    return this.call();
  }

  private call(): ASTNode {
    let expr = this.primary();

    while (true) {
      if (this.match("LEFT_PAREN")) {
        expr = this.finishCall(expr);
      } else if (this.match("DOT")) {
        const name = this.consume("IDENTIFIER", "Expect property name after '.'.");
        expr = {
          type: "MemberExpression",
          object: expr,
          property: {
            type: "Identifier",
            name: name.value
          }
        };
      } else {
        break;
      }
    }

    return expr;
  }

  private finishCall(callee: ASTNode): ASTNode {
    const args: ASTNode[] = [];

    if (!this.check("RIGHT_PAREN")) {
      do {
        if (args.length >= 255) {
          this.error(this.peek(), "Cannot have more than 255 arguments.");
        }
        args.push(this.expression());
      } while (this.match("COMMA"));
    }

    const paren = this.consume("RIGHT_PAREN", "Expect ')' after arguments.");

    return {
      type: "CallExpression",
      callee,
      arguments: args
    };
  }

  private primary(): ASTNode {
    if (this.match("FALSE")) return { type: "Literal", value: false };
    if (this.match("TRUE")) return { type: "Literal", value: true };
    if (this.match("NULL")) return { type: "Literal", value: null };

    if (this.match("NUMBER")) {
      return {
        type: "Literal",
        value: parseFloat(this.previous().value)
      };
    }

    if (this.match("STRING")) {
      return {
        type: "Literal",
        value: this.previous().value
      };
    }

    if (this.match("IDENTIFIER")) {
      return {
        type: "Identifier",
        name: this.previous().value
      };
    }

    if (this.match("LEFT_PAREN")) {
      const expr = this.expression();
      this.consume("RIGHT_PAREN", "Expect ')' after expression.");
      return {
        type: "GroupExpression",
        expression: expr
      };
    }

    throw this.error(this.peek(), "Expect expression.");
  }

  private match(...types: string[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }

    return false;
  }

  private check(type: string): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === "EOF";
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private consume(type: string, message: string): Token {
    if (this.check(type)) return this.advance();
    throw this.error(this.peek(), message);
  }

  private error(token: Token, message: string): SyntaxError {
    return new SyntaxError(message, token);
  }

  private synchronize(): void {
    this.advance();

    while (!this.isAtEnd()) {
      if (this.previous().type === "SEMICOLON") return;

      switch (this.peek().type) {
        case "CLASS":
        case "FUNCTION":
        case "VAR":
        case "FOR":
        case "IF":
        case "WHILE":
        case "RETURN":
          return;
      }

      this.advance();
    }
  }
}