import { ASTNode } from './Parser';

export class SemanticError extends Error {
  node: ASTNode;

  constructor(message: string, node: ASTNode) {
    super(message);
    this.name = "SemanticError";
    this.node = node;
  }
}

interface SymbolTable {
  [key: string]: {
    type: string;
    initialized: boolean;
    used: boolean;
  };
}

export class SemanticAnalyzer {
  private scopes: SymbolTable[] = [];
  private currentScope: SymbolTable = {};
  private errors: SemanticError[] = [];

  constructor() {
    this.enterScope();
  }

  analyze(ast: ASTNode): SemanticError[] {
    this.errors = [];
    this.visit(ast);
    return this.errors;
  }

  private visit(node: ASTNode): void {
    switch (node.type) {
      case "Program":
        this.visitProgram(node);
        break;
      case "VariableDeclaration":
        this.visitVariableDeclaration(node);
        break;
      case "FunctionDeclaration":
        this.visitFunctionDeclaration(node);
        break;
      case "BlockStatement":
        this.visitBlockStatement(node);
        break;
      case "ExpressionStatement":
        this.visitExpressionStatement(node);
        break;
      case "IfStatement":
        this.visitIfStatement(node);
        break;
      case "WhileStatement":
        this.visitWhileStatement(node);
        break;
      case "ForStatement":
        this.visitForStatement(node);
        break;
      case "ReturnStatement":
        this.visitReturnStatement(node);
        break;
      case "BinaryExpression":
        this.visitBinaryExpression(node);
        break;
      case "UnaryExpression":
        this.visitUnaryExpression(node);
        break;
      case "LogicalExpression":
        this.visitLogicalExpression(node);
        break;
      case "AssignmentExpression":
        this.visitAssignmentExpression(node);
        break;
      case "CallExpression":
        this.visitCallExpression(node);
        break;
      case "MemberExpression":
        this.visitMemberExpression(node);
        break;
      case "Identifier":
        this.visitIdentifier(node);
        break;
      case "Literal":
        // No semantic checks needed for literals
        break;
      case "GroupExpression":
        this.visit(node.expression);
        break;
      default:
        console.warn(`Unknown node type: ${node.type}`);
    }
  }

  private visitProgram(node: ASTNode): void {
    for (const statement of node.body) {
      this.visit(statement);
    }
  }

  private visitVariableDeclaration(node: ASTNode): void {
    if (this.currentScope[node.name]) {
      this.errors.push(new SemanticError(`Variable '${node.name}' already declared in this scope`, node));
    } else {
      this.currentScope[node.name] = {
        type: "variable",
        initialized: node.initializer !== null,
        used: false
      };
    }

    if (node.initializer) {
      this.visit(node.initializer);
    }
  }

  private visitFunctionDeclaration(node: ASTNode): void {
    if (this.currentScope[node.name]) {
      this.errors.push(new SemanticError(`Function '${node.name}' already declared in this scope`, node));
    } else {
      this.currentScope[node.name] = {
        type: "function",
        initialized: true,
        used: false
      };
    }

    this.enterScope();

    // Add parameters to the new scope
    for (const param of node.params) {
      this.currentScope[param] = {
        type: "parameter",
        initialized: true,
        used: false
      };
    }

    this.visit(node.body);

    // Check for unused parameters
    for (const [name, info] of Object.entries(this.currentScope)) {
      if (info.type === "parameter" && !info.used) {
        this.errors.push(new SemanticError(`Parameter '${name}' is never used`, node));
      }
    }

    this.exitScope();
  }

  private visitBlockStatement(node: ASTNode): void {
    this.enterScope();
    for (const statement of node.body) {
      this.visit(statement);
    }
    this.exitScope();
  }

  private visitExpressionStatement(node: ASTNode): void {
    this.visit(node.expression);
  }

  private visitIfStatement(node: ASTNode): void {
    this.visit(node.condition);
    this.visit(node.thenBranch);
    if (node.elseBranch) {
      this.visit(node.elseBranch);
    }
  }

  private visitWhileStatement(node: ASTNode): void {
    this.visit(node.condition);
    this.visit(node.body);
  }

  private visitForStatement(node: ASTNode): void {
    this.enterScope();
    
    if (node.initializer) {
      this.visit(node.initializer);
    }
    
    if (node.condition) {
      this.visit(node.condition);
    }
    
    if (node.increment) {
      this.visit(node.increment);
    }
    
    this.visit(node.body);
    
    this.exitScope();
  }

  private visitReturnStatement(node: ASTNode): void {
    if (node.value) {
      this.visit(node.value);
    }
  }

  private visitBinaryExpression(node: ASTNode): void {
    this.visit(node.left);
    this.visit(node.right);
  }

  private visitUnaryExpression(node: ASTNode): void {
    this.visit(node.argument);
  }

  private visitLogicalExpression(node: ASTNode): void {
    this.visit(node.left);
    this.visit(node.right);
  }

  private visitAssignmentExpression(node: ASTNode): void {
    if (node.left.type === "Identifier") {
      const name = node.left.name;
      const variable = this.lookupVariable(name);
      
      if (!variable) {
        this.errors.push(new SemanticError(`Variable '${name}' used before declaration`, node));
      } else {
        variable.initialized = true;
      }
    } else {
      this.visit(node.left);
    }
    
    this.visit(node.right);
  }

  private visitCallExpression(node: ASTNode): void {
    this.visit(node.callee);
    
    if (node.callee.type === "Identifier") {
      const name = node.callee.name;
      const func = this.lookupVariable(name);
      
      if (!func) {
        this.errors.push(new SemanticError(`Function '${name}' called before declaration`, node));
      } else if (func.type !== "function") {
        this.errors.push(new SemanticError(`'${name}' is not a function`, node));
      } else {
        func.used = true;
      }
    }
    
    for (const arg of node.arguments) {
      this.visit(arg);
    }
  }

  private visitMemberExpression(node: ASTNode): void {
    this.visit(node.object);
    // We don't visit the property because it's just a name, not a computed expression
  }

  private visitIdentifier(node: ASTNode): void {
    const name = node.name;
    const variable = this.lookupVariable(name);
    
    if (!variable) {
      this.errors.push(new SemanticError(`Variable '${name}' used before declaration`, node));
    } else {
      variable.used = true;
      
      if (!variable.initialized) {
        this.errors.push(new SemanticError(`Variable '${name}' used before initialization`, node));
      }
    }
  }

  private enterScope(): void {
    this.scopes.push(this.currentScope);
    this.currentScope = {};
  }

  private exitScope(): void {
    // Check for unused variables in the current scope
    for (const [name, info] of Object.entries(this.currentScope)) {
      if (!info.used) {
        this.errors.push(new SemanticError(`Variable '${name}' is declared but never used`, { type: "Identifier", name }));
      }
    }
    
    this.currentScope = this.scopes.pop() || {};
  }

  private lookupVariable(name: string): { type: string; initialized: boolean; used: boolean } | null {
    // Check current scope first
    if (this.currentScope[name]) {
      return this.currentScope[name];
    }
    
    // Then check outer scopes
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      if (this.scopes[i][name]) {
        return this.scopes[i][name];
      }
    }
    
    return null;
  }
}