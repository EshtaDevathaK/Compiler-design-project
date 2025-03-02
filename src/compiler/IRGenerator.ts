import { ASTNode } from './Parser';

export interface IRInstruction {
  op: string;
  args: any[];
}

export class IRGenerationError extends Error {
  node: ASTNode;

  constructor(message: string, node: ASTNode) {
    super(message);
    this.name = "IRGenerationError";
    this.node = node;
  }
}

export class IRGenerator {
  private instructions: IRInstruction[] = [];
  private tempCounter: number = 0;
  private labelCounter: number = 0;

  generate(ast: ASTNode): IRInstruction[] {
    this.instructions = [];
    this.tempCounter = 0;
    this.labelCounter = 0;
    
    this.generateIR(ast);
    
    return this.instructions;
  }

  private generateIR(node: ASTNode): string {
    switch (node.type) {
      case "Program":
        return this.generateProgram(node);
      case "VariableDeclaration":
        return this.generateVariableDeclaration(node);
      case "FunctionDeclaration":
        return this.generateFunctionDeclaration(node);
      case "BlockStatement":
        return this.generateBlockStatement(node);
      case "ExpressionStatement":
        return this.generateExpressionStatement(node);
      case "IfStatement":
        return this.generateIfStatement(node);
      case "WhileStatement":
        return this.generateWhileStatement(node);
      case "ForStatement":
        return this.generateForStatement(node);
      case "ReturnStatement":
        return this.generateReturnStatement(node);
      case "BinaryExpression":
        return this.generateBinaryExpression(node);
      case "UnaryExpression":
        return this.generateUnaryExpression(node);
      case "LogicalExpression":
        return this.generateLogicalExpression(node);
      case "AssignmentExpression":
        return this.generateAssignmentExpression(node);
      case "CallExpression":
        return this.generateCallExpression(node);
      case "MemberExpression":
        return this.generateMemberExpression(node);
      case "Identifier":
        return this.generateIdentifier(node);
      case "Literal":
        return this.generateLiteral(node);
      case "GroupExpression":
        return this.generateIR(node.expression);
      default:
        throw new IRGenerationError(`Unknown node type: ${node.type}`, node);
    }
  }

  private generateProgram(node: ASTNode): string {
    for (const statement of node.body) {
      this.generateIR(statement);
    }
    return "";
  }

  private generateVariableDeclaration(node: ASTNode): string {
    const varName = node.name;
    
    if (node.initializer) {
      const valueTemp = this.generateIR(node.initializer);
      this.emit("STORE", [valueTemp, varName]);
    } else {
      this.emit("DECLARE", [varName]);
    }
    
    return varName;
  }

  private generateFunctionDeclaration(node: ASTNode): string {
    const funcName = node.name;
    
    this.emit("FUNCTION_START", [funcName, node.params]);
    this.generateIR(node.body);
    this.emit("FUNCTION_END", [funcName]);
    
    return funcName;
  }

  private generateBlockStatement(node: ASTNode): string {
    this.emit("BLOCK_START", []);
    
    for (const statement of node.body) {
      this.generateIR(statement);
    }
    
    this.emit("BLOCK_END", []);
    return "";
  }

  private generateExpressionStatement(node: ASTNode): string {
    // We still need to generate IR for the expression, but we can ignore the result
    this.generateIR(node.expression);
    return "";
  }

  private generateIfStatement(node: ASTNode): string {
    const conditionTemp = this.generateIR(node.condition);
    const elseLabel = this.createLabel("else");
    const endLabel = this.createLabel("endif");
    
    this.emit("JUMP_IF_FALSE", [conditionTemp, elseLabel]);
    
    this.generateIR(node.thenBranch);
    this.emit("JUMP", [endLabel]);
    
    this.emit("LABEL", [elseLabel]);
    
    if (node.elseBranch) {
      this.generateIR(node.elseBranch);
    }
    
    this.emit("LABEL", [endLabel]);
    
    return "";
  }

  private generateWhileStatement(node: ASTNode): string {
    const startLabel = this.createLabel("while");
    const endLabel = this.createLabel("endwhile");
    
    this.emit("LABEL", [startLabel]);
    
    const conditionTemp = this.generateIR(node.condition);
    this.emit("JUMP_IF_FALSE", [conditionTemp, endLabel]);
    
    this.generateIR(node.body);
    this.emit("JUMP", [startLabel]);
    
    this.emit("LABEL", [endLabel]);
    
    return "";
  }

  private generateForStatement(node: ASTNode): string {
    const startLabel = this.createLabel("for");
    const updateLabel = this.createLabel("forupdate");
    const endLabel = this.createLabel("endfor");
    
    // Initializer
    if (node.initializer) {
      this.generateIR(node.initializer);
    }
    
    this.emit("LABEL", [startLabel]);
    
    // Condition
    if (node.condition) {
      const conditionTemp = this.generateIR(node.condition);
      this.emit("JUMP_IF_FALSE", [conditionTemp, endLabel]);
    }
    
    // Body
    this.generateIR(node.body);
    
    this.emit("LABEL", [updateLabel]);
    
    // Increment
    if (node.increment) {
      this.generateIR(node.increment);
    }
    
    this.emit("JUMP", [startLabel]);
    this.emit("LABEL", [endLabel]);
    
    return "";
  }

