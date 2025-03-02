import { IRInstruction } from './IRGenerator';

export class CodeGenerationError extends Error {
  instruction: IRInstruction;

  constructor(message: string, instruction: IRInstruction) {
    super(message);
    this.name = "CodeGenerationError";
    this.instruction = instruction;
  }
}

export class CodeGenerator {
  private output: string[] = [];
  private variables = new Map<string, number>();
  private indentLevel = 0;

  generate(ir: IRInstruction[]): string {
    this.output = [];
    this.variables.clear();
    this.indentLevel = 0;
    
    this.emitLine("// Generated JavaScript code");
    this.emitLine("// This is a simplified target language");
    this.emitLine("");
    
    // Add runtime functions
    this.emitLine("// Runtime functions");
    this.emitLine("function printValue(value) {");
    this.emitLine("  console.log(value);", 1);
    this.emitLine("}");
    this.emitLine("");
    
    // Process each instruction
    for (let i = 0; i < ir.length; i++) {
      const instr = ir[i];
      this.processInstruction(instr);
    }
    
    return this.output.join("\n");
  }

  private processInstruction(instr: IRInstruction): void {
    switch (instr.op) {
      case "FUNCTION_START":
        this.emitLine(`function ${instr.args[0]}(${instr.args[1].join(", ")}) {`);
        this.indentLevel++;
        break;
        
      case "FUNCTION_END":
        this.indentLevel--;
        this.emitLine("}");
        this.emitLine("");
        break;
        
      case "BLOCK_START":
        this.emitLine("{");
        this.indentLevel++;
        break;
        
      case "BLOCK_END":
        this.indentLevel--;
        this.emitLine("}");
        break;
        
      case "DECLARE":
        this.emitLine(`let ${instr.args[0]};`);
        break;
        
      case "CONST":
        this.emitLine(`let ${instr.args[1]} = ${this.formatValue(instr.args[0])};`);
        break;
        
      case "LOAD":
        this.emitLine(`let ${instr.args[1]} = ${instr.args[0]};`);
        break;
        
      case "STORE":
        this.emitLine(`${instr.args[1]} = ${instr.args[0]};`);
        break;
        
      case "LOAD_PROP":
        this.emitLine(`let ${instr.args[2]} = ${instr.args[0]}.${instr.args[1]};`);
        break;
        
      case "STORE_PROP":
        this.emitLine(`${instr.args[0]}.${instr.args[1]} = ${instr.args[2]};`);
        break;
        
      case "ADD":
        this.emitLine(`let ${instr.args[2]} = ${instr.args[0]} + ${instr.args[1]};`);
        break;
        
      case "SUB":
        this.emitLine(`let ${instr.args[2]} = ${instr.args[0]} - ${instr.args[1]};`);
        break;
        
      case "MUL":
        this.emitLine(`let ${instr.args[2]} = ${instr.args[0]} * ${instr.args[1]};`);
        break;
        
      case "DIV":
        this.emitLine(`let ${instr.args[2]} = ${instr.args[0]} / ${instr.args[1]};`);
        break;
        
      case "NEG":
        this.emitLine(`let ${instr.args[1]} = -${instr.args[0]};`);
        break;
        
      case "NOT":
        this.emitLine(`let ${instr.args[1]} = !${instr.args[0]};`);
        break;
        
      case "EQ":
        this.emitLine(`let ${instr.args[2]} = ${instr.args[0]} === ${instr.args[1]};`);
        break;
        
      case "NEQ":
        this.emitLine(`let ${instr.args[2]} = ${instr.args[0]} !== ${instr.args[1]};`);
        break;
        
      case "LT":
        this.emitLine(`let ${instr.args[2]} = ${instr.args[0]} < ${instr.args[1]};`);
        break;
        
      case "LTE":
        this.emitLine(`let ${instr.args[2]} = ${instr.args[0]} <= ${instr.args[1]};`);
        break;
        
      case "GT":
        this.emitLine(`let ${instr.args[2]} = ${instr.args[0]} > ${instr.args[1]};`);
        break;
        
      case "GTE":
        this.emitLine(`let ${instr.args[2]} = ${instr.args[0]} >= ${instr.args[1]};`);
        break;
        
      case "COPY":
        this.emitLine(`let ${instr.args[1]} = ${instr.args[0]};`);
        break;
        
      case "LABEL":
        this.emitLine(`${instr.args[0]}:`);
        break;
        
      case "JUMP":
        this.emitLine(`goto ${instr.args[0]};`);
        break;
        
      case "JUMP_IF_TRUE":
        this.emitLine(`if (${instr.args[0]}) goto ${instr.args[1]};`);
        break;
        
      case "JUMP_IF_FALSE":
        this.emitLine(`if (!${instr.args[0]}) goto ${instr.args[1]};`);
        break;
        
      case "CALL":
        if (instr.args[2]) {
          this.emitLine(`let ${instr.args[2]} = ${instr.args[0]}(${instr.args[1].join(", ")});`);
        } else {
          this.emitLine(`${instr.args[0]}(${instr.args[1].join(", ")});`);
        }
        break;
        
      case "CALL_INDIRECT":
        if (instr.args[2]) {
          this.emitLine(`let ${instr.args[2]} = ${instr.args[0]}(${instr.args[1].join(", ")});`);
        } else {
          this.emitLine(`${instr.args[0]}(${instr.args[1].join(", ")});`);
        }
        break;
        
      case "RETURN":
        if (instr.args.length > 0) {
          this.emitLine(`return ${instr.args[0]};`);
        } else {
          this.emitLine("return;");
        }
        break;
        
      default:
        throw new CodeGenerationError(`Unknown instruction: ${instr.op}`, instr);
    }
  }

  private emitLine(line: string, extraIndent: number = 0): void {
    const indent = "  ".repeat(this.indentLevel + extraIndent);
    this.output.push(`${indent}${line}`);
  }

  private formatValue(value: any): string {
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    if (typeof value === "string") return `"${value}"`;
    return String(value);
  }
}