  private generateReturnStatement(node: ASTNode): string {
    if (node.value) {
      const valueTemp = this.generateIR(node.value);
      this.emit("RETURN", [valueTemp]);
    } else {
      this.emit("RETURN", []);
    }
    
    return "";
  }

  private generateBinaryExpression(node: ASTNode): string {
    const leftTemp = this.generateIR(node.left);
    const rightTemp = this.generateIR(node.right);
    const resultTemp = this.createTemp();
    
    let operation;
    switch (node.operator) {
      case "+": operation = "ADD"; break;
      case "-": operation = "SUB"; break;
      case "*": operation = "MUL"; break;
      case "/": operation = "DIV"; break;
      case "==": operation = "EQ"; break;
      case "!=": operation = "NEQ"; break;
      case "<": operation = "LT"; break;
      case "<=": operation = "LTE"; break;
      case ">": operation = "GT"; break;
      case ">=": operation = "GTE"; break;
      default:
        throw new IRGenerationError(`Unknown binary operator: ${node.operator}`, node);
    }
    
    this.emit(operation, [leftTemp, rightTemp, resultTemp]);
    
    return resultTemp;
  }

  private generateUnaryExpression(node: ASTNode): string {
    const argTemp = this.generateIR(node.argument);
    const resultTemp = this.createTemp();
    
    switch (node.operator) {
      case "-":
        this.emit("NEG", [argTemp, resultTemp]);
        break;
      case "!":
        this.emit("NOT", [argTemp, resultTemp]);
        break;
      default:
        throw new IRGenerationError(`Unknown unary operator: ${node.operator}`, node);
    }
    
    return resultTemp;
  }

  private generateLogicalExpression(node: ASTNode): string {
    const resultTemp = this.createTemp();
    
    if (node.operator === "&&") {
      const leftTemp = this.generateIR(node.left);
      const skipLabel = this.createLabel("and_skip");
      
      this.emit("COPY", [leftTemp, resultTemp]);
      this.emit("JUMP_IF_FALSE", [leftTemp, skipLabel]);
      
      const rightTemp = this.generateIR(node.right);
      this.emit("COPY", [rightTemp, resultTemp]);
      
      this.emit("LABEL", [skipLabel]);
      
    } else if (node.operator === "||") {
      const leftTemp = this.generateIR(node.left);
      const skipLabel = this.createLabel("or_skip");
      
      this.emit("COPY", [leftTemp, resultTemp]);
      this.emit("JUMP_IF_TRUE", [leftTemp, skipLabel]);
      
      const rightTemp = this.generateIR(node.right);
      this.emit("COPY", [rightTemp, resultTemp]);
      
      this.emit("LABEL", [skipLabel]);
      
    } else {
      throw new IRGenerationError(`Unknown logical operator: ${node.operator}`, node);
    }
    
    return resultTemp;
  }

  private generateAssignmentExpression(node: ASTNode): string {
    const rightTemp = this.generateIR(node.right);
    
    if (node.left.type === "Identifier") {
      const varName = node.left.name;
      this.emit("STORE", [rightTemp, varName]);
      return rightTemp;
    } else if (node.left.type === "MemberExpression") {
      const objectTemp = this.generateIR(node.left.object);
      const property = node.left.property.name;
      this.emit("STORE_PROP", [objectTemp, property, rightTemp]);
      return rightTemp;
    } else {
      throw new IRGenerationError("Invalid assignment target", node);
    }
  }

  private generateCallExpression(node: ASTNode): string {
    const args: string[] = [];
    
    for (const arg of node.arguments) {
      const argTemp = this.generateIR(arg);
      args.push(argTemp);
    }
    
    const resultTemp = this.createTemp();
    
    if (node.callee.type === "Identifier") {
      const funcName = node.callee.name;
      this.emit("CALL", [funcName, args, resultTemp]);
    } else {
      const calleeTemp = this.generateIR(node.callee);
      this.emit("CALL_INDIRECT", [calleeTemp, args, resultTemp]);
    }
    
    return resultTemp;
  }

  private generateMemberExpression(node: ASTNode): string {
    const objectTemp = this.generateIR(node.object);
    const property = node.property.name;
    const resultTemp = this.createTemp();
    
    this.emit("LOAD_PROP", [objectTemp, property, resultTemp]);
    
    return resultTemp;
  }

  private generateIdentifier(node: ASTNode): string {
    const resultTemp = this.createTemp();
    this.emit("LOAD", [node.name, resultTemp]);
    return resultTemp;
  }

  private generateLiteral(node: ASTNode): string {
    const resultTemp = this.createTemp();
    this.emit("CONST", [node.value, resultTemp]);
    return resultTemp;
  }

  private emit(op: string, args: any[]): void {
    this.instructions.push({ op, args });
  }

  private createTemp(): string {
    return `t${this.tempCounter++}`;
  }

  private createLabel(prefix: string): string {
    return `${prefix}_${this.labelCounter++}`;
  }
}